"use client";

import { useActionState, useState } from "react";
import type { InsurancePolicy, TaxRecord } from "@/lib/types";
import { savePolicy, saveTaxRecord } from "@/app/actions/property";
import { FormDialog, Field } from "@/components/dialog";

const KINDS: [string, string][] = [
  ["auto", "Auto"], ["home", "Homeowners"], ["classic_car", "Classic car"], ["umbrella", "Umbrella"], ["landlord", "Landlord (rentals)"],
  ["medicare", "Medicare"], ["supplemental", "Medicare supplement / Advantage"], ["champva", "CHAMPVA"], ["life", "Life"], ["other", "Other"],
];

export function PolicyEditor({ policy, agents }: { policy?: InsurancePolicy; agents: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(savePolicy, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const p = policy;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={p ? "btn-secondary px-4 text-[0.95rem]" : "btn-primary"}>{p ? "Edit" : "+ Add a policy"}</button>;
  return (
    <FormDialog title={p ? "Edit policy" : "Add a policy"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="po-kind" label="Type"><select id="po-kind" name="kind" defaultValue={p?.kind ?? "auto"} className="field">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="po-carrier" label="Company"><input id="po-carrier" name="carrier" defaultValue={p?.carrier ?? ""} required className="field" /></Field>
        <Field id="po-insured" label="Covers"><select id="po-insured" name="insured" defaultValue={p?.insured ?? "both"} className="field"><option value="both">Rich & Diana</option><option value="rich">Rich</option><option value="diana">Diana</option></select></Field>
        <Field id="po-last4" label="Policy no. (last 4)"><input id="po-last4" name="policy_last4" defaultValue={p?.policy_last4 ?? ""} maxLength={4} className="field font-mono" /></Field>
        <Field id="po-prem" label="Premium per year"><input id="po-prem" name="premium" type="number" step="0.01" inputMode="decimal" defaultValue={p?.premium ?? ""} className="field" /></Field>
        <Field id="po-renew" label="Renews on"><input id="po-renew" type="date" name="renews_on" defaultValue={p?.renews_on ?? ""} className="field" /></Field>
        <Field id="po-agent" label="Agent" span><select id="po-agent" name="agent_person_id" defaultValue={p?.agent_person_id ?? ""} className="field"><option value="">—</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field id="po-notes" label="Notes" span><textarea id="po-notes" name="notes" rows={2} defaultValue={p?.notes ?? ""} className="field" placeholder="Coverage limits, where the cards are, beneficiary…" /></Field>
      </div>
      <p className="text-[0.85rem] text-ink-soft">Only the last 4 of the policy number is kept here.</p>
    </FormDialog>
  );
}

export function TaxEditor({ record }: { record?: TaxRecord }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveTaxRecord, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const t = record;
  const thisYear = new Date().getFullYear() - 1;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={t ? "btn-secondary px-3 text-[0.9rem]" : "btn-secondary"}>{t ? "Edit" : "+ Add a tax record"}</button>;
  return (
    <FormDialog title={t ? "Edit tax record" : "Add a tax record"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tx-year" label="Tax year"><input id="tx-year" name="tax_year" type="number" inputMode="numeric" defaultValue={t?.tax_year ?? thisYear} required className="field" /></Field>
        <Field id="tx-kind" label="Type"><select id="tx-kind" name="kind" defaultValue={t?.kind ?? "federal"} className="field"><option value="federal">Federal return</option><option value="state">State return</option><option value="property">Property tax</option><option value="exemption">Exemption</option><option value="other">Other</option></select></Field>
        <Field id="tx-status" label="Status"><input id="tx-status" name="status" defaultValue={t?.status ?? ""} required className="field" placeholder="Filed, Not started, Extension…" /></Field>
        <Field id="tx-filed" label="Filed on"><input id="tx-filed" type="date" name="filed_on" defaultValue={t?.filed_on ?? ""} className="field" /></Field>
        <Field id="tx-prep" label="Preparer" span><input id="tx-prep" name="preparer" defaultValue={t?.preparer ?? ""} className="field" /></Field>
        <Field id="tx-notes" label="Notes" span><textarea id="tx-notes" name="notes" rows={2} defaultValue={t?.notes ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}
