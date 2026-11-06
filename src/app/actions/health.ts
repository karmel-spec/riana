"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import type { HealthCondition, Section, VaClaim } from "@/lib/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const Patient = z.enum(["rich", "diana"]);
const Opt = (max = 300) => z.string().trim().max(max).optional().or(z.literal(""));
const nul = (s: string | undefined) => (s ? s : null);
const today = () => new Date().toISOString().slice(0, 10);

async function need(patient: "rich" | "diana") {
  const v = await getViewer();
  const section: Section = `health_${patient}`;
  if (!canWrite(v, section)) throw new Error("You don't have permission to change this.");
  return { v, section };
}
const bump = (name: string, section: Section, summary: string, entity: string) =>
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action: "create", section, entity, via: "app", summary });

// --- Visit note -----------------------------------------------------------------
const Visit = z.object({
  patient: Patient, visit_on: z.string().min(10, "Please pick the visit date."),
  provider_id: z.string().uuid().optional().or(z.literal("")),
  summary: z.string().trim().min(3, "What happened at the visit?").max(4000),
  follow_up: z.string().trim().max(1000).optional().or(z.literal("")),
});
export async function addVisitNote(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Visit.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data; const { v, section } = await need(d.patient);
    const row = { patient: d.patient, visit_on: d.visit_on, provider_id: nul(d.provider_id), summary: d.summary, follow_up: nul(d.follow_up), author_name: v.name };
    if (v.demo) { demoStore().visits.unshift({ id: crypto.randomUUID(), ...row, source: "app", created_at: new Date().toISOString() }); bump(v.name, section, `Logged a doctor visit for ${d.patient === "rich" ? "Rich" : "Diana"}`, "visit_notes"); }
    else { const supabase = await createClient(); const { error } = await supabase.from("visit_notes").insert(row); if (error) return { ok: false, error: "Could not save the visit note." }; }
    revalidatePath(`/health/${d.patient}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Medication -----------------------------------------------------------------
const Med = z.object({
  patient: Patient, id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Please enter the medication name.").max(200),
  dose: Opt(), schedule: Opt(), purpose: Opt(),
  frequency_kind: z.enum(["daily", "prn", "weekly", "other"]),
  prn_for: Opt(), max_per_day: Opt(80),
  prescriber_id: z.string().uuid().optional().or(z.literal("")),
  source_document: Opt(200), source_date: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export async function saveMedication(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Med.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data; const { v, section } = await need(d.patient);
    if (!d.source_document) return { ok: false, error: "Where did this come from? Name the document, visit or phone call." };
    const row = { patient: d.patient, name: d.name, dose: nul(d.dose), schedule: nul(d.schedule), purpose: nul(d.purpose), frequency_kind: d.frequency_kind, prn_for: d.frequency_kind === "prn" ? nul(d.prn_for) : null, max_per_day: nul(d.max_per_day), prescriber_id: nul(d.prescriber_id), source_document: d.source_document, source_date: d.source_date || today(), notes: nul(d.notes) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const m = s.medications.find((x) => x.id === id); if (!m) return { ok: false, error: "Not found." }; Object.assign(m, row); }
      else s.medications.push({ id: crypto.randomUUID(), ...row, started_on: today(), stopped_on: null, active: true, source_file_id: null, source: "app" });
      bump(v.name, section, `${id ? "Updated" : "Added"} medication ${d.name}`, "medications");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("medications").update(row).eq("id", id) : await supabase.from("medications").insert({ ...row, started_on: today() });
      if (error) return { ok: false, error: "Could not save the medication." };
    }
    revalidatePath(`/health/${d.patient}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
export const addMedication = saveMedication;

export async function stopMedication(patient: "rich" | "diana", id: string, stop: boolean): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const { v } = await need(patient);
    const patch = { active: !stop, stopped_on: stop ? today() : null };
    if (v.demo) { const m = demoStore().medications.find((x) => x.id === id); if (m) Object.assign(m, patch); }
    else { const supabase = await createClient(); const { error } = await supabase.from("medications").update(patch).eq("id", id); if (error) return { ok: false, error: "Could not update." }; }
    revalidatePath(`/health/${patient}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Conditions, allergies, sensitivities ---------------------------------------------
const Cond = z.object({
  patient: Patient, id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(["condition", "allergy", "sensitivity", "coverage"]),
  name: z.string().trim().min(2, "What is it called?").max(200),
  detail: Opt(1000), since: z.string().optional().or(z.literal("")),
  reaction: Opt(300), severity: z.enum(["mild", "moderate", "severe", "life_threatening"]).optional().or(z.literal("")),
  status: z.enum(["active", "resolved", "monitoring"]),
  source_document: Opt(200), source_date: z.string().optional().or(z.literal("")),
});
export async function saveCondition(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Cond.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data; const { v, section } = await need(d.patient);
    if (d.kind === "condition" && !d.since) return { ok: false, error: "When did it start? An approximate date is fine (pick the first of the month)." };
    if ((d.kind === "allergy" || d.kind === "sensitivity") && !d.reaction) return { ok: false, error: "What reaction does it cause?" };
    if (d.kind !== "coverage" && !d.source_document) return { ok: false, error: "Where did this come from? Name the document, visit or phone call." };
    const row = { patient: d.patient, kind: d.kind, name: d.name, detail: nul(d.detail), since: nul(d.since), reaction: nul(d.reaction), severity: (nul(d.severity) as HealthCondition["severity"]) ?? null, status: d.status, source_document: nul(d.source_document), source_date: d.source_document ? (d.source_date || today()) : null };
    if (v.demo) {
      const s = demoStore();
      if (id) { const c = s.conditions.find((x) => x.id === id); if (!c) return { ok: false, error: "Not found." }; Object.assign(c, row); }
      else s.conditions.push({ id: crypto.randomUUID(), ...row, source_file_id: null });
      bump(v.name, section, `${id ? "Updated" : "Added"} ${d.kind}: ${d.name}`, "health_conditions");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("health_conditions").update(row).eq("id", id) : await supabase.from("health_conditions").insert(row);
      if (error) return { ok: false, error: "Could not save." };
    }
    revalidatePath(`/health/${d.patient}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Lab result -----------------------------------------------------------------
const Lab = z.object({
  patient: Patient, test_name: z.string().trim().min(1, "Which test?").max(100),
  value: z.coerce.number({ message: "Please enter the number." }), unit: Opt(),
  ref_low: z.coerce.number().optional().or(z.literal("")), ref_high: z.coerce.number().optional().or(z.literal("")),
  taken_on: z.string().min(10, "When was it taken?"),
});
export async function addLabResult(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Lab.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data; const { v, section } = await need(d.patient);
    const lo = d.ref_low === "" || d.ref_low === undefined ? null : d.ref_low; const hi = d.ref_high === "" || d.ref_high === undefined ? null : d.ref_high;
    const row = { patient: d.patient, test_name: d.test_name, value: d.value, unit: nul(d.unit), ref_low: lo, ref_high: hi, taken_on: d.taken_on };
    if (v.demo) { const flag = hi !== null && d.value > hi ? "high" : lo !== null && d.value < lo ? "low" : "normal"; demoStore().labs.push({ id: crypto.randomUUID(), ...row, flag, source: "app" }); bump(v.name, section, `Added lab result ${d.test_name}`, "lab_results"); }
    else { const supabase = await createClient(); const { error } = await supabase.from("lab_results").insert(row); if (error) return { ok: false, error: "Could not save the result." }; }
    revalidatePath(`/health/${d.patient}`); revalidatePath("/"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- VA claim timeline ---------------------------------------------------------------
const ClaimEvent = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(["claim", "appeal", "cp_exam", "rating_decision", "letter", "evidence", "note"]),
  title: z.string().trim().min(2, "Title?").max(200), status: z.string().trim().min(1, "Status?").max(120),
  event_on: z.string().min(10, "Date?"), rating_pct: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")),
  summary: Opt(1000), next_step: Opt(300), notes: Opt(1000), imported_file_id: z.string().uuid().optional().or(z.literal("")),
});
export async function saveClaimEvent(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = ClaimEvent.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data; const { v } = await need("rich");
    const row = { kind: d.kind, title: d.title, status: d.status, event_on: d.event_on, rating_pct: d.rating_pct === "" || d.rating_pct === undefined ? null : d.rating_pct, summary: nul(d.summary), next_step: nul(d.next_step), notes: nul(d.notes), imported_file_id: nul(d.imported_file_id),
      decided_on: d.kind === "rating_decision" ? d.event_on : null, filed_on: d.kind === "claim" || d.kind === "appeal" ? d.event_on : null };
    if (v.demo) {
      const s = demoStore();
      if (id) { const c = s.vaClaims.find((x) => x.id === id); if (!c) return { ok: false, error: "Not found." }; Object.assign(c, row); }
      else s.vaClaims.push({ id: crypto.randomUUID(), ...row, source: "app" } as VaClaim);
      bump(v.name, "health_rich", `${id ? "Updated" : "Added"} VA claim entry: ${d.title}`, "va_claims");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("va_claims").update(row).eq("id", id) : await supabase.from("va_claims").insert(row);
      if (error) return { ok: false, error: "Could not save." };
    }
    revalidatePath("/health/rich"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Turn approved imported VA claim letters (date in the file name) into timeline entries. Idempotent. */
export async function syncVaLetters(): Promise<Result<{ created: number }>> {
  try {
    const { v } = await need("rich");
    const files = (await listImportedFiles(v)).filter((f) => f.review_status === "approved" && f.manifest_rule === "va-letter");
    let created = 0;
    const existing = await (async () => {
      if (v.demo) return demoStore().vaClaims.map((c) => c.imported_file_id).filter(Boolean) as string[];
      const supabase = await createClient(); const { data } = await supabase.from("va_claims").select("imported_file_id").not("imported_file_id", "is", null);
      return (data ?? []).map((x) => x.imported_file_id as string);
    })();
    for (const f of files) {
      if (existing.includes(f.id)) continue;
      const m = /(\d{4})-(\d{2})-(\d{2})/.exec(f.name);
      const event_on = m ? `${m[1]}-${m[2]}-${m[3]}` : f.drive_modified_at?.slice(0, 10) ?? today();
      const row = { kind: "letter" as const, title: "VA claim letter", status: "Received", event_on, summary: `Imported from "${f.name}"`, imported_file_id: f.id, source: "import" as const };
      if (v.demo) demoStore().vaClaims.push({ id: crypto.randomUUID(), filed_on: null, decided_on: null, rating_pct: null, next_step: null, notes: null, ...row });
      else { const supabase = await createClient(); const { error } = await supabase.from("va_claims").insert(row); if (error) throw new Error(error.message); }
      created++;
    }
    revalidatePath("/health/rich"); return { ok: true, data: { created } };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
