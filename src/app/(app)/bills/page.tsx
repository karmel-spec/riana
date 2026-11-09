import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SectionCard, Stat } from "@/components/ui";
import { fmtDate, fmtMoney, relative } from "@/lib/format";
import { BillTable, MoneyForms } from "../money/money-client";

export const metadata = { title: "Bills" };

export default async function BillsPage() {
  const v = await requireSection("bills");
  const bills = await data.getBills(v);
  await data.logView(v, "bills");
  const parent = v.brief;
  const failed = bills.filter((b) => b.status === "failed" || b.status === "overdue");
  const month = new Date().getMonth();
  const thisMonth = bills.filter((b) => b.next_due_on && new Date(`${b.next_due_on}T12:00:00`).getMonth() === month);
  const monthTotal = thisMonth.reduce((s, b) => s + (b.amount ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 8"} title={parent ? "Bills" : "Bills & utilities"}
        intro={parent ? "What gets paid, when, and whether it pays itself." : "Every recurring bill: payee, amount, due date, autopay, and failed-payment alerts. Next due dates roll forward when a bill is marked paid."}
        actions={canWrite(v, "bills") && !parent ? <MoneyForms only="bill" canAddAccount={false} /> : undefined} />

      {failed.length > 0 && (
        <div className="mb-6 rounded-2xl border border-ember/40 bg-ember-tint px-5 py-4">
          <strong className="text-ember">Needs attention:</strong>
          <ul className="mt-1 list-disc pl-5">
            {failed.map((b) => <li key={b.id}>{b.payee} · {fmtMoney(b.amount)} · {b.status === "failed" ? "payment failed" : "overdue"}{b.next_due_on && ` (due ${fmtDate(b.next_due_on)})`}{b.notes && ` — ${b.notes}`}</li>)}
          </ul>
        </div>
      )}

      <section aria-label="This month" className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Bills due this month" value={thisMonth.length} note={fmtMoney(monthTotal)} />
        <Stat label="On autopay" value={thisMonth.filter((b) => b.autopay).length} note="of this month's bills" />
        <Stat label="Failed or overdue" value={failed.length} tone={failed.length ? "ember" : "evergreen"} note={failed.length ? "see above" : "All clear"} />
      </section>

      <SectionCard title="All bills">
        {bills.length === 0 ? <Empty>No bills yet.</Empty> : <BillTable bills={bills} canEdit={canWrite(v, "bills") && !parent} parent={parent} />}
      </SectionCard>
      {!parent && <p className="mt-6 text-[0.9rem] text-ink-soft">Last updated {relative(new Date().toISOString())}.</p>}
    </>
  );
}
