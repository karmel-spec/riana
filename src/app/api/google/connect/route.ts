import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getViewer } from "@/lib/session";
import { oauthClientFromEnv, SCOPE } from "@/lib/drive/client";

/** Super admin presses "Connect Google Drive": send them to Google's consent screen for read-only Drive access. */
export async function GET(req: NextRequest) {
  const v = await getViewer();
  if (v.role !== "super_admin") return new NextResponse("Super admins only", { status: 403 });
  const client = oauthClientFromEnv();
  if (!client) return new NextResponse("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are not set.", { status: 500 });
  const state = randomBytes(16).toString("hex");
  const redirect = new URL("/api/google/callback", req.nextUrl.origin).toString();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for (const [k, val] of Object.entries({ client_id: client.client_id, redirect_uri: redirect, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state })) url.searchParams.set(k, val);
  const res = NextResponse.redirect(url);
  res.cookies.set("greene_google_state", state, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 600, path: "/api/google" });
  return res;
}
