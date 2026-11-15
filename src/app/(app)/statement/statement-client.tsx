"use client";

import { useActionState, useState, useTransition } from "react";
import type { IncomeSource } from "@/lib/types";
import { deleteIncomeSource, saveIncomeSource, setAccountBalance, setPropertyValue } from "@/app/actions/statement";
import { FormDialog, Field } from "@/components/dialog";

/** Inline "enter a figure" control for an account balance or a property value. */
export function FigureEditor({ kind, id, label, current, asOf }: { kind: "account" | "property"; id: string; label: string; current: number | null | undefined; asOf?: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(kind === "account" ? setAccountBalance : setPropertyValue, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`btn min-h-0 px-2 text-[0.85rem] ${current == null ? "text-brass-deep" : "text-ink-soft"}`}>{current == null ? "Enter" : "Update"}</button>;
  const field = kind === "account" ? "balance" : "estimated_value";
  return (
    <FormDialog title={`${kind === "account" ? "Balance" : "Estimated value"}: ${label}`} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fg-amt" label={kind === "account" ? "Balance (credit cards: amount owed)" : "Estimated value"}><input id="fg-amt" name={field} type="number" step="0.01" inputMode="decimal" defaultValue={current ?? ""} className="field" /></Field>
        <Field id="fg-on" label="As of"><input id="fg-on" type="date" name={kind === "account" ? "balance_as_of" : "valuation_on"} defaultValue={asOf ?? new Date().toISOString().slice(0, 10)} className="field" /></Field>
        {kind === "property" && <Field id="fg-src" label="Source" span><input id="fg-src" name="valuation_source" className="field" placeholder="Zillow, county assessor, appraisal, family estimate" /></Field>}
      </div>
    </FormDialog>
  );
}

const KINDS: [IncomeSource["kind"], string][] = [["va", "VA compensation"], ["social_security", "Social Security"], ["pension", "Pension"], ["rental", "Rental / StarLar payments"], ["annuity", "Annuity"], ["loan_repayment", "Loan repayment from family"], ["other", "Other"]];

export function IncomeEditor({ item }: { item?: IncomeSource }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveIncomeSource, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const i = item;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={i ? "btn min-h-0 px-2 text-[0.85rem] text-ink-soft" : "btn-secondary px-3 text-[0.9rem]"}>{i ? "Edit" : "+ Add income"}</button>;
  return (
    <FormDialog title={i ? `Edit: ${i.name}` : "Add an income source"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {i && <input type="hidden" name="id" value={i.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="in-name" label="Name" span><input id="in-name" name="name" required defaultValue={i?.name ?? ""} className="field" placeholder="VA disability compensation" /></Field>
        <Field id="in-kind" label="Kind"><select id="in-kind" name="kind" defaultValue={i?.kind ?? "other"} className="field">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="in-owner" label="Whose"><select id="in-owner" name="owner" defaultValue={i?.owner ?? "both"} className="field"><option value="rich">Rich</option><option value="diana">Diana</option><option value="both">Both</option></select></Field>
        <Field id="in-amt" label="Amount per month"><input id="in-amt" name="amount_monthly" type="number" step="0.01" inputMode="decimal" defaultValue={i?.amount_monthly ?? ""} className="field" /></Field>
        <Field id="in-tax" label="Taxable"><label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="taxable" defaultChecked={i?.taxable ?? false} className="h-4 w-4 accent-evergreen" />Taxable income</label></Field>
        <Field id="in-surv" label="What happens at the first death" span><input id="in-surv" name="survivor_note" defaultValue={i?.survivor_note ?? ""} className="field" placeholder="Stops; survivor keeps the larger benefit; continues per schedule…" /></Field>
        <Field id="in-note" label="Note" span><input id="in-note" name="note" defaultValue={i?.note ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function RemoveIncomeButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remove "${name}"?`)) start(() => { deleteIncomeSource(id); }); }} className="btn min-h-0 px-2 text-[0.85rem] text-ember">Remove</button>;
}
