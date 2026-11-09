"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const blank = (v: unknown) => (v === "" || v === undefined ? undefined : v);
const Money = z.preprocess(blank, z.coerce.number().min(0).optional());
const missing = (m: string) => m.includes("balance") || m.includes("estimated_value") || m.includes("income_sources") ? "The database is missing the financial-statement migration (20261106000021)." : `Could not save: ${m}`;

async function writer() {
  const v = await getViewer();
  if (!canWrite(v, "accounts")) throw new Error("You don't have permission to change the financial statement.");
  return v;
}

export async function setAccountBalance(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const p = z.object({ id: z.string().uuid(), balance: Money, balance_as_of: z.string().optional().or(z.literal("")) }).safeParse(Object.fromEntries(form));
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    const v = await writer(); const d = p.data;
    const row = { balance: d.balance ?? null, balance_as_of: d.balance_as_of || new Date().toISOString().slice(0, 10) };
    if (v.demo) { const a = demoStore().accounts.find((x) => x.id === d.id); if (a) Object.assign(a, row); }
    else { const supabase = await createClient(); const { error } = await supabase.from("accounts").update(row).eq("id", d.id); if (error) return { ok: false, error: missing(error.message) }; }
    revalidatePath("/statement"); revalidatePath("/money"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function setPropertyValue(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const p = z.object({ id: z.string().uuid(), estimated_value: Money, valuation_on: z.string().optional().or(z.literal("")), valuation_source: z.string().trim().max(120).optional().or(z.literal("")) }).safeParse(Object.fromEntries(form));
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    const v = await writer(); const d = p.data;
    const row = { estimated_value: d.estimated_value ?? null, valuation_on: d.valuation_on || new Date().toISOString().slice(0, 10), valuation_source: d.valuation_source || null };
    if (v.demo) { const x = demoStore().properties.find((y) => y.id === d.id); if (x) Object.assign(x, row); }
    else { const supabase = await createClient(); const { error } = await supabase.from("properties").update(row).eq("id", d.id); if (error) return { ok: false, error: missing(error.message) }; }
    revalidatePath("/statement"); revalidatePath("/properties"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const Income = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "What is the income?").max(140),
  owner: z.enum(["rich", "diana", "both"]),
  kind: z.enum(["pension", "social_security", "va", "rental", "annuity", "loan_repayment", "other"]),
  amount_monthly: Money,
  taxable: z.string().optional(),
  survivor_note: z.string().trim().max(300).optional().or(z.literal("")),
  note: z.string().trim().max(400).optional().or(z.literal("")),
});

export async function saveIncomeSource(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const p = Income.safeParse(Object.fromEntries(form));
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    const { id, ...d } = p.data; const v = await writer();
    const row = { name: d.name, owner: d.owner, kind: d.kind, amount_monthly: d.amount_monthly ?? null, taxable: d.taxable === "on", survivor_note: d.survivor_note || null, note: d.note || null };
    if (v.demo) {
      const s = demoStore();
      if (id) { const x = s.incomeSources.find((y) => y.id === id); if (!x) return { ok: false, error: "Not found." }; Object.assign(x, row); }
      else s.incomeSources.push({ id: crypto.randomUUID(), ...row, source: "app" });
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("income_sources").update(row).eq("id", id) : await supabase.from("income_sources").insert(row);
      if (error) return { ok: false, error: missing(error.message) };
    }
    revalidatePath("/statement"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteIncomeSource(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await writer();
    if (v.demo) { const s = demoStore(); s.incomeSources = s.incomeSources.filter((x) => x.id !== id); }
    else { const supabase = await createClient(); const { error } = await supabase.from("income_sources").delete().eq("id", id); if (error) return { ok: false, error: "Could not remove it." }; }
    revalidatePath("/statement"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
