import "server-only";

/**
 * Demo mode serves the FAKE fixtures with a role switcher and no login.
 * It only turns on when explicitly requested AND no Supabase project is
 * configured, so a real deployment can never fall into it by accident.
 */
export function isDemo(): boolean {
  return process.env.GREENE_DEMO === "1" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or run with GREENE_DEMO=1 for fake data.",
    );
  }
  return { url, key };
}
