import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { CollapsibleCard, Empty, PageHeader, Stat } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/format";
import { balanceOn, payoffDate, schedule, totalInterest, type NoteTerms, type ScheduleRow } from "@/lib/finance/amortization";
import { STARLAR_URL } from "@/lib/links";
import { House, Mail, Phone } from "@/components/icons";
import { AssetPhotos } from "@/components/asset-photos";
import { UploadFile } from "@/components/upload-file";
import type { Loan } from "@/lib/types";

export const metadata = { title: "StarLar" };

const isStarLar = (l: Loan) => l.direction === "owed_to_estate" && /starlar|starkey|larson/i.test(l.counterparty);
const terms = (l: Loan): NoteTerms | null =>
  l.principal && l.rate_pct !== null && l.monthly_payment && l.first_payment_on
    ? { principal: l.principal, annualRatePct: l.rate_pct, monthlyPayment: l.monthly_payment, termMonths: l.term_months ?? null, firstPaymentOn: l.first_payment_on }
    : null;
const zillow = (address: string) => `https://www.zillow.com/homes/${encodeURIComponent(address.replace(/\s*\([^)]*\)/g, "").trim())}_rb/`;
const month = (iso: string) => iso.slice(0, 7);

function Schedule({ rows, today }: { rows: ScheduleRow[]; today: string }) {
  const years = [...new Set(rows.map((r) => r.date.slice(0, 4)))];
  const cell = "px-2 py-1 text-right tabular-nums";
  return (
    <div className="max-h-[520px] overflow-auto rounded-xl border border-rule-soft">
      <table className="w-full text-[0.9rem]">
        <thead className="sticky top-0 bg-paper-warm text-[0.75rem] uppercase tracking-wide text-ink-soft">
          <tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Month</th><th className={cell}>Payment</th><th className={cell}>Interest</th><th className={cell}>Principal</th><th className={cell}>Balance after</th></tr>
        </thead>
        <>
          {years.map((y) => {
            const ys = rows.filter((r) => r.date.startsWith(y));
            return (
              <tbody key={y} className="border-t border-rule-soft">
                {ys.map((r) => {
                  const now = month(r.date) === month(today);
                  const past = r.date < today && !now;
                  return (
                    <tr key={r.n} className={now ? "bg-brass-tint font-semibold" : past ? "text-ink-soft" : ""}>
                      <td className="px-2 py-1">{r.n}</td><td className="px-2 py-1">{fmtDate(r.date, { month: "short", year: "numeric" })}{now && " · now"}</td>
                      <td className={cell}>{fmtMoney(r.payment)}</td><td className={cell}>{fmtMoney(r.interest)}</td><td className={cell}>{fmtMoney(r.principal)}</td><td className={cell}>{fmtMoney(r.balance)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-evergreen-tint/60 text-[0.85rem] font-semibold text-evergreen">
                  <td className="px-2 py-1" colSpan={2}>{y} total</td>
                  <td className={cell}>{fmtMoney(ys.reduce((s, r) => s + r.payment, 0))}</td><td className={cell}>{fmtMoney(ys.reduce((s, r) => s + r.interest, 0))}</td><td className={cell}>{fmtMoney(ys.reduce((s, r) => s + r.principal, 0))}</td><td className={cell}>{fmtMoney(ys[ys.length - 1].balance)}</td>
                </tr>
              </tbody>
            );
          })}
        </>
      </table>
    </div>
  );
}

export default async function StarLarPage() {
  const v = await requireSection("properties");
  const money = canRead(v, "accounts");
  const [properties, loans, payments, people, incomes, bills, photos, imported, legal, questions] = await Promise.all([
    data.getProperties(v), money ? data.getLoans(v, "owed_to_estate") : Promise.resolve([]), money ? data.getLoanPayments(v) : Promise.resolve([]),
    data.getPeople(v), money ? data.getIncomeSources(v) : Promise.resolve([]), canRead(v, "bills") ? data.getBills(v) : Promise.resolve([]),
    data.getAssetPhotos(v, "property"), v.role === "super_admin" ? listImportedFiles(v) : Promise.resolve([]),
    canRead(v, "legal") ? data.getLegalDocuments(v) : Promise.resolve([]), canRead(v, "urgent_questions") ? data.getQuestions(v) : Promise.resolve([]),
  ]);
  const deeds = legal.filter((d) => /tyndell|solitude/i.test(d.title) && d.status !== "superseded");
  const openQs = questions.filter((q) => q.status !== "closed" && q.status !== "answered" && /starlar|tyndell|solitude|tod deed/i.test(q.question));
  await data.logView(v, "properties", "starlar");
  const parent = v.brief;
  const canEdit = canWrite(v, "properties") && !parent;
  const today = new Date().toISOString().slice(0, 10);

  const rentals = properties.filter((p) => p.kind !== "residence");
  const notes = loans.filter(isStarLar).map((l) => {
    const t = terms(l);
    const pays = payments.filter((p) => p.loan_id === l.id).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
    const paid = pays.filter((p) => p.kind !== "interest_only").reduce((s, p) => s + p.amount, 0);
    if (!t) return { loan: l, t, pays, paid, rows: [] as ScheduleRow[], now: null, payoff: null as string | null, interest: 0, interestToDate: 0 };
    const rows = schedule(t); const now = balanceOn(t, today);
    const interestToDate = rows.filter((r) => r.date <= today).reduce((s, r) => s + r.interest, 0);
    return { loan: l, t, pays, paid, rows, now, payoff: payoffDate(t), interest: totalInterest(t), interestToDate };
  });
  const owed = notes.reduce((s, n) => s + (n.now?.balance ?? n.loan.principal ?? 0), 0);
  const monthly = notes.reduce((s, n) => s + (n.loan.monthly_payment ?? 0), 0);
  const rent = incomes.filter((i) => i.kind === "rental").reduce((s, i) => s + (i.amount_monthly ?? 0), 0);
  const files = imported.filter((f) => f.drive_folder_key === "starlar" || f.drive_folder_key === "loans_notes" || /starlar|star lar/i.test(`${f.name} ${f.target_note ?? ""}`));
  const person = (id: string | null) => people.find((p) => p.id === id) ?? null;

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 6 · StarLar"} title={parent ? "StarLar: the rentals" : "StarLar investment properties"}
        intro={parent ? "The Tumwater rentals, and the notes Mike and Karmel pay you on them." : "The Tumwater rentals, the promissory notes Mike and Karmel pay on them, each note's amortization, and the plan for where it all goes. Balances follow each note's schedule and assume every payment to date was made; record actual payments on the Loans Ledger to check them."}
        actions={<>{!parent && <a href={STARLAR_URL} target="_blank" rel="noreferrer" className="btn-primary">Open the StarLar app ↗</a>}{money && <Link href="/loans" className="btn-secondary">Loans Ledger →</Link>}</>} />

      {money && !parent && (
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Scheduled balance on the notes" value={fmtMoney(owed)} note={`${notes.length} ${notes.length === 1 ? "note" : "notes"} · assumes every payment to date was made`} tone="evergreen" />
          <Stat label="Note payments per month" value={fmtMoney(monthly)} note="to Rich & Diana" />
          <Stat label="Rent per month" value={rent ? fmtMoney(rent) : "To find"} note={rent ? "on the Financial Statement" : "add rental income on the Financial Statement"} tone={rent ? "ink" : "ember"} href="/statement" />
          <Stat label="Rentals" value={rentals.length} note="managed by Welcome Home" href="/properties" />
        </section>
      )}

      {!parent && (
        <section className="card mb-6">
          <h2 className="text-[1.2rem] font-semibold">The StarLar plan</h2>
          <p className="mt-1 text-ink-soft">The Tumwater rentals are intended to pass 50/50 to Mike and Karmel through transfer-on-death deeds, outside the will’s six-way split. The deeds are drafted but unsigned and unrecorded; their status lives on the <Link href="/legal">Legal board</Link>. Rents pay the notes to Rich and Diana; whatever is still unpaid on the notes at death splits equally among the six children. The 2021 plan also noted a $120k Solitude buyout gift and a $20k fix-up gift in 2022.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-rule-soft p-4">
              <div className="eyebrow">Recorded title (evidence)</div>
              <ul className="mt-1 flex flex-col gap-2 text-[0.95rem]">
                {rentals.map((p) => <li key={p.id}><span className="font-semibold">{p.name}</span><div className="text-ink-soft">Held by {p.held_by ?? "to confirm"}</div></li>)}
                {deeds.length > 0 && <li className="border-t border-rule-soft pt-2"><div className="font-semibold">Deeds on the Legal board</div>{deeds.map((d) => <div key={d.id} className="text-ink-soft">{d.title}: {d.status.replace("_", " ")}</div>)}</li>}
                <li className="text-[0.85rem] text-ink-soft">Nothing passes to Mike and Karmel until a deed is signed and recorded. A 2003 access easement names Rich and Diana as grantees (StarLar file).</li>
              </ul>
            </div>
            <div className="rounded-xl border border-rule-soft p-4">
              <div className="eyebrow">Family preference (dated)</div>
              <ul className="mt-1 flex flex-col gap-2 text-[0.95rem]">
                <li><span className="font-semibold">May 2021</span> · handwritten on the 2429 schedule printout: the balance balloons on the first death; on the second death or a sale of 2429, the remaining balance splits six ways among all the siblings.</li>
                <li><span className="font-semibold">2021 TOD deeds</span> · drafted to pass the Tyndell and Solitude properties to Mike and Karmel as tenants in common after both deaths.</li>
                <li><span className="font-semibold">2026 estate brief</span> · rentals to Mike and Karmel 50/50, outside the will’s six-way split; rents keep paying the notes.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-ember/40 bg-ember-tint p-4">
              <div className="eyebrow text-ember">Open questions</div>
              {openQs.length === 0 ? <p className="mt-1 text-[0.95rem] text-ink-soft">None open.</p> : (
                <ul className="mt-1 flex flex-col gap-2 text-[0.95rem]">
                  {openQs.slice(0, 5).map((q) => <li key={q.id}><Link href="/questions" className="text-ink">{q.question.length > 160 ? q.question.slice(0, 157) + "…" : q.question}</Link>{q.owner_name && <span className="text-ink-soft"> · {q.owner_name}</span>}</li>)}
                </ul>
              )}
              {openQs.length > 5 && <p className="mt-2 text-[0.85rem]"><Link href="/questions">{openQs.length - 5} more on Urgent Questions →</Link></p>}
            </div>
          </div>
        </section>
      )}

      {money && (
        <section className="mb-8">
          <h2 className="mb-3 text-[1.4rem] font-semibold">{parent ? "The notes they pay you" : "Promissory notes"}</h2>
          {notes.length === 0 ? <Empty>No StarLar notes on the Loans Ledger yet.</Empty> : (
            <div className="flex flex-col gap-5">
              {notes.map(({ loan, t, pays, paid, rows, now, payoff, interest, interestToDate }) => (
                <article key={loan.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className={`font-semibold leading-tight ${parent ? "text-[1.5rem]" : "text-[1.3rem]"}`}>{loan.counterparty}</h3>
                      {(loan.purpose || loan.property_id) && <div className="font-semibold text-evergreen">{loan.purpose ?? `Note on ${properties.find((p) => p.id === loan.property_id)?.name}`}</div>}
                      <div className="text-ink-soft">{t ? <>{fmtMoney(t.principal)} at {t.annualRatePct}% · {fmtMoney(loan.monthly_payment)}/month{loan.term_months && ` · ${loan.term_months / 12} years`} · from {fmtDate(t.firstPaymentOn, { year: "numeric" })}</> : "Terms not entered yet"}{!parent && <> · {loan.note_signed ? "note signed" : <span className="text-ember">note not signed</span>}</>}</div>
                    </div>
                    {!parent && <Link href="/loans" className="text-[0.95rem] font-semibold text-evergreen">Edit on the ledger →</Link>}
                  </div>
                  {t && now ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-evergreen-tint p-3"><div className="eyebrow">Scheduled balance</div><div className="text-[1.3rem] font-semibold text-evergreen">{fmtMoney(now.balance)}</div><div className="text-[0.85rem] text-ink-soft">assumes payments {now.paymentsMade} of {rows.length} were all made</div></div>
                      <div className="rounded-xl border border-rule-soft p-3"><div className="eyebrow">Next payment</div><div className="text-[1.3rem] font-semibold">{now.nextPaymentOn ? fmtDate(now.nextPaymentOn, { year: "numeric" }) : "Paid off"}</div><div className="text-[0.85rem] text-ink-soft">{fmtMoney(loan.monthly_payment)}</div></div>
                      <div className="rounded-xl border border-rule-soft p-3"><div className="eyebrow">Interest so far</div><div className="text-[1.3rem] font-semibold">{fmtMoney(interestToDate)}</div><div className="text-[0.85rem] text-ink-soft">of {fmtMoney(interest)} over the life</div></div>
                      <div className="rounded-xl border border-rule-soft p-3"><div className="eyebrow">Paid off</div><div className="text-[1.3rem] font-semibold">{payoff && fmtDate(payoff, { month: "short", year: "numeric" })}</div><div className="text-[0.85rem] text-ink-soft">if every payment is made</div></div>
                    </div>
                  ) : (
                    <p className="mt-3 text-ember">Enter principal, rate, monthly payment and first payment date on the Loans Ledger to compute the balance and schedule.</p>
                  )}
                  {loan.balance_note && <p className="mt-3 text-[0.95rem] text-ink-soft">{loan.balance_note}</p>}
                  {!parent && t && now && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-rule-soft p-4">
                        <div className="eyebrow">Balance at each year end</div>
                        <ul className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[0.9rem] xl:grid-cols-3">
                          {rows.filter((r) => r.date.slice(5, 7) === "12").slice(0, 12).map((r) => <li key={r.n} className="flex justify-between"><span className="text-ink-soft">{r.date.slice(0, 4)}</span><span className="tabular-nums">{fmtMoney(r.balance)}</span></li>)}
                        </ul>
                        <p className="mt-2 text-[0.85rem] text-ink-soft">What is unpaid at death splits six ways under the plan.</p>
                      </div>
                      <div className="rounded-xl border border-rule-soft p-4">
                        <div className="eyebrow">Payments recorded in the binder</div>
                        {pays.length === 0 ? <p className="mt-1 text-[0.95rem] text-ink-soft">None recorded here; the StarLar app holds the payment history. Record payments on the Loans Ledger to compare them against the schedule.</p> : (
                          <>
                            <ul className="mt-1 text-[0.95rem]">{pays.slice(0, 5).map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{fmtDate(p.paid_on, { year: "numeric" })}{/unconfirmed/i.test(p.note ?? "") && <span className="pill ml-2 bg-brass-tint text-brass-deep">Pd mark</span>}</span><span className="tabular-nums">{fmtMoney(p.amount)}</span></li>)}</ul>
                            {pays.length > 5 && <p className="text-[0.85rem] text-ink-soft">and {pays.length - 5} more on the <Link href="/loans">Loans Ledger</Link></p>}
                            <p className="mt-2 text-[0.85rem] text-ink-soft">{pays.length} recorded ({pays.filter((p) => /unconfirmed/i.test(p.note ?? "")).length} only as handwritten “Pd” marks, not receipts) totaling {fmtMoney(paid)} · the schedule expects {rows.filter((r) => r.date <= today).length} payments totaling {fmtMoney(rows.filter((r) => r.date <= today).reduce((s, r) => s + r.payment, 0))} by now.</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {!parent && t && rows.length > 0 && (
                    <div className="mt-4">
                      <CollapsibleCard title="Amortization schedule" count={rows.length} defaultOpen={false} className="border-rule-soft">
                        <Schedule rows={rows} today={today} />
                      </CollapsibleCard>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-[1.4rem] font-semibold">The rentals</h2>
        {rentals.length === 0 ? <Empty>No rental properties recorded.</Empty> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rentals.map((p) => {
              const manager = person(p.manager_person_id);
              const related = bills.filter((b) => b.property_id === p.id);
              const linked = notes.filter((n) => n.loan.property_id === p.id);
              return (
                <div key={p.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><House size={26} /></div>
                    <div className="min-w-0">
                      <h3 className={`font-semibold leading-tight ${parent ? "text-[1.5rem]" : "text-[1.3rem]"}`}>{p.name}</h3>
                      {p.address && <div className="text-ink-soft"><a href={zillow(p.address)} target="_blank" rel="noreferrer" className="text-evergreen" title="Open on Zillow">{p.address.replace(/\s*\([^)]*\)/g, "")} ↗</a></div>}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-[0.95rem] sm:grid-cols-2">
                    <div><div className="eyebrow">Who looks after it</div>{manager ? <div><div className="font-semibold">{manager.full_name}</div>{manager.phone && <a href={`tel:${manager.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 text-evergreen"><Phone size={16} /> {manager.phone}</a>}{manager.email && !parent && <a href={`mailto:${manager.email}`} className="flex items-center gap-1 text-evergreen"><Mail size={16} /> {manager.email}</a>}</div> : <div className="text-ink-soft">None assigned.</div>}</div>
                    <div><div className="eyebrow">Note on this property</div>{linked.length ? linked.map((n) => <div key={n.loan.id}>{n.loan.counterparty}{n.now && <span className="text-ink-soft"> · {fmtMoney(n.now.balance)} scheduled balance</span>}</div>) : <div className="text-ink-soft">Not linked to a note yet{!parent && " (set the property on the loan)"}.</div>}</div>
                    {!parent && p.hoa_name && <div><div className="eyebrow">HOA</div><div>{p.hoa_name}</div></div>}
                    {!parent && related.length > 0 && <div><div className="eyebrow">Bills tied to it</div><ul>{related.map((b) => <li key={b.id} className="flex justify-between"><span>{b.payee}</span><span className="text-ink-soft">{fmtMoney(b.amount)}</span></li>)}</ul></div>}
                  </div>
                  {!parent && p.notes && <p className="mt-3 text-[0.9rem] text-ink-soft">{p.notes}</p>}
                  <AssetPhotos kind="property" assetId={p.id} photos={photos.filter((x) => x.asset_id === p.id)} canEdit={canEdit} parent={parent} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {!parent && (files.length > 0 || canEdit) && (
        <CollapsibleCard title="StarLar documents" count={files.length} defaultOpen={false}>
          {canEdit && <div className="mb-3"><UploadFile section="properties" defaultNote="[StarLar · Added]" label="Upload a StarLar document" back="/starlar" /></div>}
          <ul className="divide-y divide-rule-soft">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0"><div className="font-semibold">{f.name}{f.sensitivity === "admin_only" && <span className="pill ml-2 bg-ember-tint text-ember">vault only</span>}</div>{f.target_note && <div className="text-[0.9rem] text-ink-soft">{f.target_note}</div>}</div>
                <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Open ↗</a>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}
    </>
  );
}
