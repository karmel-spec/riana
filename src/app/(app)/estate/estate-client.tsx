"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EstateProvision, PlanConflict } from "@/lib/types";
import { createPlanVersion, saveConflict, saveProvision } from "@/app/actions/estate";
import { FormDialog, Field } from "@/components/dialog";
import { fmtDate, fmtMoney } from "@/lib/format";
import { balanceOn, schedule } from "@/lib/finance/amortization";

const STATUS: Record<PlanConflict["status"], [string, string]> = {
  open: ["Open", "bg-ember-tint text-ember"], with_attorney: ["With attorney", "bg-brass-tint text-brass-deep"],
  decided: ["Decided", "bg-slate-tint text-slate"], resolved: ["Resolved", "bg-evergreen-tint text-evergreen"],
};

export function VersionPicker({ versions, current }: { versions: { id: string; label: string }[]; current: string }) {
  const router = useRouter();
  return (
    <label><span className="sr-only">Plan version</span>
      <select value={current} onChange={(e) => router.push(`/estate?v=${e.target.value}`)} className="field w-auto">{versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
    </label>
  );
}

export function NewVersionButton({ copyFrom }: { copyFrom: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPlanVersion, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-secondary">New version</button>;
  return (
    <FormDialog title="New plan version" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined} submitLabel="Create version">
      <input type="hidden" name="copy_from" value={copyFrom} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="nv-title" label="Title" span><input id="nv-title" name="title" required className="field" placeholder="2026 plan · after attorney meeting" /></Field>
        <Field id="nv-date" label="Plan date"><input id="nv-date" type="date" name="plan_date" required defaultValue={new Date().toISOString().slice(0, 10)} className="field" /></Field>
        <Field id="nv-docs" label="Source documents (comma-separated)"><input id="nv-docs" name="source_docs" className="field" placeholder="Attorney letter, family notes" /></Field>
        <Field id="nv-sum" label="Summary" span><textarea id="nv-sum" name="summary" rows={3} className="field" /></Field>
      </div>
      <p className="text-[0.85rem] text-ink-soft">The current version is kept and marked superseded; its provisions are copied into the new one so you can edit what changed.</p>
    </FormDialog>
  );
}

export function ProvisionEditor({ versionId, provision, documents }: { versionId: string; provision?: EstateProvision; documents: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveProvision, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const p = provision;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={p ? "btn-secondary px-3 text-[0.85rem]" : "btn-primary"}>{p ? "Edit" : "+ Add a provision"}</button>;
  return (
    <FormDialog title={p ? `Edit: ${p.subject}` : "Add a provision"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="plan_version_id" value={versionId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pv-cat" label="Kind"><select id="pv-cat" name="category" defaultValue={p?.category ?? "asset"} className="field"><option value="asset">Asset</option><option value="role">Role</option><option value="term">Term</option></select></Field>
        <Field id="pv-subj" label="Subject"><input id="pv-subj" name="subject" defaultValue={p?.subject ?? ""} required className="field" placeholder="WA rentals, Successor trustee…" /></Field>
        <Field id="pv-plan" label="What the plan says" span><textarea id="pv-plan" name="planned" rows={3} defaultValue={p?.planned ?? ""} required className="field" /></Field>
        <Field id="pv-doc" label="Signed document that implements it" span><select id="pv-doc" name="legal_document_id" defaultValue={p?.legal_document_id ?? ""} className="field"><option value="">— none yet —</option>{documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></Field>
        <Field id="pv-notes" label="Notes" span><input id="pv-notes" name="notes" defaultValue={p?.notes ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function ConflictList({ conflicts, canEdit, parent, provisions, versionId }: { conflicts: PlanConflict[]; canEdit: boolean; parent: boolean; provisions: { id: string; subject: string }[]; versionId: string | null }) {
  const [showResolved, setShowResolved] = useState(false);
  const open = conflicts.filter((c) => c.status !== "resolved");
  const resolved = conflicts.filter((c) => c.status === "resolved");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.3rem] font-semibold">{parent ? "Questions for you" : "Open questions & conflicts"} ({open.length})</h2>
        {canEdit && <ConflictEditor provisions={provisions} versionId={versionId} />}
      </div>
      {open.length === 0 ? <p className="mt-2 text-ink-soft">Nothing open.</p> : (
        <ul className="mt-3 flex flex-col gap-3">
          {open.map((c) => <ConflictRow key={c.id} c={c} canEdit={canEdit} parent={parent} provisions={provisions} versionId={versionId} />)}
        </ul>
      )}
      {resolved.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowResolved((s) => !s)} className="min-h-0 text-[0.9rem] font-semibold text-ink-soft">{showResolved ? "Hide" : "Show"} {resolved.length} resolved</button>
          {showResolved && <ul className="mt-2 flex flex-col gap-2">{resolved.map((c) => <ConflictRow key={c.id} c={c} canEdit={canEdit} parent={parent} provisions={provisions} versionId={versionId} />)}</ul>}
        </div>
      )}
    </>
  );
}

function ConflictRow({ c, canEdit, parent, provisions, versionId }: { c: PlanConflict; canEdit: boolean; parent: boolean; provisions: { id: string; subject: string }[]; versionId: string | null }) {
  const prov = provisions.find((p) => p.id === c.provision_id);
  return (
    <li className="rounded-xl border border-rule-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className={`pill ${STATUS[c.status][1]}`}>{STATUS[c.status][0]}</span>{!parent && c.owner_name && <span className="text-[0.85rem] text-ink-soft">Owner: {c.owner_name}</span>}{c.due_on && <span className="text-[0.85rem] text-ink-soft">· due {fmtDate(c.due_on)}</span>}</div>
          <div className={`mt-1 font-semibold ${parent ? "text-[1.25rem]" : "text-[1.05rem]"}`}>{c.title}</div>
          {c.detail && <p className="text-[0.95rem] text-ink-soft">{c.detail}</p>}
          {prov && <p className="text-[0.85rem] text-ink-soft">About: {prov.subject}</p>}
          {c.resolution && <p className="mt-1 rounded-lg bg-evergreen-tint/60 px-3 py-2 text-[0.95rem]"><strong>Decided:</strong> {c.resolution}</p>}
        </div>
        {canEdit && <ConflictEditor conflict={c} provisions={provisions} versionId={versionId} />}
      </div>
    </li>
  );
}

function ConflictEditor({ conflict, provisions, versionId }: { conflict?: PlanConflict; provisions: { id: string; subject: string }[]; versionId: string | null }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PlanConflict["status"]>(conflict?.status ?? "open");
  const [state, action, pending] = useActionState(saveConflict, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const c = conflict;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={c ? "btn-secondary px-3 text-[0.85rem]" : "btn-primary"}>{c ? "Update" : "+ Add a question"}</button>;
  return (
    <FormDialog title={c ? "Update question" : "Add an open question"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {c && <input type="hidden" name="id" value={c.id} />}
      {versionId && <input type="hidden" name="plan_version_id" value={c?.plan_version_id ?? versionId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cf-title" label="Question" span><input id="cf-title" name="title" defaultValue={c?.title ?? ""} required className="field" /></Field>
        <Field id="cf-detail" label="Detail" span><textarea id="cf-detail" name="detail" rows={3} defaultValue={c?.detail ?? ""} className="field" /></Field>
        <Field id="cf-owner" label="Owner"><input id="cf-owner" name="owner_name" defaultValue={c?.owner_name ?? ""} className="field" placeholder="Karmel, Heather, attorney…" /></Field>
        <Field id="cf-due" label="Due"><input id="cf-due" type="date" name="due_on" defaultValue={c?.due_on ?? ""} className="field" /></Field>
        <Field id="cf-status" label="Status"><select id="cf-status" name="status" value={status} onChange={(e) => setStatus(e.target.value as PlanConflict["status"])} className="field">{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="cf-prov" label="About which provision"><select id="cf-prov" name="provision_id" defaultValue={c?.provision_id ?? ""} className="field"><option value="">—</option>{provisions.map((p) => <option key={p.id} value={p.id}>{p.subject}</option>)}</select></Field>
        {(status === "decided" || status === "resolved") && <Field id="cf-res" label="What was decided" span><textarea id="cf-res" name="resolution" rows={2} defaultValue={c?.resolution ?? ""} className="field" required /></Field>}
      </div>
    </FormDialog>
  );
}

type NoteLoan = { id: string; counterparty: string; principal: number; rate_pct: number; monthly_payment: number; term_months: number | null; first_payment_on: string; note_signed: boolean; balance_note: string | null };

export function NoteCard({ loan, today, balance, paymentsMade, nextPaymentOn, payoff, impliedPayment }: {
  loan: NoteLoan; today: string; balance: number; paymentsMade: number; nextPaymentOn: string | null; payoff: string; impliedPayment: number | null;
}) {
  const terms = useMemo(() => ({ principal: loan.principal, annualRatePct: loan.rate_pct, monthlyPayment: loan.monthly_payment, termMonths: loan.term_months, firstPaymentOn: loan.first_payment_on }), [loan]);
  const [asOf, setAsOf] = useState(today);
  const [showSchedule, setShowSchedule] = useState(false);
  const projected = useMemo(() => balanceOn(terms, asOf), [terms, asOf]);
  const rows = useMemo(() => (showSchedule ? schedule(terms) : []), [terms, showSchedule]);
  const mismatch = impliedPayment !== null && Math.abs(impliedPayment - loan.monthly_payment) > 1;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[1.25rem] font-semibold">{loan.counterparty}</h3>
          <div className="text-[0.95rem] text-ink-soft">{fmtMoney(loan.principal)} at {loan.rate_pct}%{loan.term_months && ` · ${loan.term_months / 12} years`} · from {fmtDate(loan.first_payment_on, { year: "numeric" })}</div>
        </div>
        <span className={`pill ${loan.note_signed ? "bg-evergreen-tint text-evergreen" : "bg-ember-tint text-ember"}`}>{loan.note_signed ? "Note signed" : "Note not signed"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-parchment p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Monthly payment</div><div className="font-serif text-[1.6rem] font-semibold">{fmtMoney(loan.monthly_payment)}</div></div>
        <div className="rounded-xl bg-evergreen-tint p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Balance today</div><div className="font-serif text-[1.6rem] font-semibold text-evergreen">{fmtMoney(balance)}</div><div className="text-[0.8rem] text-ink-soft">{paymentsMade} payments made{nextPaymentOn && ` · next ${fmtDate(nextPaymentOn)}`}</div></div>
      </div>
      {mismatch && <p className="rounded-lg bg-brass-tint px-3 py-2 text-[0.9rem] text-brass-deep">The stated rate and term would give {fmtMoney(impliedPayment!)}/mo, not {fmtMoney(loan.monthly_payment)}. The schedule follows the payment actually made; see the open question.</p>}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-rule-soft p-3">
        <label className="flex flex-col"><span className="label">Balance on</span><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="field w-auto" /></label>
        <div><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Projected</div><div className="text-[1.3rem] font-semibold">{projected.paidOff ? "Paid off" : fmtMoney(projected.balance)}</div></div>
        <div className="text-[0.9rem] text-ink-soft">Paid off {fmtDate(payoff, { year: "numeric" })}</div>
      </div>
      {loan.balance_note && <p className="text-[0.9rem] text-ink-soft">{loan.balance_note}</p>}
      <button type="button" onClick={() => setShowSchedule((s) => !s)} className="min-h-0 self-start text-[0.9rem] font-semibold text-evergreen">{showSchedule ? "Hide" : "Show"} amortization schedule</button>
      {showSchedule && (
        <div className="max-h-[320px] overflow-auto rounded-xl border border-rule-soft">
          <table className="w-full text-[0.85rem]">
            <thead className="sticky top-0 bg-parchment text-left text-[0.7rem] uppercase tracking-wide text-ink-soft"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Date</th><th className="px-2 py-1 text-right">Payment</th><th className="px-2 py-1 text-right">Interest</th><th className="px-2 py-1 text-right">Principal</th><th className="px-2 py-1 text-right">Balance</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.n} className={`border-t border-rule-soft ${r.date <= today ? "" : "text-ink-soft"}`}><td className="px-2 py-1">{r.n}</td><td className="px-2 py-1">{r.date}</td><td className="px-2 py-1 text-right">{fmtMoney(r.payment)}</td><td className="px-2 py-1 text-right">{fmtMoney(r.interest)}</td><td className="px-2 py-1 text-right">{fmtMoney(r.principal)}</td><td className="px-2 py-1 text-right">{fmtMoney(r.balance)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
