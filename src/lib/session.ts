import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemo } from "./env";
import { createClient } from "./supabase/server";
import { ROLE_DEFAULTS } from "./permissions";
import { DEMO_USERS } from "./demo/users";
import { SECTIONS, type AccessLevel, type AppRole, type Section, type Subject } from "./types";

export type Viewer = {
  id: string;
  name: string;
  role: AppRole;
  isSubject: Subject | null;
  /** Effective access per section, as the database will enforce it right now. */
  access: Record<Section, AccessLevel>;
  /** Sections that 2-step verification would unlock. */
  locked: Section[];
  demo: boolean;
  /** Show the simplified "Brief" version of every screen (always on for parents; a toggle for everyone else). */
  brief: boolean;
};

export const DEMO_COOKIE = "greene_demo_as";
export const VIEW_COOKIE = "greene_view";

async function briefRequested() { return (await cookies()).get(VIEW_COOKIE)?.value === "brief"; }

function demoViewer(key: string | undefined, brief: boolean): Viewer {
  const u = DEMO_USERS.find((d) => d.key === key) ?? DEMO_USERS[0];
  const access = Object.fromEntries(SECTIONS.map((s) => {
    let level: AccessLevel = u.role === "super_admin" ? "write" : ROLE_DEFAULTS[u.role][s] ?? "none";
    // Parents get their own health section (mirrors the per-person grant).
    if (u.role === "parent" && s === `health_${u.isSubject}`) level = "write";
    return [s, level];
  })) as Record<Section, AccessLevel>;
  return { id: `demo-${u.key}`, name: u.name, role: u.role, isSubject: u.isSubject, access, locked: [], demo: true, brief: u.role === "parent" || brief };
}

/** The signed-in person, or a redirect to /login. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer> => {
  if (isDemo()) {
    return demoViewer((await cookies()).get(DEMO_COOKIE)?.value, await briefRequested());
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.rpc("my_profile").maybeSingle<{ id: string; display_name: string; app_role: AppRole; is_subject: Subject | null }>(),
    supabase.rpc("my_access"),
  ]);
  const accessRows = (rows ?? []) as { section: Section; level: AccessLevel; needs_mfa: boolean }[];
  if (!profile) redirect("/login?error=no-access");

  const access = Object.fromEntries(SECTIONS.map((s) => [s, "none"])) as Record<Section, AccessLevel>;
  const locked: Section[] = [];
  for (const r of accessRows) {
    access[r.section] = r.level;
    if (r.needs_mfa) locked.push(r.section);
  }
  return { id: profile.id, name: profile.display_name, role: profile.app_role, isSubject: profile.is_subject, access, locked, demo: false, brief: profile.app_role === "parent" || await briefRequested() };
});

export const canRead = (v: Viewer, s: Section) => v.access[s] !== "none";
export const canWrite = (v: Viewer, s: Section) => v.access[s] === "write";

/** Use at the top of a page: 404s (not "forbidden") so section names don't leak. */
export async function requireSection(s: Section): Promise<Viewer> {
  const v = await getViewer();
  if (!canRead(v, s)) {
    if (v.locked.includes(s)) redirect("/mfa");
    redirect("/");
  }
  return v;
}

export async function requireSuperAdmin(): Promise<Viewer> {
  const v = await getViewer();
  if (v.role !== "super_admin") redirect("/");
  return v;
}
