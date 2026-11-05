import Link from "next/link";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, LegalStatusPill } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { balanceOn, levelPayment, payoffDate } from "@/lib/finance/amortization";
import { ConflictList, NoteCard, ProvisionEditor, VersionPicker, NewVersionButton } from "./estate-client";

export const metadata = { title: "Estate Plan" };

export default async function EstatePage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const v = await requireSection("legal");
  const { v: wanted } = await searchParams;
  const [versions, conflicts, legal, loans] = await Promise.all([data.getPlanVersions(v), data.getPlanConflicts(v), data.getLegalDocuments(v), data.getLoans(v, "owed_to_estate")]);
  await data.logView(v, "legal", "estate_plan");
  const version = versions.find((x) => x.id === wanted) ?? versions.find((x) => x.status === "current") ?? versions[0] ?? null;
  const provisions = version ? await data.getProvisions(v, version.id) : [];
  const parent = v.role === "parent";
  const canEdit = canWrite(v, "legal") && !parent;
  const doc = (id: string | null) => legal.find((d) => d.id === id) ?? null;
  const open = conflicts.filter((c) => c.status !== "resolved");
  const notes = loans.filter((l) => l.monthly_payment && l.first_payment_on && l.rate_pct !== null);
  const today = new Date().toISOString().slice(0, 10);

  const planned = provisions.length;
  const signedCount = provisions.filter((p) => { const d = doc(p.legal_document_id); return d && ["signed", "recorded"].includes(d.status); }).length;
  const conflicted = new Set(open.map((c) => c.provision_id).filter(Boolean));

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 11 · 2026 plan"} title={parent ? "Your estate plan" : "Estate plan tracker"}
        intro={parent ? "What you've decided, what's been signed, and the questions the family still needs you to answer." : "What the plan says, side by side with what's actually signed, and every open question with an owner. The StarLar notes are amortized below."}
        actions={canEdit && version ? <><ProvisionEditor versionId={version.id} documents={legal.map((d) => ({ id: d.id, title: d.title }))} /><NewVersionButton copyFrom={version.id} /></> : undefined} />

      {!version ? <Empty>No plan recorded yet.</Empty> : (
        <>
          <section className="card mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[1.5rem] font-semibold">{version.title}</h2>
                  <span className={`pill ${version.status === "current" ? "bg-evergreen-tint text-evergreen" : "bg-rule-soft text-ink-soft"}`}>v{version.version_no} · {version.status}</span>
                </div>
                <div className="text-ink-soft">As of {fmtDate(version.plan_date, { year: "numeric" })}{version.source_docs.length > 0 && ` · from: ${version.source_docs.join(", ")}`}</div>
              </div>
              {versions.length > 1 && <VersionPicker versions={versions.map((x) => ({ id: x.id, label: `v${x.version_no} · ${x.title}` }))} current={version.id} />}
            </div>
            {version.summary && <p className="mt-2">{version.summary}</p>}
            {!parent && (
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-parchment p-3"><div className="font-serif text-[1.8rem] font-semibold">{planned}</div><div className="text-[0.85rem] text-ink-soft">provisions planned</div></div>
                <div className="rounded-xl bg-evergreen-tint p-3"><div className="font-serif text-[1.8rem] font-semibold text-evergreen">{signedCount}</div><div className="text-[0.85rem] text-ink-soft">backed by a signed document</div></div>
                <div className="rounded-xl bg-ember-tint p-3"><div className="font-serif text-[1.8rem] font-semibold text-ember">{open.length}</div><div className="text-[0.85rem] text-ink-soft">open questions</div></div>
              </div>
            )}
          </section>

          {parent && (
            <section className="card mb-6">
              <h2 className="text-[1.3rem] font-semibold">What the plan says</h2>
              <ul className="mt-2 divide-y divide-rule-soft">
                {provisions.map((p) => <li key={p.id} className="py-3"><div className="font-semibold">{p.subject}</div><div className="text-ink-soft">{p.planned}</div></li>)}
              </ul>
            </section>
          )}
          {!parent && <section className="card mb-6 overflow-x-auto !p-0">
            <h2 className="px-6 pt-5 text-[1.3rem] font-semibold">Plan vs. signed documents</h2>
            <table className="mt-3 w-full min-w-[760px] text-[0.95rem]">
              <thead className="bg-parchment text-left text-[0.75rem] uppercase tracking-wide text-ink-soft">
                <tr><th className="px-6 py-2">Provision</th><th className="px-3 py-2">Planned</th><th className="px-3 py-2">Signed?</th><th className="px-3 py-2">Conflict?</th>{canEdit && <th className="px-3 py-2"></th>}</tr>
              </thead>
              <tbody>
                {(["asset", "role", "term"] as const).map((cat) => {
                  const rows = provisions.filter((p) => p.category === cat);
                  if (!rows.length) return null;
                  return [
                    <tr key={`h-${cat}`} className="border-t border-rule-soft"><td colSpan={canEdit ? 5 : 4} className="px-6 py-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-brass-deep">{{ asset: "Assets", role: "Roles", term: "Terms" }[cat]}</td></tr>,
                    ...rows.map((p) => {
                      const d = doc(p.legal_document_id);
                      const signed = d && ["signed", "recorded"].includes(d.status);
                      const cs = open.filter((c) => c.provision_id === p.id);
                      return (
                        <tr key={p.id} className="border-t border-rule-soft align-top">
                          <td className="px-6 py-3 font-semibold">{p.subject}</td>
                          <td className="px-3 py-3">{p.planned}{p.notes && <div className="mt-1 text-[0.85rem] text-ink-soft">{p.notes}</div>}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {d ? <div className="flex flex-col gap-1"><LegalStatusPill status={d.status} /><Link href="/legal" className="text-[0.85rem]">{d.title}</Link></div>
                               : <span className="pill bg-rule-soft text-ink-soft">No document</span>}
                            {d && !signed && <div className="mt-1 text-[0.85rem] text-brass-deep">Not yet</div>}
                          </td>
                          <td className="px-3 py-3">
                            {cs.length ? cs.map((c) => <div key={c.id} className="pill mb-1 bg-ember-tint text-ember">{c.title}</div>) : <span className="text-evergreen">—</span>}
                          </td>
                          {canEdit && <td className="px-3 py-3"><ProvisionEditor versionId={version.id} provision={p} documents={legal.map((x) => ({ id: x.id, title: x.title }))} /></td>}
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
            {conflicted.size > 0 && <p className="px-6 py-3 text-[0.85rem] text-ink-soft">{conflicted.size} provision{conflicted.size > 1 ? "s have" : " has"} an open question attached.</p>}
          </section>}
        </>
      )}

      <section className="card mb-6">
        <ConflictList conflicts={conflicts} canEdit={canEdit} parent={parent} provisions={provisions.map((p) => ({ id: p.id, subject: p.subject }))} versionId={version?.id ?? null} />
      </section>

      {!parent && notes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-semibold">The StarLar notes</h2>
          <p className="-mt-2 text-ink-soft">The rents pay Rich &amp; Diana on these two notes. Each schedule uses the note&rsquo;s actual monthly payment; the balance is what&rsquo;s still owed to the parents (and, later, to the estate).</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {notes.map((n) => {
              const terms = { principal: n.principal!, annualRatePct: n.rate_pct!, monthlyPayment: n.monthly_payment!, termMonths: n.term_months ?? null, firstPaymentOn: n.first_payment_on! };
              const now = balanceOn(terms, today);
              const implied = n.term_months ? levelPayment(terms.principal, terms.annualRatePct, n.term_months) : null;
              return <NoteCard key={n.id} loan={{ id: n.id, counterparty: n.counterparty, principal: n.principal!, rate_pct: n.rate_pct!, monthly_payment: n.monthly_payment!, term_months: n.term_months ?? null, first_payment_on: n.first_payment_on!, note_signed: n.note_signed, balance_note: n.balance_note ?? null }}
                today={today} balance={now.balance} paymentsMade={now.paymentsMade} nextPaymentOn={now.nextPaymentOn} payoff={payoffDate(terms)} impliedPayment={implied} />;
            })}
          </div>
        </section>
      )}
    </>
  );
}
