import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SourceTag } from "@/components/ui";
import { subjectName } from "@/lib/format";
import { Key, Lock } from "@/components/icons";
import { CsvImport, DigitalEditor, DigitalRowActions } from "./digital-client";

export const metadata = { title: "Accounts Directory" };

export default async function DigitalPage() {
  const v = await requireSection("digital_accounts");
  const accounts = await data.getDigitalAccounts(v);
  await data.logView(v, "digital_accounts");
  const parent = v.brief;
  const canEdit = canWrite(v, "digital_accounts") && !parent;
  const mine = parent ? accounts.filter((a) => a.owner === v.isSubject || a.owner === "both") : accounts;
  const found = mine.filter((a) => a.status === "found").length;
  const pct = mine.length ? Math.round((found / mine.length) * 100) : 0;
  const categories = [...new Set(mine.map((a) => a.category ?? "Other"))].sort();

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 13"} title={parent ? "Your online accounts" : "Accounts directory"}
        intro={parent ? "A list of the accounts you have online and where each password is kept. The passwords themselves live in the family password vault, not here." : "Where every login lives: the account, its website, who owns it, and the 1Password vault item that holds the password. The app records only the location, never the credential."}
        actions={canEdit ? <><DigitalEditor />{v.role === "super_admin" && <CsvImport />}</> : undefined} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rule bg-paper-warm px-5 py-4">
        <Lock className="mt-0.5 shrink-0 text-evergreen" />
        <p className="text-[0.95rem] text-ink-soft"><strong className="text-ink">No passwords here, ever.</strong> The app, the import, and the database all refuse anything that looks like one. Each row names the 1Password vault and item; whoever needs the login gets it from the vault.</p>
      </div>

      <section className="card mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[1.3rem] font-semibold">{parent ? "In the vault" : "Found vs. still to find"}</h2>
          <span className="text-ink-soft"><strong className="text-ink">{found}</strong> of {mine.length} in the vault · {mine.length - found} to find</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-rule-soft" role="progressbar" aria-valuenow={found} aria-valuemax={mine.length} aria-label="Accounts found"><div className="h-3 bg-evergreen" style={{ width: `${pct}%` }} /></div>
      </section>

      {mine.length === 0 ? <Empty>No accounts recorded yet.</Empty> : categories.map((cat) => {
        const list = mine.filter((a) => (a.category ?? "Other") === cat);
        return (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 font-sans text-[0.9rem] font-bold uppercase tracking-wide text-brass-deep">{cat} · {list.filter((a) => a.status === "found").length}/{list.length}</h2>
            <ul className={`grid gap-3 ${parent ? "" : "md:grid-cols-2"}`}>
              {list.map((a) => (
                <li key={a.id} className="card flex flex-col gap-2 !p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.status === "found" ? "bg-evergreen-tint text-evergreen" : "bg-brass-tint text-brass-deep"}`}><Key size={20} /></div>
                      <div>
                        <div className={`font-semibold ${parent ? "text-[1.25rem]" : "text-[1.05rem]"}`}>{a.service}</div>
                        <div className="text-[0.95rem] text-ink-soft">{subjectName(a.owner)}{a.purpose && ` · ${a.purpose}`}{a.website && !parent && <> · <a href={a.website} target="_blank" rel="noreferrer">{a.website.replace(/^https?:\/\//, "")}</a></>}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <span className={`pill ${a.status === "found" ? "bg-evergreen-tint text-evergreen" : "bg-brass-tint text-brass-deep"}`}>{a.status === "found" ? "In vault" : "To find"}</span>
                      {canEdit && <DigitalRowActions account={a} />}
                    </div>
                  </div>
                  <dl className="grid gap-x-4 gap-y-1 text-[0.95rem] sm:grid-cols-[auto_1fr]">
                    <dt className="font-semibold text-ink-soft">Vault</dt>
                    <dd>{a.vault_item ? <><span className="text-ink-soft">{a.vault_name} → </span><span className="rounded-md bg-parchment px-2 py-0.5 font-mono text-[0.9rem]">{a.vault_item}</span></> : <span className="text-brass-deep">Not in the vault yet</span>}</dd>
                    {!parent && a.after_death && <><dt className="font-semibold text-ink-soft">Later</dt><dd>{a.after_death}</dd></>}
                    {!parent && a.notes && <><dt className="font-semibold text-ink-soft">Notes</dt><dd className="text-ink-soft">{a.notes}</dd></>}
                  </dl>
                  {!parent && a.source !== "app" && <div><SourceTag source={a.source} /></div>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
