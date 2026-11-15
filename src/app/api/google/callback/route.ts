import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/session";
import { oauthClientFromEnv } from "@/lib/drive/client";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/**
 * Google sends the super admin back here with a code. We swap it for a refresh token and show it ONCE, with the
 * two commands that store it. It is never written to the database or logged.
 */
export async function GET(req: NextRequest) {
  const v = await getViewer();
  if (v.role !== "super_admin") return new NextResponse("Super admins only", { status: 403 });
  const client = oauthClientFromEnv();
  const code = req.nextUrl.searchParams.get("code"); const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("greene_google_state")?.value;
  if (!client || !code || !state || state !== expected) return new NextResponse("The sign-in did not complete. Go back to Drive Import and press Connect again.", { status: 400 });
  const redirect = new URL("/api/google/callback", req.nextUrl.origin).toString();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: client.client_id, client_secret: client.client_secret, redirect_uri: redirect, grant_type: "authorization_code" }),
  });
  const data = (await res.json()) as { refresh_token?: string; access_token?: string; error_description?: string };
  if (!res.ok || !data.refresh_token) return new NextResponse(`Google did not return a refresh token${data.error_description ? `: ${data.error_description}` : ""}. Remove the app under myaccount.google.com → Security → Third-party access, then press Connect again.`, { status: 400 });
  let account = "";
  try {
    const me = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", { headers: { authorization: `Bearer ${data.access_token}` } });
    account = ((await me.json()) as { user?: { emailAddress?: string } }).user?.emailAddress ?? "";
  } catch { /* the address is only a label */ }
  const token = data.refresh_token;
  const html = `<!doctype html><meta charset="utf-8"><title>Google Drive connected</title>
<body style="font:16px/1.5 system-ui;max-width:720px;margin:40px auto;padding:0 20px;color:#2b2620;background:#f4eee2">
<h1 style="font-family:Georgia,serif">Google Drive connected${account ? ` as ${esc(account)}` : ""}</h1>
<p>One last step: store this token where the app runs. It is shown once and is a credential, like a password. Do not paste it into chat or Drive.</p>
<p><strong>On Netlify</strong> (the live site) run these in a terminal inside the project folder, then trigger a deploy:</p>
<pre style="white-space:pre-wrap;word-break:break-all;background:#fffdf8;border:1px solid #d9d0bd;border-radius:10px;padding:12px">netlify env:set GOOGLE_OAUTH_REFRESH_TOKEN "${esc(token)}"
netlify env:set GOOGLE_OAUTH_ACCOUNT "${esc(account || "karmel.larson@gmail.com")}"</pre>
<p><strong>For the local preview</strong> add to <code>.env.local</code>:</p>
<pre style="white-space:pre-wrap;word-break:break-all;background:#fffdf8;border:1px solid #d9d0bd;border-radius:10px;padding:12px">GOOGLE_OAUTH_REFRESH_TOKEN=${esc(token)}
GOOGLE_OAUTH_ACCOUNT=${esc(account || "karmel.larson@gmail.com")}</pre>
<p>Then restart, open <a href="/admin/import">Drive Import</a> and press “Check access now”. Every folder shared with this Google account is readable; nothing else needs sharing.</p>
</body>`;
  const out = new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  out.cookies.set("greene_google_state", "", { maxAge: 0, path: "/api/google" });
  return out;
}
