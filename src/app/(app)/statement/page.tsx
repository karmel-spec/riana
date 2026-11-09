import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { CollapsibleCard, Empty, PageHeader, Stat } from "@/components/ui";
import { fmtDate, fmtMoney, subjectName } from "@/lib/format";
import { balanceOn } from "@/lib/finance/amortization";
import { FigureEditor, IncomeEditor, RemoveIncomeButton } from "./statement-client";

export const metadata = { title: "Financial Statement" };

const ACCOUNT_GROUP: Record<string, "cash" | "investments" | "retirement" | "card" | "skip"> = {
  checking: "cash", savings: "cash", brokerage: "investments", retirement: "retirement", credit_card: "card", loan: "skip", other: "skip",
};

export default async function StatementPage() {
  const v = await requireSection("accounts");
  const [properties, loans, payments, accounts, vehicles, bills, policies, legal, income, filed] = await Promise.all([
    canRead(v, "properties") ? data.getProperties(v) : Promise.resolve([]), data.getLoans(v, "all"), data.getLoanPayments(v), data.getAccounts(v),
    canRead(v, "properties") ? data.getVehicles(v) : Promise.resolve([]), canRead(v, "bills") ? data.getBills(v) : Promise.resolve([]),
    canRead(v, "insurance") ? data.getPolicies(v) : Promise.resolve([]), canRead(v, "legal") ? data.getLegalDocuments(v) : Promise.resolve([]), data.getIncomeSources(v), data.getFiledDocuments(v),
  ]);
  await data.logView(v, "accounts", "statement");
  const parent = v.brief;
  const canEdit = canWrite(v, "accounts") && !parent;
  const today = new Date().toISOString().slice(0, 10);

  // --- Loan balances, the same way the ledger computes them ---------------------------
  const loanBalance = (l: (typeof loans)[number]) => {
    const paid = payments.filter((p) => p.loan_id === l.id).reduce((s, p) => s + (p.amount ?? 0), 0);
    if (l.status === "forgiven" || l.status === "paid_off") return 0;
    if (l.principal !== null && l.rate_pct !== null && l.monthly_payment && l.first_payment_on) return balanceOn({ principal: l.principal, annualRatePct: l.rate_pct, monthlyPayment: l.monthly_payment, termMonths: l.term_months ?? null, firstPaymentOn: l.first_payment_on }, today).balance;
    if (l.principal !== null) return Math.max(0, l.principal - paid);
    return null;
  };
  const receivables = loans.filter((l) => l.direction === "owed_to_estate" && l.status !== "proposed").map((l) => ({ l, bal: loanBalance(l) }));
  const debts = loans.filter((l) => l.direction === "owed_by_estate").map((l) => ({ l, bal: loanBalance(l) }));

  // --- Assets ----------------------------------------------------------------------------
  const realEstate = properties.map((p) => ({ p, value: p.estimated_value ?? null, mortgage: debts.filter((d) => d.l.property_id === p.id).reduce((s, d) => s + (d.bal ?? 0), 0) }));
  const cash = accounts.filter((a) => ACCOUNT_GROUP[a.kind] === "cash");
  const investments = accounts.filter((a) => ACCOUNT_GROUP[a.kind] === "investments");
  const retirement = accounts.filter((a) => ACCOUNT_GROUP[a.kind] === "retirement");
  const cards = accounts.filter((a) => ACCOUNT_GROUP[a.kind] === "card");
  const sum = (xs: (number | null | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);
  const known = (xs: (number | null | undefined)[]) => xs.filter((x) => x != null).length;

  const assetLines = [
    { label: "Real estate", total: sum(realEstate.map((r) => r.value)), n: realEstate.length, known: known(realEstate.map((r) => r.value)), href: "/properties" },
    { label: "Cash & bank accounts", total: sum(cash.map((a) => a.balance)), n: cash.length, known: known(cash.map((a) => a.balance)), href: "/money" },
    { label: "Investments", total: sum(investments.map((a) => a.balance)), n: investments.length, known: known(investments.map((a) => a.balance)), href: "/money" },
    { label: "Retirement & annuities", total: sum(retirement.map((a) => a.balance)), n: retirement.length, known: known(retirement.map((a) => a.balance)), href: "/money" },
    { label: "Vehicles & collector cars", total: sum(vehicles.map((x) => x.estimated_value)), n: vehicles.length, known: known(vehicles.map((x) => x.estimated_value)), href: "/vehicles" },
    { label: "Loans owed to Rich & Diana", total: sum(receivables.map((r) => r.bal)), n: receivables.length, known: known(receivables.map((r) => r.bal)), href: "/loans" },
  ];
  const liabilityLines = [
    { label: "Mortgages & home equity lines", total: sum(debts.map((d) => d.bal)), n: debts.length, known: known(debts.map((d) => d.bal)), href: "/loans" },
    { label: "Credit cards", total: sum(cards.map((a) => a.balance)), n: cards.length, known: known(cards.map((a) => a.balance)), href: "/money" },
  ];
  const totalAssets = sum(assetLines.map((a) => a.total));
  const totalLiabilities = sum(liabilityLines.map((l) => l.total));
  const netWorth = totalAssets - totalLiabilities;
  const gaps = [...assetLines, ...liabilityLines].reduce((s, l) => s + (l.n - l.known), 0);
  const liquid = sum(cash.map((a) => a.balance)) + sum(investments.map((a) => a.balance));

  // --- Cash flow ---------------------------------------------------------------------------
  const monthly = (b: (typeof bills)[number]) => b.amount == null ? null : b.frequency === "annual" ? b.amount / 12 : b.frequency === "semiannual" ? b.amount / 6 : b.frequency === "quarterly" ? b.amount / 3 : b.frequency === "one_time" ? 0 : b.amount;
  const billsMonthly = sum(bills.map(monthly));
  const billsKnown = known(bills.map((b) => b.amount));
  const debtPayments = sum(debts.map((d) => d.l.monthly_payment));
  const premiums = sum(policies.map((p) => p.premium)) / 12;
  const incomeMonthly = sum(income.map((i) => i.amount_monthly));
  const expensesMonthly = billsMonthly + debtPayments + premiums;
  const runwayMonths = expensesMonthly > 0 && liquid > 0 ? liquid / expensesMonthly : null;

  // --- Estate view -------------------------------------------------------------------------
  const outsideWill = [
    ...legal.filter((d) => d.doc_type === "tod_deed" && d.status === "recorded").map((d) => ({ what: d.title, how: "Transfer-on-death deed (recorded)", note: d.open_issue })),
    ...accounts.filter((a) => a.beneficiary_notes).map((a) => ({ what: `${a.institution}${a.last4 ? ` ····${a.last4}` : ""}`, how: a.kind === "retirement" ? "Beneficiary designation" : "POD / TOD designation", note: a.beneficiary_notes })),
  ];
  const docStatus = (type: string) => legal.filter((d) => d.doc_type === type);
  const lifeCover = policies.filter((p) => p.kind === "life");
  // Statements and ledgers on file that back these figures (2026 Widow Book money tabs, bank statements, loan statements)
  const statements = filed.filter((f) => /statement|mortgage|annuity|navy federal|foothill|glacier|social security|asset ledger|client profile|loan|promissory|cd |certificate/i.test(`${f.name} ${f.target_note ?? ""}`) && !/widow book · (health|medical|service records|dd-214|va\]|lds|burial|wills|poa|community property|health directive|insurance|titles)/i.test(f.target_note ?? "")).slice(0, 60);
  const asOf = [...accounts.map((a) => a.balance_as_of), ...properties.map((p) => p.valuation_on), ...vehicles.map((x) => x.valuation_on)].filter(Boolean).sort() as string[];

  const Line = ({ l }: { l: (typeof assetLines)[number] }) => (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <div><Link href={l.href} className="font-semibold">{l.label}</Link><div className="text-[0.85rem] text-ink-soft">{l.n === 0 ? "None recorded" : l.known === l.n ? `${l.n} item${l.n === 1 ? "" : "s"}` : `${l.known} of ${l.n} valued · ${l.n - l.known} to enter`}</div></div>
      <div className="font-semibold tabular-nums">{l.n === 0 ? "—" : fmtMoney(l.total)}</div>
    </li>
  );

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 7 · Financial statement"} title={parent ? "Where things stand" : "Personal financial statement"}
        intro={parent ? "What you own, what you owe, and what comes in and goes out each month. It updates itself from the rest of the binder." : "Assets, liabilities and net worth for Rich and Diana, built live from Properties, Vehicles, Accounts, the Loans Ledger, Bills, Insurance and Legal. Figures without a value are counted as zero and flagged, so the totals are a floor until every line is filled in."} />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total assets" value={fmtMoney(totalAssets)} note={`${assetLines.reduce((s, l) => s + l.known, 0)} valued lines`} />
        <Stat label="Total liabilities" value={fmtMoney(totalLiabilities)} note={`${liabilityLines.reduce((s, l) => s + l.known, 0)} valued lines`} tone="ember" />
        <Stat label="Net worth" value={fmtMoney(netWorth)} note={asOf.length ? `Oldest figure ${fmtDate(asOf[0], { year: "numeric" })}` : "No dated figures yet"} tone="evergreen" />
        <Stat label="Figures still to enter" value={gaps} note={gaps ? "Totals are a floor until these are in" : "Every line has a value"} tone={gaps ? "ember" : "evergreen"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CollapsibleCard title="Assets">
          <ul className="divide-y divide-rule-soft">{assetLines.map((l) => <Line key={l.label} l={l} />)}</ul>
          <div className="flex items-baseline justify-between border-t-2 border-evergreen pt-2 font-semibold"><span>Total assets</span><span className="tabular-nums">{fmtMoney(totalAssets)}</span></div>
        </CollapsibleCard>

        <CollapsibleCard title="Liabilities">
          <ul className="divide-y divide-rule-soft">{liabilityLines.map((l) => <Line key={l.label} l={l} />)}</ul>
          <div className="flex items-baseline justify-between border-t-2 border-ember pt-2 font-semibold"><span>Total liabilities</span><span className="tabular-nums">{fmtMoney(totalLiabilities)}</span></div>
          <div className="mt-2 flex items-baseline justify-between text-[1.1rem] font-semibold"><span>Net worth</span><span className="tabular-nums text-evergreen">{fmtMoney(netWorth)}</span></div>
        </CollapsibleCard>

        <CollapsibleCard title="Real estate, line by line" className="lg:col-span-2">
          {realEstate.length === 0 ? <Empty>No properties recorded.</Empty> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[0.95rem]">
              <thead className="text-left text-[0.75rem] uppercase tracking-wide text-ink-soft"><tr><th className="py-2 pr-3">Property</th><th className="py-2 pr-3 text-right">Value</th><th className="py-2 pr-3 text-right">Owed on it</th><th className="py-2 pr-3 text-right">Equity</th><th className="py-2">Passes by</th></tr></thead>
              <tbody>{realEstate.map(({ p, value, mortgage }) => (
                <tr key={p.id} className="border-t border-rule-soft">
                  <td className="py-2 pr-3"><div className="font-semibold">{p.name}</div><div className="text-[0.8rem] text-ink-soft">{value != null && p.valuation_on ? `${p.valuation_source ?? "Estimate"} · ${fmtDate(p.valuation_on, { year: "numeric" })}` : "Value to enter"}</div></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{value != null ? fmtMoney(value) : <span className="text-brass-deep">—</span>}{canEdit && <div><FigureEditor kind="property" id={p.id} label={p.name} current={value} asOf={p.valuation_on} /></div>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{mortgage ? fmtMoney(mortgage) : <span className="text-ink-soft">{debts.some((d) => d.l.property_id === p.id) ? "amount to enter" : "none"}</span>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">{value != null ? fmtMoney(value - mortgage) : "—"}</td>
                  <td className="py-2 text-[0.85rem] text-ink-soft">{p.succession_plan ? p.succession_plan.slice(0, 110) + (p.succession_plan.length > 110 ? "…" : "") : "No plan recorded"}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="Accounts, line by line">
          {accounts.length === 0 ? <Empty>No accounts recorded.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {accounts.filter((a) => ACCOUNT_GROUP[a.kind] !== "skip").map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0"><div className="font-semibold">{a.institution}{a.last4 && <span className="font-normal text-ink-soft"> ····{a.last4}</span>}</div><div className="text-[0.8rem] text-ink-soft">{a.purpose}{a.balance_as_of ? ` · as of ${fmtDate(a.balance_as_of, { year: "numeric" })}` : ""}</div></div>
                  <div className="text-right tabular-nums">{a.balance != null ? <span className={`font-semibold ${a.kind === "credit_card" ? "text-ember" : ""}`}>{a.kind === "credit_card" && a.balance > 0 ? "−" : ""}{fmtMoney(a.balance)}</span> : <span className="text-brass-deep">to enter</span>}{canEdit && <div><FigureEditor kind="account" id={a.id} label={a.institution} current={a.balance} asOf={a.balance_as_of} /></div>}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[0.85rem] text-ink-soft">Balances are last-known figures entered by the family, never pulled from the banks. Vehicle values are set on the <Link href="/vehicles">Vehicles</Link> page.</p>
        </CollapsibleCard>

        <CollapsibleCard title="Monthly cash flow">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Income" value={fmtMoney(incomeMonthly)} note={`${income.length} source${income.length === 1 ? "" : "s"}`} tone="evergreen" />
            <Stat label="Outgoings" value={fmtMoney(expensesMonthly)} note={`${billsKnown} of ${bills.length} bills priced`} tone="ember" />
            <Stat label="Net per month" value={fmtMoney(incomeMonthly - expensesMonthly)} tone={incomeMonthly - expensesMonthly >= 0 ? "evergreen" : "ember"} note={runwayMonths != null ? `${runwayMonths.toFixed(0)} months of liquid runway` : "Enter cash balances for runway"} />
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between"><div className="eyebrow">Income sources</div>{canEdit && <IncomeEditor />}</div>
            {income.length === 0 ? <p className="mt-1 text-[0.95rem] text-ink-soft">None recorded yet: VA compensation, Social Security, pensions, rental or StarLar payments, annuity payouts, loan repayments from family.</p> : (
              <ul className="mt-1 divide-y divide-rule-soft">{income.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0"><div className="font-semibold">{i.name} <span className="font-normal text-ink-soft">· {i.owner === "both" ? "Both" : subjectName(i.owner)}</span></div><div className="text-[0.85rem] text-ink-soft">{i.survivor_note ?? i.note ?? ""}</div></div>
                  <div className="flex items-center gap-2"><span className="font-semibold tabular-nums">{i.amount_monthly != null ? `${fmtMoney(i.amount_monthly)}/mo` : "amount to enter"}</span>{canEdit && <><IncomeEditor item={i} /><RemoveIncomeButton id={i.id} name={i.name} /></>}</div>
                </li>
              ))}</ul>
            )}
          </div>
          <p className="text-[0.85rem] text-ink-soft">Outgoings = priced bills (annual ones spread over 12 months) + loan payments on the ledger + insurance premiums where recorded.</p>
        </CollapsibleCard>

        <CollapsibleCard title="Estate planning view">
          <div className="eyebrow">Assets that pass outside the will</div>
          {outsideWill.length === 0 ? <p className="text-[0.95rem] text-ink-soft">None recorded.</p> : (
            <ul className="divide-y divide-rule-soft">{outsideWill.map((o, n) => <li key={n} className="py-2"><div className="font-semibold">{o.what}</div><div className="text-[0.85rem] text-ink-soft">{o.how}{o.note && ` · ${o.note}`}</div></li>)}</ul>
          )}
          <div className="eyebrow mt-3">Documents</div>
          <ul className="text-[0.95rem]">
            {[["will", "Wills"], ["trust", "Trust"], ["financial_poa", "Financial POA"], ["healthcare_poa", "Healthcare POA"], ["directive", "Directives"]].map(([t, label]) => {
              const ds = docStatus(t); const best = ds.find((d) => d.status === "recorded" || d.status === "signed") ?? ds[0];
              return <li key={t} className="flex justify-between gap-3 py-1"><span>{label}</span><span className={best?.status === "signed" || best?.status === "recorded" ? "text-evergreen" : "text-ember"}>{best ? `${best.status.replace("_", " ")}${best.signed_on ? ` ${fmtDate(best.signed_on, { year: "numeric" })}` : ""}` : "none"}</span></li>;
            })}
            <li className="flex justify-between gap-3 py-1"><span>Life insurance</span><span className={lifeCover.some((p) => p.carrier !== "None found") ? "text-evergreen" : "text-ember"}>{lifeCover.length ? lifeCover.map((p) => p.carrier).join(", ") : "none recorded"}</span></li>
          </ul>
          <div className="eyebrow mt-3">Loans to family (fairness between siblings)</div>
          {receivables.length === 0 && !loans.some((l) => l.status === "proposed") ? <p className="text-[0.95rem] text-ink-soft">None.</p> : (
            <ul className="text-[0.95rem]">{loans.filter((l) => l.direction === "owed_to_estate").map((l) => { const bal = loanBalance(l); return <li key={l.id} className="flex justify-between gap-3 py-1"><span>{l.counterparty} <span className="text-ink-soft">· {l.status}{l.advance_on_inheritance ? ` · inheritance advance: ${l.advance_on_inheritance}` : ""}</span></span><span className="tabular-nums">{bal != null ? fmtMoney(bal) : "amount to enter"}</span></li>; })}</ul>
          )}
          <p className="text-[0.85rem] text-ink-soft">Open questions live on the <Link href="/estate">Estate Plan</Link> and the <Link href="/legal">Legal board</Link>.</p>
        </CollapsibleCard>
      </div>
      {!parent && <p className="mt-6 text-[0.9rem] text-ink-soft">Nothing here is typed in twice: change a value on its own page and this statement follows. Generated {fmtDate(today, { year: "numeric" })}.</p>}

      {!parent && (
        <CollapsibleCard title={`Statements on file (${statements.length})`} defaultOpen={false} className="mt-5">
          <p className="mb-2 text-[0.9rem] text-ink-soft">The bank, loan and annuity statements behind the figures above, newest first. Every Open goes through the app’s own storage.</p>
          {statements.length === 0 ? <Empty>No statements filed yet.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {statements.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0"><div className="text-[0.95rem] font-semibold">{f.name.replace(/\.(pdf|jpe?g|png|heic|docx?)$/i, "")}</div><div className="text-[0.8rem] text-ink-soft">{f.taken_at ? fmtDate(f.taken_at.slice(0, 10), { year: "numeric" }) + " · " : ""}{(f.target_note ?? "").replace(/^\[[^\]]*\]\s*/, "").slice(0, 140)}</div></div>
                  <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      )}
    </>
  );
}
