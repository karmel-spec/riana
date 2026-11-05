"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import type { Bill, Section } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);

async function need(section: Section) {
  const v = await getViewer();
  if (!canWrite(v, section)) throw new Error("You don't have permission to change this.");
  return v;
}

const bump = (name: string, section: Section, action: "create" | "update", summary: string, entity: string) => {
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section, entity, via: "app", summary });
};

// --- Bills --------------------------------------------------------------------------
const NewBill = z.object({
  payee: z.string().trim().min(2, "Who gets paid?").max(200),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  amount: z.coerce.number().nonnegative().optional().or(z.literal("")),
  frequency: z.enum(["monthly", "quarterly", "semiannual", "annual", "one_time"]),
  next_due_on: z.string().optional().or(z.literal("")),
  autopay: z.string().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function addBill(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("bills");
    const parsed = NewBill.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const row = {
      payee: d.payee, category: nul(d.category), amount: d.amount === "" || d.amount === undefined ? null : d.amount,
      frequency: d.frequency, next_due_on: nul(d.next_due_on), autopay: d.autopay === "on", notes: nul(d.notes),
    };
    if (v.demo) {
      demoStore().bills.push({ id: crypto.randomUUID(), ...row, status: "upcoming", source: "app" });
      bump(v.name, "bills", "create", `Added bill ${d.payee}`, "bills");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("bills").insert(row);
      if (error) return { ok: false, error: "Could not save the bill." };
    }
    revalidatePath("/money"); revalidatePath("/");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

function advance(iso: string, frequency: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12, one_time: 0 }[frequency] ?? 1;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function setBillStatus(id: string, status: Bill["status"]): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await need("bills");
    const today = new Date().toISOString().slice(0, 10);
    if (v.demo) {
      const b = demoStore().bills.find((x) => x.id === id);
      if (!b) return { ok: false, error: "Bill not found." };
      if (status === "paid") {
        b.last_paid_on = today;
        if (b.frequency !== "one_time" && b.next_due_on) { b.next_due_on = advance(b.next_due_on, b.frequency); b.status = "upcoming"; }
        else b.status = "paid";
      } else b.status = status;
      bump(v.name, "bills", "update", `Marked ${b.payee} as ${status}`, "bills");
    } else {
      const supabase = await createClient();
      if (status === "paid") {
        const { data: b } = await supabase.from("bills").select("frequency, next_due_on").eq("id", id).single();
        const roll = b && b.frequency !== "one_time" && b.next_due_on;
        const { error } = await supabase.from("bills").update({
          last_paid_on: today,
          status: roll ? "upcoming" : "paid",
          next_due_on: roll ? advance(b.next_due_on, b.frequency) : b?.next_due_on ?? null,
        }).eq("id", id);
        if (error) return { ok: false, error: "Could not update." };
      } else {
        const { error } = await supabase.from("bills").update({ status }).eq("id", id);
        if (error) return { ok: false, error: "Could not update." };
      }
    }
    revalidatePath("/money"); revalidatePath("/");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Accounts -------------------------------------------------------------------------
const NewAccount = z.object({
  institution: z.string().trim().min(2, "Which bank or company?").max(200),
  kind: z.enum(["checking", "savings", "brokerage", "retirement", "credit_card", "loan", "other"]),
  purpose: z.string().trim().max(200).optional().or(z.literal("")),
  last4: z.string().trim().regex(/^[0-9]{4}$/, "Last 4 digits only — never the full number.").optional().or(z.literal("")),
  held_by: z.enum(["rich", "diana", "both"]),
  beneficiary_notes: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function addAccount(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need("accounts");
    const parsed = NewAccount.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    if (/\d{5,}/.test([d.purpose, d.notes, d.beneficiary_notes].join(" "))) {
      return { ok: false, error: "That looks like a full account number in the notes. Please keep only the last 4 digits." };
    }
    const row = { institution: d.institution, kind: d.kind, purpose: nul(d.purpose), last4: nul(d.last4), held_by: d.held_by, beneficiary_notes: nul(d.beneficiary_notes), notes: nul(d.notes) };
    if (v.demo) {
      demoStore().accounts.push({ id: crypto.randomUUID(), ...row, source: "app" });
      bump(v.name, "accounts", "create", `Added account at ${d.institution}`, "accounts");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("accounts").insert(row);
      if (error) return { ok: false, error: "Could not save the account." };
    }
    revalidatePath("/money");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
