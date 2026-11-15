import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtMoney, subjectName } from "@/lib/format";
import { Bank } from "@/components/icons";
import { MoneyForms } from "./money-client";
import { UploadFile } from "@/components/upload-file";
import { groupByInstitution, fileMatches } from "@/lib/money/institutions";

export const metadata = { title: "Accounts" };

const KIND: Record<string, string> = { checking: "Checking", savings: "Savings", brokerage: "Brokerage", retirement: "Retirement", credit_card: "Credit card", loan: "Loan", other: "Other" };

export default async function AccountsPage() {
  const v = await requireSection("accounts");
  const [accounts, files] = await Promise.all([data.getAccounts(v), data.getFiledDocuments(v)]);
  await data.logView(v, "accounts");
  const parent = v.brief;
  const canEdit = canWrite(v, "accounts") && !parent;
  const institutions = groupByInstitution(accounts);
  const docsFor = (g: (typeof institutions)[number]) => files.filter((f) => fileMatches(g, f));
  const claimed = new Set(institutions.flatMap((g) => docsFor(g).map((f) => f.id)));
  const accountSectionDocs = files.filter((f) => !claimed.has(f.id) && /^\[accounts/i.test(f.target_note ?? ""));

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 7"} title="Accounts"
        intro={parent ? "Where the money is, one card per bank. Only the last four digits are ever shown." : "One card per institution with every account held there, who holds it, the beneficiary, and the statements and letters on file for it. Last-4 digits only."}
        actions={<>{!parent && canRead(v, "bills") && <Link href="/bills" className="btn-secondary">Bills</Link>}{canEdit && <MoneyForms only="account" canAddAccount />}</>} />

      {canEdit && (
        <div className="mb-6">
          <UploadFile section="accounts" label="Upload a statement or letter" back="/money"
            notes={institutions.map((g) => ({ label: g.name, value: `[Accounts · ${g.key}]` }))} newTab={{ prefix: "[Accounts · ", suffix: "]" }} />
        </div>
      )}

      {institutions.length === 0 ? <Empty>No accounts yet.</Empty> : (
        <div className="flex flex-col gap-5">
          {institutions.map((g) => {
            const docs = docsFor(g);
            return (
              <section key={g.key} className="card">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><Bank size={24} /></div>
                  <div>
                    <h2 className={`font-semibold leading-tight ${parent ? "text-[1.5rem]" : "text-[1.3rem]"}`}>{g.name}</h2>
                    <div className="text-[0.9rem] text-ink-soft">{g.accounts.length} {g.accounts.length === 1 ? "account" : "accounts"}{!parent && docs.length > 0 && ` · ${docs.length} ${docs.length === 1 ? "document" : "documents"}`}</div>
                  </div>
                </div>

                <ul className="mt-3 divide-y divide-rule-soft">
                  {g.accounts.map((a) => (
                    <li key={a.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className={`font-semibold ${parent ? "text-[1.15rem]" : ""}`}>{KIND[a.kind]}{a.purpose && <span className="font-normal text-ink-soft"> · {a.purpose}</span>}</div>
                        <div className="flex items-baseline gap-3">
                          {a.balance !== null && a.balance !== undefined && <span className="tabular-nums">{fmtMoney(a.balance)}{a.balance_as_of && <span className="text-[0.8rem] text-ink-soft"> as of {fmtDate(a.balance_as_of)}</span>}</span>}
                          <span className="font-mono text-ink-soft">{a.last4 ? `····${a.last4}` : "—"}</span>
                        </div>
                      </div>
                      {!parent && <div className="text-[0.9rem] text-ink-soft">Held by {subjectName(a.held_by)}</div>}
                      {!parent && a.beneficiary_notes && <div className="text-[0.9rem] text-ink-soft">Beneficiary: {a.beneficiary_notes}</div>}
                      {!parent && a.notes && <div className="text-[0.9rem] text-ink-soft">{a.notes}</div>}
                    </li>
                  ))}
                </ul>

                {!parent && (
                  <div className="mt-2 rounded-xl border border-rule-soft bg-paper-warm/60 p-3">
                    <div className="eyebrow">Source documents</div>
                    {docs.length === 0 ? <p className="mt-1 text-[0.9rem] text-ink-soft">Nothing on file yet. Upload a statement above and choose {g.name}.</p> : (
                      <ul className="mt-1 divide-y divide-rule-soft">
                        {docs.map((f) => (
                          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                            <div className="min-w-0">
                              <div className="text-[0.95rem] font-semibold">{f.name.replace(/\.(pdf|jpe?g|png|heic|docx?)$/i, "")}</div>
                              <div className="text-[0.8rem] text-ink-soft">{f.taken_at ? fmtDate(f.taken_at.slice(0, 10), { year: "numeric" }) + " · " : ""}{(f.target_note ?? "").replace(/^\[[^\]]*\]\s*/, "")}</div>
                            </div>
                            <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {!parent && accountSectionDocs.length > 0 && (
        <section className="card mt-5">
          <h2 className="text-[1.2rem] font-semibold">Other account documents</h2>
          <ul className="mt-2 divide-y divide-rule-soft">
            {accountSectionDocs.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5"><span className="font-semibold">{f.name}</span><a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a></li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-[0.85rem] text-ink-soft">Full account numbers and logins are never stored here. Logins live in the family password vault, by name only. Money lent to family is on the <Link href="/loans">Loans Ledger</Link>.</p>
    </>
  );
}
