"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Loan, LoanPayment } from "@/lib/types";
import { addLoanPayment, saveLoan } from "@/app/actions/loans";
import { FormDialog, Field } from "@/components/dialog";
import { fmtDate, fmtMoney } from "@/lib/format";
import { LegalStatusPill } from "@/components/ui";

type Ref = { id: string; name?: string; title?: string };
const STATUS: Record<Loan["status"], [string, string]> = {
  proposed: ["Proposed", "bg-brass-tint text-brass-deep"], unclassified: ["Gift or loan?", "bg-ember-tint text-ember"],
  active: ["Active", "bg-evergreen-tint text-evergreen"], paid_off: ["Paid off", "bg-rule-soft text-ink-soft"], forgiven: ["Forgiven", "bg-slate-tint text-slate"],
};
const KIND: Record<LoanPayment["kind"], string> = { payment: "Payment", interest_only: "Interest only", principal_only: "Principal", forgiveness: "Forgiven", adjustment: "Adjustment" };

export function LoanCard({ loan, payments, paid, balance, method, doc, file, property, canEdit, parent, properties, documents, files }: {
  loan: Loan; payments: LoanPayment[]; paid: number; balance: number | null; method: "schedule" | "ledger" | "none";
  doc: { id: string; title: string; status: "not_started" | "drafted" | "signed" | "recorded" | "superseded" } | null;
  file: { id: string; name: string; web_view_link: string | null } | null; property: { id: string; name: string } | null;
  canEdit: boolean; parent: boolean; properties: Ref[]; documents: Ref[]; files: Ref[];
}) {
  const [showPayments, setShowPayments] = useState(false);
  const owedBy = loan.direction === "owed_by_estate";
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`font-semibold leading-tight ${parent ? "text-[1.35rem]" : "text-[1.2rem]"}`}>{loan.counterparty}</h3>
          <div className="text-[0.95rem] text-ink-soft">
            {loan.purpose && `${loan.purpose} · `}{loan.principal !== null && fmtMoney(loan.principal)}{loan.rate_pct !== null ? ` at ${loan.rate_pct}%` : " · no interest stated"}
            {loan.term_months && ` · ${loan.term_months / 12} yrs`}{loan.started_on && ` · from ${fmtDate(loan.started_on, { year: "numeric" })}`}
            {property && <> · <Link href="/properties">{property.name}</Link></>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`pill ${STATUS[loan.status][1]}`}>{STATUS[loan.status][0]}</span>
          {!parent && <span className={`pill ${loan.note_signed ? "bg-evergreen-tint text-evergreen" : "bg-ember-tint text-ember"}`}>{loan.note_signed ? "Note signed" : "Not signed"}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-evergreen-tint p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Balance today</div><div className="font-serif text-[1.5rem] font-semibold text-evergreen">{balance === null ? "—" : fmtMoney(balance)}</div><div className="text-[0.8rem] text-ink-soft">{method === "schedule" ? "from the amortization schedule" : method === "ledger" ? `${fmtMoney(paid)} repaid` : "no principal recorded"}</div></div>
        <div className="rounded-xl bg-parchment p-3">
          {owedBy && loan.appraisal_value ? (<><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Appraisal</div><div className="font-serif text-[1.5rem] font-semibold">{fmtMoney(loan.appraisal_value)}</div><div className="text-[0.8rem] text-ink-soft">{loan.appraisal_source} · {fmtDate(loan.appraisal_on, { year: "numeric" })}</div></>)
          : loan.monthly_payment ? (<><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Monthly</div><div className="font-serif text-[1.5rem] font-semibold">{fmtMoney(loan.monthly_payment)}</div><div className="text-[0.8rem] text-ink-soft">{loan.first_payment_on && `since ${fmtDate(loan.first_payment_on, { year: "numeric" })}`}</div></>)
          : (<><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Payments</div><div className="font-serif text-[1.5rem] font-semibold">{payments.length}</div><div className="text-[0.8rem] text-ink-soft">{payments.length ? `last ${fmtDate(payments[payments.length - 1].paid_on, { year: "numeric" })}` : "none recorded"}</div></>)}
        </div>
      </div>

      {!parent && !owedBy && (
        <div className="flex flex-wrap gap-2 text-[0.85rem]">
          {loan.gift_or_loan && <span className={`rounded-md px-2 py-0.5 ${loan.gift_or_loan === "undecided" ? "bg-ember-tint text-ember" : "bg-parchment text-ink-soft"}`}>Gift or loan: <strong>{loan.gift_or_loan}</strong></span>}
          {loan.advance_on_inheritance && <span className={`rounded-md px-2 py-0.5 ${loan.advance_on_inheritance === "undecided" ? "bg-ember-tint text-ember" : "bg-parchment text-ink-soft"}`}>Advance on inheritance: <strong>{loan.advance_on_inheritance}</strong></span>}
        </div>
      )}

      {!parent && (
        <div className="text-[0.9rem]">
          <span className="font-semibold text-ink-soft">Document: </span>
          {doc ? <><Link href="/legal">{doc.title}</Link> <LegalStatusPill status={doc.status} /></> : file ? <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer">{file.name}</a> : <span className="text-ember">none linked</span>}
        </div>
      )}
      {loan.balance_note && <p className="text-[0.9rem] text-ink-soft">{loan.balance_note}</p>}

      <div className="flex flex-wrap gap-2">
        {payments.length > 0 && <button type="button" onClick={() => setShowPayments((s) => !s)} className="min-h-0 text-[0.9rem] font-semibold text-evergreen">{showPayments ? "Hide" : "Show"} {payments.length} payment{payments.length > 1 ? "s" : ""}</button>}
        {canEdit && <><PaymentButton loanId={loan.id} /><LoanEditor loan={loan} properties={properties} documents={documents} files={files} /></>}
      </div>
      {showPayments && (
        <table className="w-full text-[0.85rem]"><thead className="text-left text-[0.7rem] uppercase tracking-wide text-ink-soft"><tr><th className="py-1">Date</th><th className="py-1">Kind</th><th className="py-1 text-right">Amount</th><th className="py-1">Note</th></tr></thead>
          <tbody>{payments.map((p) => <tr key={p.id} className="border-t border-rule-soft"><td className="py-1">{fmtDate(p.paid_on, { year: "numeric" })}</td><td className="py-1">{KIND[p.kind]}</td><td className="py-1 text-right">{fmtMoney(p.amount)}</td><td className="py-1 text-ink-soft">{p.note}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function PaymentButton({ loanId }: { loanId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addLoanPayment, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 text-[0.9rem]">Record a payment</button>;
  return (
    <FormDialog title="Record a payment" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="loan_id" value={loanId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lp-date" label="Paid on"><input id="lp-date" type="date" name="paid_on" required defaultValue={new Date().toISOString().slice(0, 10)} className="field" /></Field>
        <Field id="lp-amt" label="Amount"><input id="lp-amt" name="amount" type="number" step="0.01" inputMode="decimal" required className="field" /></Field>
        <Field id="lp-kind" label="Kind"><select id="lp-kind" name="kind" defaultValue="payment" className="field">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="lp-note" label="Note"><input id="lp-note" name="note" className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function LoanEditor({ loan, properties, documents, files }: { loan?: Loan; properties: Ref[]; documents: Ref[]; files: Ref[] }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Loan["direction"]>(loan?.direction ?? "owed_to_estate");
  const [state, action, pending] = useActionState(saveLoan, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const l = loan;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={l ? "btn-secondary px-3 text-[0.9rem]" : "btn-primary"}>{l ? "Edit" : "+ Add a loan"}</button>;
  const owedBy = direction === "owed_by_estate";
  return (
    <FormDialog title={l ? `Edit: ${l.counterparty}` : "Add a loan"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ln-dir" label="Direction"><select id="ln-dir" name="direction" value={direction} onChange={(e) => setDirection(e.target.value as Loan["direction"])} className="field"><option value="owed_to_estate">Owed to the estate (we lent it)</option><option value="owed_by_estate">Owed by the estate (mortgage)</option></select></Field>
        <Field id="ln-cp" label={owedBy ? "Lender" : "Borrower"}><input id="ln-cp" name="counterparty" defaultValue={l?.counterparty ?? ""} required className="field" /></Field>
        {owedBy && <input type="hidden" name="lender" value={l?.lender ?? ""} />}
        <Field id="ln-purpose" label="Purpose" span><input id="ln-purpose" name="purpose" defaultValue={l?.purpose ?? ""} className="field" placeholder="casita, rental purchase…" /></Field>
        <Field id="ln-principal" label="Principal"><input id="ln-principal" name="principal" type="number" step="0.01" inputMode="decimal" defaultValue={l?.principal ?? ""} className="field" /></Field>
        <Field id="ln-rate" label="Rate %"><input id="ln-rate" name="rate_pct" type="number" step="0.001" inputMode="decimal" defaultValue={l?.rate_pct ?? ""} className="field" /></Field>
        <Field id="ln-status" label="Status"><select id="ln-status" name="status" defaultValue={l?.status ?? "proposed"} className="field">{Object.entries(STATUS).map(([k, [lab]]) => <option key={k} value={k}>{lab}</option>)}</select></Field>
        <Field id="ln-start" label="Started"><input id="ln-start" type="date" name="started_on" defaultValue={l?.started_on ?? ""} className="field" /></Field>
        {!owedBy && <>
          <Field id="ln-gol" label="Gift or loan?"><select id="ln-gol" name="gift_or_loan" defaultValue={l?.gift_or_loan ?? "loan"} className="field"><option value="loan">Loan</option><option value="gift">Gift</option><option value="undecided">Undecided</option></select></Field>
          <Field id="ln-adv" label="Advance on inheritance?"><select id="ln-adv" name="advance_on_inheritance" defaultValue={l?.advance_on_inheritance ?? "undecided"} className="field"><option value="undecided">Undecided (open question)</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
        </>}
        <Field id="ln-term" label="Term (months)"><input id="ln-term" name="term_months" type="number" inputMode="numeric" defaultValue={l?.term_months ?? ""} className="field" /></Field>
        <Field id="ln-pay" label="Monthly payment"><input id="ln-pay" name="monthly_payment" type="number" step="0.01" inputMode="decimal" defaultValue={l?.monthly_payment ?? ""} className="field" /></Field>
        <Field id="ln-first" label="First payment"><input id="ln-first" type="date" name="first_payment_on" defaultValue={l?.first_payment_on ?? ""} className="field" /></Field>
        <label className="flex min-h-[44px] items-center gap-2 self-end font-semibold"><input type="checkbox" name="note_signed" defaultChecked={l?.note_signed ?? false} className="h-5 w-5 accent-evergreen" /> Note is signed</label>
        {owedBy && <>
          <Field id="ln-prop" label="Property" span><select id="ln-prop" name="property_id" defaultValue={l?.property_id ?? ""} className="field"><option value="">—</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field id="ln-apon" label="Appraisal date"><input id="ln-apon" type="date" name="appraisal_on" defaultValue={l?.appraisal_on ?? ""} className="field" /></Field>
          <Field id="ln-apval" label="Appraised value"><input id="ln-apval" name="appraisal_value" type="number" step="1" inputMode="decimal" defaultValue={l?.appraisal_value ?? ""} className="field" /></Field>
          <Field id="ln-apsrc" label="Appraisal source" span><input id="ln-apsrc" name="appraisal_source" defaultValue={l?.appraisal_source ?? ""} className="field" placeholder="Lender AVM package" /></Field>
        </>}
        <Field id="ln-doc" label="Legal document"><select id="ln-doc" name="legal_document_id" defaultValue={l?.legal_document_id ?? ""} className="field"><option value="">—</option>{documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></Field>
        <Field id="ln-file" label="Imported file"><select id="ln-file" name="imported_file_id" defaultValue={l?.imported_file_id ?? ""} className="field"><option value="">—</option>{files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
        <Field id="ln-note" label="Notes" span><textarea id="ln-note" name="balance_note" rows={2} defaultValue={l?.balance_note ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}
