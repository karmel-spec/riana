"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";

const Email = z.string().trim().email().max(200);

export async function sendMagicLink(_prev: { error: string }, form: FormData): Promise<{ error: string }> {
  if (isDemo()) return { error: "Demo mode has no sign-in." };
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Please enter a valid email address." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback` },
  });
  // Don't reveal whether the address is on the list.
  if (error && !/signups not allowed|not found/i.test(error.message)) {
    console.error("[auth] magic link:", error.message);
    return { error: "We couldn’t send the link right now. Please try again in a minute." };
  }
  redirect("/login?sent=1");
}
