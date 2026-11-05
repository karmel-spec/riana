"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import type { Section } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };
const Patient = z.enum(["rich", "diana"]);
const Opt = z.string().trim().max(300).optional().or(z.literal(""));
const nul = (s: string | undefined) => (s ? s : null);

async function need(patient: "rich" | "diana") {
  const v = await getViewer();
  const section: Section = `health_${patient}`;
  if (!canWrite(v, section)) throw new Error("You don't have permission to change this.");
  return { v, section };
}

const bump = (name: string, section: Section, summary: string, entity: string) => {
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action: "create", section, entity, via: "app", summary });
};

// --- Visit note -----------------------------------------------------------------
const Visit = z.object({
  patient: Patient,
  visit_on: z.string().min(10, "Please pick the visit date."),
  provider_id: z.string().uuid().optional().or(z.literal("")),
  summary: z.string().trim().min(3, "What happened at the visit?").max(4000),
  follow_up: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function addVisitNote(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Visit.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const { v, section } = await need(d.patient);
    const row = { patient: d.patient, visit_on: d.visit_on, provider_id: nul(d.provider_id), summary: d.summary, follow_up: nul(d.follow_up), author_name: v.name };
    if (v.demo) {
      demoStore().visits.unshift({ id: crypto.randomUUID(), ...row, source: "app", created_at: new Date().toISOString() });
      bump(v.name, section, `Logged a doctor visit for ${d.patient === "rich" ? "Rich" : "Diana"}`, "visit_notes");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("visit_notes").insert(row);
      if (error) return { ok: false, error: "Could not save the visit note." };
    }
    revalidatePath(`/health/${d.patient}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Medication -----------------------------------------------------------------
const Med = z.object({
  patient: Patient,
  name: z.string().trim().min(2, "Please enter the medication name.").max(200),
  dose: Opt, schedule: Opt, purpose: Opt,
  prescriber_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function addMedication(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Med.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const { v, section } = await need(d.patient);
    const row = { patient: d.patient, name: d.name, dose: nul(d.dose), schedule: nul(d.schedule), purpose: nul(d.purpose), prescriber_id: nul(d.prescriber_id), notes: nul(d.notes) };
    if (v.demo) {
      demoStore().medications.push({ id: crypto.randomUUID(), ...row, started_on: new Date().toISOString().slice(0, 10), stopped_on: null, active: true, source: "app" });
      bump(v.name, section, `Added medication ${d.name}`, "medications");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("medications").insert({ ...row, started_on: new Date().toISOString().slice(0, 10) });
      if (error) return { ok: false, error: "Could not save the medication." };
    }
    revalidatePath(`/health/${d.patient}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function stopMedication(patient: "rich" | "diana", id: string, stop: boolean): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const { v } = await need(patient);
    const patch = { active: !stop, stopped_on: stop ? new Date().toISOString().slice(0, 10) : null };
    if (v.demo) {
      const m = demoStore().medications.find((x) => x.id === id);
      if (m) Object.assign(m, patch);
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("medications").update(patch).eq("id", id);
      if (error) return { ok: false, error: "Could not update." };
    }
    revalidatePath(`/health/${patient}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Lab result -----------------------------------------------------------------
const Lab = z.object({
  patient: Patient,
  test_name: z.string().trim().min(1, "Which test?").max(100),
  value: z.coerce.number({ message: "Please enter the number." }),
  unit: Opt,
  ref_low: z.coerce.number().optional().or(z.literal("")),
  ref_high: z.coerce.number().optional().or(z.literal("")),
  taken_on: z.string().min(10, "When was it taken?"),
});

export async function addLabResult(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Lab.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const { v, section } = await need(d.patient);
    const lo = d.ref_low === "" || d.ref_low === undefined ? null : d.ref_low;
    const hi = d.ref_high === "" || d.ref_high === undefined ? null : d.ref_high;
    const row = { patient: d.patient, test_name: d.test_name, value: d.value, unit: nul(d.unit), ref_low: lo, ref_high: hi, taken_on: d.taken_on };
    if (v.demo) {
      const flag = hi !== null && d.value > hi ? "high" : lo !== null && d.value < lo ? "low" : "normal";
      demoStore().labs.push({ id: crypto.randomUUID(), ...row, flag, source: "app" });
      bump(v.name, section, `Added lab result ${d.test_name}`, "lab_results");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("lab_results").insert(row);
      if (error) return { ok: false, error: "Could not save the result." };
    }
    revalidatePath(`/health/${d.patient}`); revalidatePath("/");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
