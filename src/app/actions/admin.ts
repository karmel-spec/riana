"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SECTIONS } from "@/lib/types";
import { adminAuthClient } from "@/lib/supabase/admin";

const StarterPassword = z.string().min(10, "Starter password: at least 10 characters.").max(200).optional().or(z.literal(""));

type Result = { ok: true } | { ok: false; error: string };

async function admin() {
  const v = await getViewer();
  if (v.role !== "super_admin") throw new Error("Super admins only.");
  if (v.demo) throw new Error("People and access can’t be changed in the sample-data preview.");
  return v;
}

const Role = z.enum(["super_admin", "parent", "family", "posterity", "professional"]);
const Subject = z.enum(["rich", "diana"]).optional().or(z.literal(""));
const Expiry = z.string().optional().or(z.literal(""));

type RoleShape = { app_role: z.infer<typeof Role>; is_subject: "rich" | "diana" | null; access_expires_at: string | null };

function normalizeRole(d: { app_role: z.infer<typeof Role>; is_subject?: string; access_expires_at?: string }): { ok: false; error: string } | { ok: true; value: RoleShape } {
  if (d.app_role === "parent" && !d.is_subject) return { ok: false, error: "A parent must be marked as Rich or Diana." };
  if (d.app_role === "professional" && !d.access_expires_at) return { ok: false, error: "A professional needs an end date." };
  return {
    ok: true,
    value: {
      app_role: d.app_role,
      is_subject: d.app_role === "parent" ? (d.is_subject as "rich" | "diana") : null,
      access_expires_at: d.app_role === "professional" && d.access_expires_at ? new Date(`${d.access_expires_at}T23:59:59`).toISOString() : null,
    },
  };
}

const Invite = z.object({
  email: z.string().trim().email().max(200),
  display_name: z.string().trim().min(1, "Please enter a name.").max(120),
  app_role: Role, is_subject: Subject, access_expires_at: Expiry,
  starter_password: StarterPassword,
});

export async function addInvitation(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await admin();
    const parsed = Invite.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const norm = normalizeRole(parsed.data);
    if (!norm.ok) return norm;
    const supabase = await createClient();
    const { error } = await supabase.from("invitations").insert({
      email: parsed.data.email.toLowerCase(), display_name: parsed.data.display_name, ...norm.value, invited_by: v.id,
    });
    if (error) return { ok: false, error: /duplicate|unique/i.test(error.message) ? "That email is already invited." : "Could not add the invitation." };
    // Optional: create the account right now with a starter password, so no email is needed.
    if (parsed.data.starter_password) {
      const admin = adminAuthClient();
      if (!admin) return { ok: false, error: "Invitation saved, but starter passwords need SUPABASE_SERVICE_ROLE_KEY on the server (see docs/SUPABASE_SETUP.md). They can still sign in by email link." };
      const { error: cErr } = await admin.auth.admin.createUser({ email: parsed.data.email.toLowerCase(), password: parsed.data.starter_password, email_confirm: true });
      if (cErr) return { ok: false, error: `Invitation saved, but the account could not be created: ${cErr.message}` };
    }
    revalidatePath("/admin/people");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeInvitation(id: string): Promise<Result> {
  try {
    await admin();
    const supabase = await createClient();
    const { error } = await supabase.from("invitations").delete().eq("id", id).is("accepted_at", null);
    if (error) return { ok: false, error: "Could not remove." };
    revalidatePath("/admin/people");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const RoleChange = z.object({ id: z.string().uuid(), app_role: Role, is_subject: Subject, access_expires_at: Expiry });

export async function changeRole(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await admin();
    const parsed = RoleChange.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    if (parsed.data.id === v.id && parsed.data.app_role !== "super_admin") return { ok: false, error: "You can’t remove your own admin role. Ask the other admin to do it." };
    const norm = normalizeRole(parsed.data);
    if (!norm.ok) return norm;
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update(norm.value).eq("id", parsed.data.id);
    if (error) return { ok: false, error: "Could not change the role." };
    revalidatePath("/admin/people");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const Grant = z.object({
  user_id: z.string().uuid(),
  section: z.enum(SECTIONS),
  level: z.enum(["read", "write"]),
  expires_at: Expiry,
  reason: z.string().trim().max(300).optional(),
});

export async function addGrant(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await admin();
    const parsed = Grant.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    if (d.section === "admin") return { ok: false, error: "Admin access comes from the Super Admin role, not a grant." };
    const supabase = await createClient();
    const { error } = await supabase.from("user_section_access").upsert({
      user_id: d.user_id, section: d.section, level: d.level, reason: d.reason || null, granted_by: v.id, break_glass: false,
      expires_at: d.expires_at ? new Date(`${d.expires_at}T23:59:59`).toISOString() : null,
    }, { onConflict: "user_id,section,break_glass" });
    if (error) return { ok: false, error: "Could not save the grant." };
    revalidatePath("/admin/people");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeGrant(id: string): Promise<Result> {
  try {
    await admin();
    const supabase = await createClient();
    const { error } = await supabase.from("user_section_access").delete().eq("id", id);
    if (error) return { ok: false, error: "Could not remove." };
    revalidatePath("/admin/people");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Super admin sets (or resets) someone's password. Logged as a permission change. */
export async function setUserPassword(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await admin();
    const parsed = z.object({ id: z.string().uuid(), password: z.string().min(10, "At least 10 characters.").max(200) }).safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const client = adminAuthClient();
    if (!client) return { ok: false, error: "Setting passwords needs SUPABASE_SERVICE_ROLE_KEY on the server (see docs/SUPABASE_SETUP.md)." };
    const { error } = await client.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.password });
    if (error) return { ok: false, error: `Could not set the password: ${error.message}` };
    const supabase = await createClient();
    await supabase.rpc("log_view", { p_section: "admin", p_entity: `password_set_by:${v.id}`, p_entity_id: parsed.data.id }).then(() => {}, () => {});
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
