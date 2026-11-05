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
const bump = (name: string, section: Section, action: "create" | "update" | "delete", summary: string, entity: string) => {
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section, entity, via: "app", summary });
};

// Mirrors the database CHECK: nothing that looks like a credential may be saved.
const SECRET = /(password|passcode|passphrase|pin|security answer)\s*[:=]/i;

// --- Digital accounts -----------------------------------------------------------------
const DigitalForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  service: z.string().trim().min(2, "Which service?").max(200),
  owner: z.enum(["rich", "diana", "both"]),
  purpose: Opt(300),
  vault_item: Opt(200),
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
    const row = { service: d.service, owner: d.owner, purpose: nul(d.purpose), vault_item: nul(d.vault_item), after_death: nul(d.after_death), notes: nul(d.notes) };
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
