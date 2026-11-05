import "server-only";
import { createClient } from "./supabase/server";
import type { Viewer } from "./session";
import { DEMO_USERS } from "./demo/users";
import type { AccessLevel, AppRole, Section, Subject } from "./types";

export type ProfileRow = {
  id: string; display_name: string; app_role: AppRole; is_subject: Subject | null;
  access_expires_at: string | null; created_at: string; grant_count: number;
};
export type InvitationRow = {
  id: string; email: string; display_name: string; app_role: AppRole; is_subject: Subject | null;
  access_expires_at: string | null; accepted_at: string | null; created_at: string;
};
export type GrantRow = {
  id: string; user_id: string; section: Section; level: AccessLevel; expires_at: string | null; reason: string | null; break_glass: boolean;
};

export async function getProfiles(v: Viewer): Promise<ProfileRow[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) {
    return DEMO_USERS.map((u, i) => ({
      id: `demo-${u.key}`, display_name: u.name, app_role: u.role, is_subject: u.isSubject,
      access_expires_at: null, created_at: new Date(Date.now() - i * 86400000).toISOString(), grant_count: u.role === "parent" ? 1 : 0,
    }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("people_and_access").select("*").order("created_at");
  if (error) throw new Error("Could not load people.");
  return data as ProfileRow[];
}

export async function getInvitations(v: Viewer): Promise<InvitationRow[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return [{ id: "demo-inv-1", email: "cousin@example.com", display_name: "Sample Cousin", app_role: "posterity", is_subject: null, access_expires_at: null, accepted_at: null, created_at: new Date().toISOString() }];
  const supabase = await createClient();
  const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load invitations.");
  return data as InvitationRow[];
}

export async function getGrants(v: Viewer): Promise<GrantRow[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return [
    { id: "g1", user_id: "demo-diana", section: "health_diana", level: "write", expires_at: null, reason: "own records", break_glass: false },
    { id: "g2", user_id: "demo-rich", section: "health_rich", level: "write", expires_at: null, reason: "own records", break_glass: false },
  ];
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_section_access").select("*").order("created_at");
  if (error) throw new Error("Could not load grants.");
  return data as GrantRow[];
}

