import Link from "next/link";
import { requireSection, canWrite, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { Empty, PageHeader, Stat } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import { balanceOn } from "@/lib/finance/amortization";
import { LoanCard, LoanEditor } from "./loans-client";

export const metadata = { title: "Loans Ledger" };

export default async function LoansPage() {
  const v = await requireSection("accounts");
  const [loans, payments, legal, properties, imported] = await Promise.all([
    data.getLoans(v, "all"), data.getLoanPayments(v), data.getLegalDocuments(v), data.getProperties(v),
    v.role === "super_admin" ? listImportedFiles(v) : Promise.resolve([]),
  ]);
  await data.logView(v, "accounts", "loans");
  const parent = v.role === "parent";
  const canEdit = canWrite(v, "accounts") && !parent;
  const today = new Date().toISOString().slice(0, 10);

  const enrich = (l: (typeof loans)[number]) => {
    const pays = payments.filter((p) => p.loan_id === l.id);
    const paid = pays.filter((p) => p.kind !== "interest_only").reduce((s, p) => s + p.amount, 0);
    let balance: number | null = null; let method: "schedule" | "ledger" | "none" = "none";
    if (l.monthly_payment && l.first_payment_on && l.rate_pct !== null && l.principal) {
      balance = balanceOn({ principal: l.principal, annualRatePct: l.rate_pct, monthlyPayment: l.monthly_payment, termMonths: l.term_months ?? null, firstPaymentOn: l.first_payment_on }, today).balance; method = "schedule";
    } else if (l.principal !== null) { balance = Math.max(0, l.principal - paid); method = "ledger"; }
    if (l.status === "forgiven" || l.status === "paid_off") balance = 0;
    const doc = legal.find((d) => d.id === l.legal_document_id) ?? null;
    const file = imported.find((f) => f.id === l.imported_file_id) ?? null;
    const prop = properties.find((p) => p.id === l.property_id) ?? null;
    return { loan: l, payments: pays, paid, balance, method, doc: doc ? { id: doc.id, title: doc.title, status: doc.status } : null, file: file ? { id: file.id, name: file.name, web_view_link: file.web_view_link } : null, property: prop ? { id: prop.id, name: prop.name } : null };
  };
  const owedTo = loans.filter((l) => l.direction === "owed_to_estate").map(enrich);
  const owedBy = loans.filter((l) => l.direction === "owed_by_estate").map(enrich);
  const sum = (xs: ReturnType<typeof enrich>[]) => xs.reduce((s, x) => s + (x.balance ?? 0), 0);
  const undecided = loans.filter((l) => l.status === "unclassified" || l.gift_or_loan === "undecided" || l.advance_on_inheritance === "undecided");

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Sections 7 & 11"} title={parent ? "Money lent and owed" : "Loans ledger"}
        intro={parent ? "What you've lent to the kids and to StarLar, and what's owed on the rentals." : "Every loan owed to or by the estate: parties, terms, payments, computed balance, and the document behind it. Undecided questions (gift or loan? advance on inheritance?) feed the Estate Plan."}
        actions={canEdit ? <LoanEditor properties={properties.map((p) => ({ id: p.id, name: p.name }))} documents={legal.map((d) => ({ id: d.id, title: d.title }))} files={imported.map((f) => ({ id: f.id, name: f.name }))} /> : undefined} />

      {!parent && (
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Owed to the estate" value={fmtMoney(sum(owedTo))} note={`${owedTo.length} loans · balance today`} tone="evergreen" />
          <Stat label="Owed by the estate" value={fmtMoney(sum(owedBy))} note={`${owedBy.length} mortgages`} />
          <Stat label="Notes not signed" value={loans.filter((l) => !l.note_signed && l.status !== "forgiven").length} tone={loans.some((l) => !l.note_signed && l.status === "active") ? "ember" : "ink"} note="active or proposed" />
          <Stat label="Undecided" value={undecided.length} tone={undecided.length ? "ember" : "evergreen"} note="gift/loan or inheritance" href="/estate" />
        </section>
      )}

      {undecided.length > 0 && !parent && (
        <div className="mb-6 rounded-2xl border border-brass-deep/40 bg-brass-tint px-5 py-4 text-[0.95rem]">
          <strong className="text-brass-deep">To decide:</strong> {undecided.map((l) => l.counterparty).join(", ")}. Each is tracked as an open question on the <Link href="/estate">Estate Plan</Link>.
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-[1.4rem] font-semibold">Owed to {parent ? "you" : "the estate"}</h2>
        {owedTo.length === 0 ? <Empty>None recorded.</Empty> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {owedTo.map((x) => <LoanCard key={x.loan.id} {...x} canEdit={canEdit} parent={parent} properties={properties.map((p) => ({ id: p.id, name: p.name }))} documents={legal.map((d) => ({ id: d.id, title: d.title }))} files={imported.map((f) => ({ id: f.id, name: f.name }))} />)}
          </div>
        )}
      </section>

      {canRead(v, "properties") && (
        <section>
          <h2 className="mb-3 text-[1.4rem] font-semibold">Owed by {parent ? "you" : "the estate"} (mortgages)</h2>
          {owedBy.length === 0 ? <Empty>None recorded.</Empty> : (
            <div className="grid gap-4 lg:grid-cols-2">
              {owedBy.map((x) => <LoanCard key={x.loan.id} {...x} canEdit={canEdit} parent={parent} properties={properties.map((p) => ({ id: p.id, name: p.name }))} documents={legal.map((d) => ({ id: d.id, title: d.title }))} files={imported.map((f) => ({ id: f.id, name: f.name }))} />)}
            </div>
          )}
        </section>
      )}
    </>
  );
}
