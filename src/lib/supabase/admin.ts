import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses row-level security, so it is used ONLY for
 * Supabase Auth admin calls (create a user with a password, set a password)
 * and only after the caller has been verified as a super admin. The key is
 * a server-only env var; it must never be prefixed NEXT_PUBLIC_.
 */
export function adminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
