"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import type { DigitalAccount, Section } from "@/lib/types";
import { parseAccountsCsv } from "@/lib/accounts/csv";

type Result = { ok: true } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

async function need(section: Section) {
  const v = await getViewer();
  if (!canWrite(v, section)) throw new Error("You don't have permission to change this.");
  return v;
}
const bump = (name: string, section: Section, action: "create" | "update" | "delete", summary: string, entity: string) => {
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section, entity, via: "app", summary });
};

// Mirrors the database CHECK: nothing that looks like a credential may be saved.
const SECRET = /(password|passcode|passphrase|pin|security answer)\s*[:=]/i;

// --- Digital accounts -----------------------------------------------------------------
const DigitalForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  service: z.string().trim().min(2, "Which service?").max(200),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  owner: z.enum(["rich", "diana", "both"]),
  category: Opt(80),
  purpose: Opt(300),
  vault_name: Opt(120),
  vault_item: Opt(200),
  status: z.enum(["found", "to_find"]),
  after_death: Opt(500),
  notes: Opt(1000),
});

export async function saveDigitalAccount(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("digital_accounts");
    const parsed = DigitalForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    if (SECRET.test([d.vault_item, d.notes, d.purpose, d.after_death].join(" "))) {
      return { ok: false, error: "This looks like a password or PIN. Passwords never go in the binder — put it in the password vault and write the item's name here instead." };
    }
    const row = { service: d.service, website: nul(d.website), owner: d.owner, category: nul(d.category), purpose: nul(d.purpose), vault_name: d.vault_name || "Greene Family", vault_item: nul(d.vault_item), status: d.status, after_death: nul(d.after_death), notes: nul(d.notes) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const a = s.digital.find((x) => x.id === id); if (!a) return { ok: false, error: "Not found." }; Object.assign(a, row); }
      else s.digital.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, "digital_accounts", id ? "update" : "create", `${id ? "Updated" : "Added"} ${d.service}`, "digital_accounts");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("digital_accounts").update(row).eq("id", id) : await supabase.from("digital_accounts").insert(row);
      if (error) return { ok: false, error: /no_secrets/.test(error.message) ? "This looks like a password. Keep passwords in the vault, not here." : "Could not save." };
    }
    revalidatePath("/digital");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteDigitalAccount(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await need("digital_accounts");
    if (v.demo) {
      const s = demoStore(); const i = s.digital.findIndex((x) => x.id === id);
      if (i >= 0) { bump(v.name, "digital_accounts", "delete", `Removed ${s.digital[i].service}`, "digital_accounts"); s.digital.splice(i, 1); }
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("digital_accounts").delete().eq("id", id);
      if (error) return { ok: false, error: "Could not remove." };
    }
    revalidatePath("/digital");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Household ------------------------------------------------------------------------------
const HouseholdForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(["pet", "vehicle", "heirloom", "service", "other"]),
  name: z.string().trim().min(1, "Give it a name.").max(200),
  details: Opt(4000),
});

export async function saveHouseholdItem(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("household");
    const parsed = HouseholdForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    if (SECRET.test(d.details ?? "") || /\b(combination|code)\s*(is|:)\s*\d{3,}/i.test(d.details ?? "")) {
      return { ok: false, error: "That looks like a code or combination. Put it in the password vault and write the item's name here instead." };
    }
    const row = { kind: d.kind, name: d.name, details: nul(d.details) };
    if (v.demo) {
      const s = demoStore();
      if (id) { const h = s.household.find((x) => x.id === id); if (!h) return { ok: false, error: "Not found." }; Object.assign(h, row); }
      else s.household.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, "household", id ? "update" : "create", `${id ? "Updated" : "Added"} ${d.name}`, "household_items");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("household_items").update(row).eq("id", id) : await supabase.from("household_items").insert(row);
      if (error) return { ok: false, error: "Could not save." };
    }
    revalidatePath("/household");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteHouseholdItem(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await need("household");
    if (v.demo) {
      const s = demoStore(); const i = s.household.findIndex((x) => x.id === id);
      if (i >= 0) { bump(v.name, "household", "delete", `Removed ${s.household[i].name}`, "household_items"); s.household.splice(i, 1); }
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("household_items").delete().eq("id", id);
      if (error) return { ok: false, error: "Could not remove." };
    }
    revalidatePath("/household");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- CSV import: names and statuses only --------------------------------------------
export async function importAccountsCsv(_p: { ok: boolean; message: string } | null, form: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    const v = await need("digital_accounts");
    if (v.role !== "super_admin") return { ok: false, message: "Super admins only." };
    const text = String(form.get("csv") ?? "");
    const parsed = parseAccountsCsv(text);
    if (!parsed.ok) return { ok: false, message: parsed.error };
    let created = 0, updated = 0;
    if (v.demo) {
      const s = demoStore();
      for (const r of parsed.rows) {
        const existing = s.digital.find((x) => x.service.toLowerCase() === r.service.toLowerCase() && x.owner === r.owner);
        if (existing) { Object.assign(existing, { status: r.status, website: r.website ?? existing.website, category: r.category ?? existing.category, vault_item: r.vault_item ?? existing.vault_item, notes: r.notes ?? existing.notes }); updated++; }
        else { s.digital.push({ id: crypto.randomUUID(), service: r.service, website: r.website, owner: r.owner, category: r.category, purpose: null, vault_name: r.vault_name ?? "Greene Family", vault_item: r.vault_item, status: r.status, after_death: null, notes: r.notes, source: "import" } as DigitalAccount); created++; }
      }
      bump(v.name, "digital_accounts", "create", `Imported ${parsed.rows.length} accounts from CSV`, "digital_accounts");
    } else {
      const supabase = await createClient();
      const { data: existing } = await supabase.from("digital_accounts").select("id, service, owner");
      for (const r of parsed.rows) {
        const hit = existing?.find((x) => x.service.toLowerCase() === r.service.toLowerCase() && x.owner === r.owner);
        const row = { service: r.service, website: r.website, owner: r.owner, category: r.category, vault_name: r.vault_name ?? "Greene Family", vault_item: r.vault_item, status: r.status, notes: r.notes, source: "import" as const };
        const { error } = hit ? await supabase.from("digital_accounts").update(row).eq("id", hit.id) : await supabase.from("digital_accounts").insert(row);
        if (error) return { ok: false, message: `Row "${r.service}": ${/no_secrets/.test(error.message) ? "looks like it contains a password" : "could not be saved"}.` };
        if (hit) updated++; else created++;
      }
    }
    revalidatePath("/digital");
    return { ok: true, message: `Imported ${parsed.rows.length} rows: ${created} new, ${updated} updated.${parsed.skipped ? ` ${parsed.skipped} blank rows skipped.` : ""}` };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}
