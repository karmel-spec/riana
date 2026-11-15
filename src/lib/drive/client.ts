import "server-only";
import { createSign } from "node:crypto";

/**
 * Minimal Google Drive v3 client. Two ways to sign in, both read-only:
 *  - a SERVICE ACCOUNT (GOOGLE_SERVICE_ACCOUNT_JSON): a robot identity that sees only folders shared with it;
 *  - a GOOGLE SIGN-IN (GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN): the app reads Drive as the person who
 *    pressed "Connect Google Drive" once, so it sees whatever that person can see. Used when the Google Cloud
 *    project forbids service-account keys.
 * No SDK: a token from Google, then plain REST calls.
 */
import { FOLDER_MIME, GDOC_MIME, type DriveClient, type DriveFile } from "./types.ts";
export type { DriveClient, DriveFile } from "./types.ts";
export { FOLDER_MIME } from "./types.ts";

export const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type SA = { client_email: string; private_key: string; token_uri?: string };
type OAuth = { client_id: string; client_secret: string; refresh_token: string; account: string };
export type Creds = { kind: "service_account"; sa: SA } | { kind: "oauth"; oauth: OAuth };

export function serviceAccountFromEnv(): SA | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as SA;
    if (!sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

/** The OAuth client (id + secret) is enough to start the connect flow; the refresh token completes it. */
export function oauthClientFromEnv(): { client_id: string; client_secret: string } | null {
  const client_id = process.env.GOOGLE_OAUTH_CLIENT_ID, client_secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return client_id && client_secret ? { client_id, client_secret } : null;
}

export function credsFromEnv(): Creds | null {
  const sa = serviceAccountFromEnv();
  if (sa) return { kind: "service_account", sa };
  const client = oauthClientFromEnv();
  const refresh_token = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (client && refresh_token) return { kind: "oauth", oauth: { ...client, refresh_token, account: process.env.GOOGLE_OAUTH_ACCOUNT ?? "the connected Google account" } };
  return null;
}

/** The identity the app reads Drive as, for the import page. */
export function serviceAccountEmail(): string | null {
  const c = credsFromEnv();
  return c ? (c.kind === "service_account" ? c.sa.client_email : c.oauth.account) : null;
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(c: Creds): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  let body: URLSearchParams; let tokenUri = "https://oauth2.googleapis.com/token";
  if (c.kind === "oauth") {
    body = new URLSearchParams({ grant_type: "refresh_token", client_id: c.oauth.client_id, client_secret: c.oauth.client_secret, refresh_token: c.oauth.refresh_token });
  } else {
    const sa = c.sa; tokenUri = sa.token_uri ?? tokenUri;
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
    body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` });
  }
  const res = await fetch(tokenUri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})${c.kind === "oauth" ? ": reconnect Google Drive from the import page" : ""}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

const FIELDS = "id,name,mimeType,size,md5Checksum,modifiedTime,webViewLink,parents,imageMediaMetadata(time)";

export function realDriveClient(creds: Creds): DriveClient {
  const api = async (path: string, params: Record<string, string>) => {
    const token = await accessToken(creds);
    const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("supportsAllDrives", "true");
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Drive ${path}: ${res.status} ${res.statusText}`);
    return res.json();
  };
  const norm = (f: Record<string, unknown>): DriveFile => ({
    id: String(f.id), name: String(f.name), mimeType: String(f.mimeType),
    size: f.size ? Number(f.size) : null, md5Checksum: (f.md5Checksum as string) ?? null,
    modifiedTime: String(f.modifiedTime), webViewLink: (f.webViewLink as string) ?? null,
    parents: (f.parents as string[]) ?? [],
    takenTime: ((f.imageMediaMetadata as { time?: string } | undefined)?.time) ?? null,
  });
  return {
    async probeFolder(folderId) {
      try {
        const f = await api(`files/${folderId}`, { fields: "id,name,mimeType" });
        if (f.mimeType !== FOLDER_MIME) return { ok: false, error: "Not a folder" };
        return { ok: true, name: f.name };
      } catch (e) {
        const msg = (e as Error).message;
        return { ok: false, error: /404/.test(msg) ? "Not shared with the app's Google account (or wrong link)" : msg };
      }
    },
    async list(folderId) {
      const out: DriveFile[] = [];
      let pageToken: string | undefined;
      do {
        const page = await api("files", {
          q: `'${folderId}' in parents and trashed = false`,
          fields: `nextPageToken,files(${FIELDS})`, pageSize: "200", includeItemsFromAllDrives: "true",
          ...(pageToken ? { pageToken } : {}),
        });
        out.push(...(page.files as Record<string, unknown>[]).map(norm));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return out;
    },
    async stream(fileId, range) {
      const token = await accessToken(creds);
      return fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
        headers: { authorization: `Bearer ${token}`, ...(range ? { range } : {}) },
      });
    },
    async getFile(fileId) {
      return norm(await api(`files/${fileId}`, { fields: FIELDS }));
    },
    async exportText(fileId) {
      const token = await accessToken(creds);
      const meta = await api(`files/${fileId}`, { fields: "id,mimeType" });
      const url = meta.mimeType === GDOC_MIME
        ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text%2Fplain`
        : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
      if (meta.mimeType !== GDOC_MIME && !/^text\//.test(String(meta.mimeType))) {
        throw new Error("Only Google Docs and plain-text files can be read as notes");
      }
      const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Drive export: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (text.length > 2_000_000) throw new Error("Document is too large to read (over 2 MB of text)");
      return text;
    },
  };
}

/** Real client when Google credentials are configured, else null. */
export function driveClient(): DriveClient | null {
  const c = credsFromEnv();
  return c ? realDriveClient(c) : null;
}
