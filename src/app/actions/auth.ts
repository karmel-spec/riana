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
  const email = parsed.data.toLowerCase();

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();

  // Only invited addresses may create an account. The check returns true/false
  // and never reveals the list; a stranger simply gets the same "check your
  // email" screen and no email.
  const { data: invited } = await supabase.rpc("is_invited", { p_email: email });
  if (invited) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      console.error("[auth] magic link:", error.message);
      return { error: "We couldn’t send the link right now. Please try again in a minute." };
    }
  }
  redirect("/login?sent=1");
}
