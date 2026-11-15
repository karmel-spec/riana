import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared pieces of the agent-facing Ask Riana routes. Same rules as
 * /api/riana/inbound and /api/riana/export: the bearer key is verified in
 * Postgres by a security-definer function, and the route only ever holds the
 * publishable Supabase key.
 */

export const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** The bearer key, or null when it is missing or too short to be one. */
export function bearer(req: NextRequest): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  return m && m[1].length >= 32 ? m[1] : null;
}

export function anonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Turns an RPC error into the reply the other Riana routes give. Unknown errors are logged by code, never echoed. */
export function rpcError(tag: string, error: { code?: string | null; message: string }, fallback: string) {
  // 28000 = bad key; 22023 = a validation rule the database applies on top of ours.
  if (error.code === "28000") return json(401, { error: "Invalid or revoked key." });
  if (error.code === "22023") return json(400, { error: error.message });
  // No code + "Invalid API key": NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY does not belong to NEXT_PUBLIC_SUPABASE_URL.
  if (!error.code && /invalid api key/i.test(error.message)) return json(503, { error: "The Supabase publishable key does not match the project URL. Check the site's environment variables." });
  // PGRST202: PostgREST cannot find the function, i.e. the Ask Riana migration is not applied yet.
  if (error.code === "PGRST202") return json(503, { error: "The database is missing the Riana migrations. Run scripts/apply-migrations.sh against the project." });
  console.error(`[${tag}]`, error.code ?? "no-code");
  return json(500, { error: fallback, code: error.code ?? null });
}
