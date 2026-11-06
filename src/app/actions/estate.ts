"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

async function need() {
  const v = await getViewer();
  if (!canWrite(v, "legal")) throw new Error("You don't have permission to change the estate plan.");
  return v;
}
const bump = (name: string, action: "create" | "update", summary: string, entity: string) =>
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section: "legal", entity, via: "app", summary });

// --- Provisions -----------------------------------------------------------------------
const ProvisionForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  plan_version_id: z.string().uuid(),
  category: z.enum(["asset", "role", "term"]),
  subject: z.string().trim().min(2, "What is this provision about?").max(200),
  planned: z.string().trim().min(2, "What does the plan say?").max(2000),
  legal_document_id: z.string().uuid().optional().or(z.literal("")),
  notes: Opt(1000),
});

export async function saveProvision(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = ProvisionForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const row = { plan_version_id: d.plan_version_id, category: d.category, subject: d.subject, planned: d.planned, legal_document_id: nul(d.legal_document_id), notes: nul(d.notes) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const p = s.provisions.find((x) => x.id === id); if (!p) return { ok: false, error: "Not found." }; Object.assign(p, row); }
      else s.provisions.push({ id: crypto.randomUUID(), ...row, sort_order: s.provisions.length + 1 });
      bump(v.name, id ? "update" : "create", `${id ? "Updated" : "Added"} plan provision: ${d.subject}`, "estate_provisions");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("estate_provisions").update(row).eq("id", id)
        : await supabase.from("estate_provisions").insert({ ...row, sort_order: 1000 });
      if (error) return { ok: false, error: "Could not save." };
    }
    revalidatePath("/estate");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Open questions / conflicts ----------------------------------------------------------
const ConflictForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Give the question a title.").max(200),
  detail: Opt(2000),
  owner_name: Opt(80),
  status: z.enum(["open", "with_attorney", "decided", "resolved"]),
  resolution: Opt(2000),
  due_on: z.string().optional().or(z.literal("")),
  provision_id: z.string().uuid().optional().or(z.literal("")),
  plan_version_id: z.string().uuid().optional().or(z.literal("")),
});

export async function saveConflict(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = ConflictForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    if ((d.status === "decided" || d.status === "resolved") && !d.resolution) return { ok: false, error: "Write down what was decided." };
    const row = { title: d.title, detail: nul(d.detail), owner_name: nul(d.owner_name), status: d.status, resolution: nul(d.resolution), due_on: nul(d.due_on), provision_id: nul(d.provision_id), plan_version_id: nul(d.plan_version_id) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const c = s.conflicts.find((x) => x.id === id); if (!c) return { ok: false, error: "Not found." }; Object.assign(c, row); }
      else s.conflicts.push({ id: crypto.randomUUID(), ...row, sort_order: s.conflicts.length + 1 });
      bump(v.name, id ? "update" : "create", `${id ? "Updated" : "Added"} open question: ${d.title}`, "plan_conflicts");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("plan_conflicts").update(row).eq("id", id) : await supabase.from("plan_conflicts").insert({ ...row, sort_order: 1000 });
      if (error) return { ok: false, error: "Could not save." };
    }
    revalidatePath("/estate"); revalidatePath("/");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- New plan version (copies the current provisions so they can be edited) ----------
const VersionForm = z.object({
  title: z.string().trim().min(3, "Name the version.").max(200),
  plan_date: z.string().min(10, "Pick the date."),
  source_docs: Opt(500),
  summary: Opt(2000),
  copy_from: z.string().uuid().optional().or(z.literal("")),
});

export async function createPlanVersion(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = VersionForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const docs = (d.source_docs ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (v.demo) {
      const s = demoStore();
      const no = Math.max(0, ...s.planVersions.map((x) => x.version_no)) + 1;
      s.planVersions.forEach((x) => { if (x.status === "current") x.status = "superseded"; });
      const id = crypto.randomUUID();
      s.planVersions.push({ id, version_no: no, title: d.title, plan_date: d.plan_date, status: "current", source_docs: docs, summary: nul(d.summary) });
      if (d.copy_from) for (const p of s.provisions.filter((x) => x.plan_version_id === d.copy_from)) s.provisions.push({ ...p, id: crypto.randomUUID(), plan_version_id: id });
      bump(v.name, "create", `Created plan version ${no}: ${d.title}`, "estate_plan_versions");
    } else {
      const supabase = await createClient();
      const { data: prev } = await supabase.from("estate_plan_versions").select("version_no").order("version_no", { ascending: false }).limit(1).maybeSingle();
      await supabase.from("estate_plan_versions").update({ status: "superseded" }).eq("status", "current");
      const { data: created, error } = await supabase.from("estate_plan_versions")
        .insert({ version_no: (prev?.version_no ?? 0) + 1, title: d.title, plan_date: d.plan_date, status: "current", source_docs: docs, summary: nul(d.summary) }).select("id").single();
      if (error) return { ok: false, error: "Could not create the version." };
      if (d.copy_from) {
        const { data: provs } = await supabase.from("estate_provisions").select("category, subject, planned, legal_document_id, sort_order, notes").eq("plan_version_id", d.copy_from);
        if (provs?.length) await supabase.from("estate_provisions").insert(provs.map((p) => ({ ...p, plan_version_id: created.id })));
      }
    }
    revalidatePath("/estate");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
