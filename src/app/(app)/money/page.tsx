import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SectionCard, Stat } from "@/components/ui";
import { fmtDate, fmtMoney, relative, subjectName } from "@/lib/format";
import { BillTable, MoneyForms } from "./money-client";

export const metadata = { title: "Accounts, Bills & Loans" };

const KIND: Record<string, string> = { checking: "Checking", savings: "Savings", brokerage: "Brokerage", retirement: "Retirement", credit_card: "Credit card", loan: "Loan", other: "Other" };

export default async function MoneyPage() {
  const v = await requireSection("accounts");
  const [accounts, bills, loans] = await Promise.all([data.getAccounts(v), data.getBills(v), data.getLoans(v)]);
  await data.logView(v, "accounts");
  const parent = v.brief;
  const failed = bills.filter((b) => b.status === "failed" || b.status === "overdue");
  const month = new Date().getMonth();
  const thisMonth = bills.filter((b) => b.next_due_on && new Date(`${b.next_due_on}T12:00:00`).getMonth() === month);
  const monthTotal = thisMonth.reduce((s, b) => s + (b.amount ?? 0), 0);
  const owed = loans.filter((l) => l.direction === "owed_to_estate");

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Sections 7 & 8"} title={parent ? "Accounts & bills" : "Accounts, bills & loans"}
        intro={parent ? "Where the money is and what gets paid. Only the last four digits are ever shown." : "Institutions and purposes with last-4 digits only; bills with autopay and failed-payment alerts; money owed to the estate."}
        actions={canWrite(v, "bills") && !parent ? <MoneyForms canAddAccount={canWrite(v, "accounts")} /> : undefined} />

      {failed.length > 0 && (
        <div className="mb-6 rounded-2xl border border-ember/40 bg-ember-tint px-5 py-4">
          <strong className="text-ember">Needs attention:</strong>
          <ul className="mt-1 list-disc pl-5">
            {failed.map((b) => <li key={b.id}>{b.payee} · {fmtMoney(b.amount)} · {b.status === "failed" ? "payment failed" : "overdue"}{b.next_due_on && ` (due ${fmtDate(b.next_due_on)})`}{b.notes && ` — ${b.notes}`}</li>)}
          </ul>
        </div>
      )}

      {canRead(v, "bills") && (
        <section aria-label="This month" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Bills due this month" value={thisMonth.length} note={fmtMoney(monthTotal)} />
          <Stat label="On autopay" value={thisMonth.filter((b) => b.autopay).length} note="of this month's bills" />
          <Stat label="Failed or overdue" value={failed.length} tone={failed.length ? "ember" : "evergreen"} note={failed.length ? "see above" : "All clear"} />
          <Stat label="Owed to the estate" value={owed.length} note={owed.length ? fmtMoney(owed.reduce((s, l) => s + (l.principal ?? 0), 0)) + " principal" : "—"} />
        </section>
      )}

      <div className="flex flex-col gap-6">
        {canRead(v, "bills") && (
          <SectionCard title="Bills & utilities">
            {bills.length === 0 ? <Empty>No bills yet.</Empty> : <BillTable bills={bills} canEdit={canWrite(v, "bills") && !parent} parent={parent} />}
          </SectionCard>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Accounts">
            {accounts.length === 0 ? <Empty>No accounts yet.</Empty> : (
              <ul className="divide-y divide-rule-soft">
                {accounts.map((a) => (
                  <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className={`font-semibold ${parent ? "text-[1.2rem]" : ""}`}>{a.institution} <span className="font-normal text-ink-soft">· {KIND[a.kind]}</span></div>
                      <div className="font-mono text-ink-soft">{a.last4 ? `····${a.last4}` : "—"}</div>
                    </div>
                    <div className="text-[0.95rem] text-ink-soft">{a.purpose}{!parent && ` · ${subjectName(a.held_by)}`}</div>
                    {!parent && a.beneficiary_notes && <div className="text-[0.9rem] text-ink-soft">Beneficiary: {a.beneficiary_notes}</div>}
                    {!parent && a.notes && <div className="text-[0.9rem] text-ink-soft">{a.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[0.85rem] text-ink-soft">Full account numbers and logins are never stored here. Logins live in the family password vault, by name only.</p>
          </SectionCard>

          {!parent && (
            <SectionCard title="Money owed to the estate">
              {owed.length === 0 ? <Empty>None recorded.</Empty> : (
                <ul className="divide-y divide-rule-soft">
                  {owed.map((l) => (
                    <li key={l.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-semibold">{l.counterparty}</div>
                        <div className="font-semibold">{fmtMoney(l.principal)}{l.rate_pct !== null && <span className="font-normal text-ink-soft"> at {l.rate_pct}%</span>}</div>
                      </div>
                      <div className="text-[0.9rem]">
                        <span className={`pill ${l.status === "active" ? "bg-evergreen-tint text-evergreen" : l.status === "proposed" ? "bg-brass-tint text-brass-deep" : "bg-rule-soft text-ink-soft"}`}>{l.status}</span>
                        <span className={`pill ml-2 ${l.note_signed ? "bg-evergreen-tint text-evergreen" : "bg-ember-tint text-ember"}`}>{l.note_signed ? "Note signed" : "Note not signed"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[0.85rem] text-ink-soft">These are tracked so the estate can account for them fairly. The promissory notes themselves are on the Legal board.</p>
            </SectionCard>
          )}
        </div>
      </div>
      {!parent && <p className="mt-6 text-[0.9rem] text-ink-soft">Next due dates roll forward automatically when a recurring bill is marked paid. Last updated {relative(new Date().toISOString())}.</p>}
    </>
  );
}
