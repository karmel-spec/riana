"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import type { Section } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

async function need(section: Section) {
  const v = await getViewer();
  if (!canWrite(v, section)) throw new Error("You don't have permission to change this.");
  return v;
}
const bump = (name: string, section: Section, action: "create" | "update", summary: string, entity: string) => {
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section, entity, via: "app", summary });
};

// --- Properties ---------------------------------------------------------------------
const PropertyForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Give the property a name.").max(120),
  kind: z.enum(["residence", "rental", "land", "other"]),
  address: Opt(300), held_by: Opt(200), succession_plan: Opt(1000), hoa_name: Opt(120), notes: Opt(2000),
  manager_person_id: z.string().uuid().optional().or(z.literal("")),
});

export async function saveProperty(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("properties");
    const parsed = PropertyForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const row = { name: d.name, kind: d.kind, address: nul(d.address), held_by: nul(d.held_by), succession_plan: nul(d.succession_plan), hoa_name: nul(d.hoa_name), notes: nul(d.notes), manager_person_id: nul(d.manager_person_id) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const p = s.properties.find((x) => x.id === id); if (!p) return { ok: false, error: "Not found." }; Object.assign(p, row); }
      else s.properties.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, "properties", id ? "update" : "create", `${id ? "Updated" : "Added"} property ${d.name}`, "properties");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("properties").update(row).eq("id", id) : await supabase.from("properties").insert(row);
      if (error) return { ok: false, error: "Could not save the property." };
    }
    revalidatePath("/properties");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Insurance ---------------------------------------------------------------------
const PolicyForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(["auto", "home", "classic_car", "umbrella", "medicare", "supplemental", "champva", "life", "landlord", "other"]),
  carrier: z.string().trim().min(2, "Which company?").max(200),
  insured: z.enum(["rich", "diana", "both"]),
  policy_last4: z.string().trim().regex(/^[0-9A-Za-z]{4}$/, "Last 4 characters of the policy number only.").optional().or(z.literal("")),
  premium: z.coerce.number().nonnegative().optional().or(z.literal("")),
  renews_on: z.string().optional().or(z.literal("")),
  agent_person_id: z.string().uuid().optional().or(z.literal("")),
  notes: Opt(1000),
});

export async function savePolicy(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("insurance");
    const parsed = PolicyForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    if (/[0-9A-Za-z-]{8,}/.test(d.notes ?? "") && /\d{5,}/.test(d.notes ?? "")) return { ok: false, error: "That looks like a full policy number in the notes. Keep only the last 4." };
    const row = { kind: d.kind, carrier: d.carrier, insured: d.insured, policy_last4: nul(d.policy_last4), premium: d.premium === "" || d.premium === undefined ? null : d.premium, renews_on: nul(d.renews_on), agent_person_id: nul(d.agent_person_id), notes: nul(d.notes) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const p = s.policies.find((x) => x.id === id); if (!p) return { ok: false, error: "Not found." }; Object.assign(p, row); }
      else s.policies.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, "insurance", id ? "update" : "create", `${id ? "Updated" : "Added"} ${d.kind} policy with ${d.carrier}`, "insurance_policies");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("insurance_policies").update(row).eq("id", id) : await supabase.from("insurance_policies").insert(row);
      if (error) return { ok: false, error: "Could not save the policy." };
    }
    revalidatePath("/insurance"); revalidatePath("/calendar");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Taxes ----------------------------------------------------------------------------
const TaxForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  tax_year: z.coerce.number().int().min(1990).max(2100),
  kind: z.enum(["federal", "state", "property", "exemption", "other"]),
  preparer: Opt(200),
  status: z.string().trim().min(1, "What's the status?").max(200),
  filed_on: z.string().optional().or(z.literal("")),
  notes: Opt(1000),
});

export async function saveTaxRecord(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("taxes");
    const parsed = TaxForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const row = { tax_year: d.tax_year, kind: d.kind, preparer: nul(d.preparer), status: d.status, filed_on: nul(d.filed_on), notes: nul(d.notes) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const t = s.taxes.find((x) => x.id === id); if (!t) return { ok: false, error: "Not found." }; Object.assign(t, row); }
      else s.taxes.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, "taxes", id ? "update" : "create", `${id ? "Updated" : "Added"} ${d.tax_year} ${d.kind} tax record`, "tax_records");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("tax_records").update(row).eq("id", id) : await supabase.from("tax_records").insert(row);
      if (error) return { ok: false, error: "Could not save the record." };
    }
    revalidatePath("/insurance");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
