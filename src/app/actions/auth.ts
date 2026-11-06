"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";

const Email = z.string().trim().email().max(200);
const Password = z.string().min(10, "Use at least 10 characters.").max(200);

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

/** Email + password. The password is set by a super admin (People & Access) or by the person on /account/password. */
export async function signInWithPassword(_prev: { error: string }, form: FormData): Promise<{ error: string }> {
  if (isDemo()) return { error: "Demo mode has no sign-in." };
  const email = Email.safeParse(form.get("email"));
  const password = z.string().min(1).safeParse(form.get("password"));
  if (!email.success || !password.success) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data.toLowerCase(), password: password.data });
  if (error) {
    // Same message for wrong password and unknown email: don't reveal who's on the list.
    return { error: "That email and password don’t match. Ask Karmel or Heather if you need a new password." };
  }
  await supabase.rpc("log_view", { p_section: null, p_entity: "sign_in:password" }).then(() => {}, () => {});
  redirect("/");
}

export async function changeOwnPassword(_prev: { ok: boolean; message: string } | null, form: FormData): Promise<{ ok: boolean; message: string }> {
  if (isDemo()) return { ok: false, message: "Demo mode has no passwords." };
  const parsed = z.object({ password: Password, confirm: z.string() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (parsed.data.password !== parsed.data.confirm) return { ok: false, message: "The two passwords don’t match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: /weak|pwned|common/i.test(error.message) ? "That password is too easy to guess. Try a longer phrase." : "Could not change the password." };
  await supabase.rpc("log_view", { p_section: null, p_entity: "password_changed" }).then(() => {}, () => {});
  return { ok: true, message: "Password changed. Use it next time you sign in." };
}
