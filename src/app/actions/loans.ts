"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import type { Loan } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);
const num = (s: string | number | undefined) => (s === "" || s === undefined ? null : Number(s));
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const Money = z.coerce.number().nonnegative().optional().or(z.literal(""));

async function need() {
  const v = await getViewer();
  if (!canWrite(v, "accounts")) throw new Error("You don't have permission to change loans.");
  return v;
}
const bump = (name: string, action: "create" | "update", summary: string, entity: string) =>
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section: "accounts", entity, via: "app", summary });

const LoanForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  direction: z.enum(["owed_to_estate", "owed_by_estate"]),
  counterparty: z.string().trim().min(2, "Who is the other party?").max(200),
  lender: Opt(200), purpose: Opt(300),
  principal: Money,
  rate_pct: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  status: z.enum(["proposed", "unclassified", "active", "paid_off", "forgiven"]),
  gift_or_loan: z.enum(["gift", "loan", "undecided"]).optional().or(z.literal("")),
  advance_on_inheritance: z.enum(["yes", "no", "undecided"]).optional().or(z.literal("")),
  note_signed: z.string().optional(),
  started_on: z.string().optional().or(z.literal("")),
  term_months: z.coerce.number().int().min(1).max(600).optional().or(z.literal("")),
  monthly_payment: Money,
  first_payment_on: z.string().optional().or(z.literal("")),
  property_id: z.string().uuid().optional().or(z.literal("")),
  legal_document_id: z.string().uuid().optional().or(z.literal("")),
  imported_file_id: z.string().uuid().optional().or(z.literal("")),
  appraisal_on: z.string().optional().or(z.literal("")),
  appraisal_value: Money,
  appraisal_source: Opt(200),
  balance_note: Opt(1000),
});

export async function saveLoan(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = LoanForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    if (/\d{9,}/.test([d.balance_note, d.purpose, d.lender].join(" "))) return { ok: false, error: "That looks like a full account number. Please leave it out." };
    const row = {
      direction: d.direction, counterparty: d.counterparty, lender: nul(d.lender), purpose: nul(d.purpose),
      principal: num(d.principal), rate_pct: num(d.rate_pct), status: d.status,
      gift_or_loan: nul(d.gift_or_loan) as Loan["gift_or_loan"], advance_on_inheritance: nul(d.advance_on_inheritance) as Loan["advance_on_inheritance"],
      note_signed: d.note_signed === "on", started_on: nul(d.started_on), term_months: num(d.term_months), monthly_payment: num(d.monthly_payment),
      first_payment_on: nul(d.first_payment_on), property_id: nul(d.property_id), legal_document_id: nul(d.legal_document_id), imported_file_id: nul(d.imported_file_id),
      appraisal_on: nul(d.appraisal_on), appraisal_value: num(d.appraisal_value), appraisal_source: nul(d.appraisal_source), balance_note: nul(d.balance_note),
    };
    if (v.demo) {
      const s = demoStore();
      if (id) { const l = s.loans.find((x) => x.id === id); if (!l) return { ok: false, error: "Not found." }; Object.assign(l, row); }
      else s.loans.push({ id: crypto.randomUUID(), ...row });
      bump(v.name, id ? "update" : "create", `${id ? "Updated" : "Added"} loan: ${d.counterparty}`, "loans");
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("loans").update(row).eq("id", id) : await supabase.from("loans").insert(row);
      if (error) return { ok: false, error: "Could not save the loan." };
    }
    revalidatePath("/loans"); revalidatePath("/money"); revalidatePath("/estate"); revalidatePath("/properties");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const PaymentForm = z.object({
  loan_id: z.string().uuid(),
  paid_on: z.string().min(10, "When was it paid?"),
  amount: z.coerce.number().positive("Enter the amount."),
  kind: z.enum(["payment", "interest_only", "principal_only", "forgiveness", "adjustment"]),
  note: Opt(300),
});

export async function addLoanPayment(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = PaymentForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const row = { loan_id: d.loan_id, paid_on: d.paid_on, amount: d.amount, kind: d.kind, note: nul(d.note) };
    if (v.demo) {
      demoStore().loanPayments.push({ id: crypto.randomUUID(), ...row });
      bump(v.name, "create", `Recorded a ${d.kind.replace("_", " ")} of $${d.amount}`, "loan_payments");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("loan_payments").insert(row);
      if (error) return { ok: false, error: "Could not record the payment." };
    }
    revalidatePath("/loans");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
