"use client";

import { useActionState, useState, useTransition } from "react";
import type { Bill } from "@/lib/types";
import { addAccount, addBill, setBillStatus } from "@/app/actions/money";
import { fmtDate, fmtMoney, relative } from "@/lib/format";
import { SourceTag } from "@/components/ui";
import { Close } from "@/components/icons";

const STATUS: Record<Bill["status"], [string, string]> = {
  upcoming: ["Upcoming", "bg-slate-tint text-slate"],
  paid: ["Paid", "bg-evergreen-tint text-evergreen"],
  failed: ["Failed", "bg-ember-tint text-ember"],
  overdue: ["Overdue", "bg-ember-tint text-ember"],
};
const FREQ: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", semiannual: "Twice a year", annual: "Yearly", one_time: "One time" };

export function BillTable({ bills, canEdit, parent }: { bills: Bill[]; canEdit: boolean; parent: boolean }) {
  const [, start] = useTransition();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[0.95rem]">
        <thead className="text-left text-[0.8rem] uppercase tracking-wide text-ink-soft">
          <tr><th className="py-2 pr-3">Payee</th><th className="py-2 pr-3">Due</th><th className="py-2 pr-3 text-right">Amount</th><th className="py-2 pr-3">Autopay</th><th className="py-2 pr-3">Status</th>{canEdit && <th className="py-2"></th>}</tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className="border-t border-rule-soft">
              <td className="py-2.5 pr-3"><div className="font-semibold">{b.payee}</div><div className="text-[0.85rem] text-ink-soft">{[b.category, FREQ[b.frequency]].filter(Boolean).join(" · ")}{b.notes && !parent && ` · ${b.notes}`} <SourceTag source={b.source} /></div></td>
              <td className="whitespace-nowrap py-2.5 pr-3">{b.next_due_on ? <>{fmtDate(b.next_due_on)}<div className="text-[0.85rem] text-ink-soft">{relative(b.next_due_on)}</div></> : "—"}</td>
              <td className="whitespace-nowrap py-2.5 pr-3 text-right font-semibold">{fmtMoney(b.amount)}</td>
              <td className="py-2.5 pr-3">{b.autopay ? "Yes" : <span className="font-semibold text-brass-deep">Manual</span>}</td>
              <td className="py-2.5 pr-3"><span className={`pill ${STATUS[b.status][1]}`}>{STATUS[b.status][0]}</span></td>
              {canEdit && (
                <td className="py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    {b.status !== "paid" && <button type="button" onClick={() => start(() => { setBillStatus(b.id, "paid"); })} className="btn-secondary px-3 text-[0.85rem]">Mark paid</button>}
                    {b.status === "upcoming" && <button type="button" onClick={() => start(() => { setBillStatus(b.id, "failed"); })} className="btn px-2 text-[0.85rem] text-ink-soft">Failed</button>}
                    {(b.status === "failed" || b.status === "overdue") && <button type="button" onClick={() => start(() => { setBillStatus(b.id, "upcoming"); })} className="btn px-2 text-[0.85rem] text-ink-soft">Clear</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MoneyForms({ canAddAccount }: { canAddAccount: boolean }) {
  const [open, setOpen] = useState<"bill" | "account" | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen("bill")} className="btn-primary">+ Add a bill</button>
      {canAddAccount && <button type="button" onClick={() => setOpen("account")} className="btn-secondary">+ Add an account</button>}
      {open === "bill" && <BillDialog close={() => setOpen(null)} />}
      {open === "account" && <AccountDialog close={() => setOpen(null)} />}
    </>
  );
}

function Shell({ title, close, children, action, pending, error }: { title: string; close: () => void; children: React.ReactNode; action: (f: FormData) => void; pending: boolean; error?: string }) {
  return (
    <div role="dialog" aria-labelledby="mf-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <form action={action} className="card flex max-h-[95dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 id="mf-title" className="text-[1.4rem] font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        {children}
        {error && <p className="text-ember">{error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={close} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function BillDialog({ close }: { close: () => void }) {
  const [state, action, pending] = useActionState(addBill, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) close(); }
  return (
    <Shell title="Add a bill" close={close} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <div><label htmlFor="b-payee" className="label">Payee</label><input id="b-payee" name="payee" required className="field" placeholder="Electric company" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="b-cat" className="label">Category</label><input id="b-cat" name="category" className="field" placeholder="Utilities" /></div>
        <div><label htmlFor="b-amt" className="label">Amount</label><input id="b-amt" name="amount" type="number" step="0.01" inputMode="decimal" className="field" /></div>
        <div><label htmlFor="b-freq" className="label">How often</label>
          <select id="b-freq" name="frequency" className="field" defaultValue="monthly">{Object.entries(FREQ).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label htmlFor="b-due" className="label">Next due</label><input id="b-due" type="date" name="next_due_on" className="field" /></div>
      </div>
      <label className="flex min-h-[44px] items-center gap-2 font-semibold"><input type="checkbox" name="autopay" className="h-5 w-5 accent-evergreen" /> On autopay</label>
      <div><label htmlFor="b-notes" className="label">Notes</label><input id="b-notes" name="notes" className="field" placeholder="Paid from checking ····1234" /></div>
    </Shell>
  );
}

function AccountDialog({ close }: { close: () => void }) {
  const [state, action, pending] = useActionState(addAccount, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) close(); }
  return (
    <Shell title="Add an account" close={close} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <div><label htmlFor="a-inst" className="label">Bank or company</label><input id="a-inst" name="institution" required className="field" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="a-kind" className="label">Type</label>
          <select id="a-kind" name="kind" className="field" defaultValue="checking"><option value="checking">Checking</option><option value="savings">Savings</option><option value="brokerage">Brokerage</option><option value="retirement">Retirement</option><option value="credit_card">Credit card</option><option value="loan">Loan</option><option value="other">Other</option></select></div>
        <div><label htmlFor="a-last4" className="label">Last 4 digits</label><input id="a-last4" name="last4" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" className="field font-mono" placeholder="1234" /></div>
        <div><label htmlFor="a-held" className="label">Whose</label>
          <select id="a-held" name="held_by" className="field" defaultValue="both"><option value="both">Joint</option><option value="rich">Rich</option><option value="diana">Diana</option></select></div>
        <div><label htmlFor="a-purpose" className="label">Purpose</label><input id="a-purpose" name="purpose" className="field" placeholder="Everyday bills" /></div>
      </div>
      <div><label htmlFor="a-ben" className="label">Beneficiary / POD notes</label><input id="a-ben" name="beneficiary_notes" className="field" /></div>
      <div><label htmlFor="a-notes" className="label">Notes</label><input id="a-notes" name="notes" className="field" /></div>
      <p className="text-[0.85rem] text-ink-soft">Only the last 4 digits are accepted. The full number stays with the bank and in the password vault.</p>
    </Shell>
  );
}
