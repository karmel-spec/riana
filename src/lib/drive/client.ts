import "server-only";
import { createSign } from "node:crypto";

/**
 * Minimal Google Drive v3 client for a SERVICE ACCOUNT with the read-only
 * scope. No SDK: a signed JWT exchanged for a short-lived access token, then
 * plain REST calls. The service account sees only folders explicitly shared
 * with it (Viewer), never anyone's personal Drive.
 */
import { FOLDER_MIME, type DriveClient, type DriveFile } from "./types.ts";
export type { DriveClient, DriveFile } from "./types.ts";
export { FOLDER_MIME } from "./types.ts";

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type SA = { client_email: string; private_key: string; token_uri?: string };

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

export function serviceAccountEmail(): string | null {
  return serviceAccountFromEnv()?.client_email ?? null;
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(sa: SA): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri ?? "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

const FIELDS = "id,name,mimeType,size,md5Checksum,modifiedTime,webViewLink,parents";

export function realDriveClient(sa: SA): DriveClient {
  const api = async (path: string, params: Record<string, string>) => {
    const token = await accessToken(sa);
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
  });
  return {
    async probeFolder(folderId) {
      try {
        const f = await api(`files/${folderId}`, { fields: "id,name,mimeType" });
        if (f.mimeType !== FOLDER_MIME) return { ok: false, error: "Not a folder" };
        return { ok: true, name: f.name };
      } catch (e) {
        const msg = (e as Error).message;
        return { ok: false, error: /404/.test(msg) ? "Not shared with the app's service account (or wrong link)" : msg };
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
      const token = await accessToken(sa);
      return fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
        headers: { authorization: `Bearer ${token}`, ...(range ? { range } : {}) },
      });
    },
  };
}

/** Real client when a service account is configured, else null. */
export function driveClient(): DriveClient | null {
  const sa = serviceAccountFromEnv();
  return sa ? realDriveClient(sa) : null;
}
