import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SourceTag } from "@/components/ui";
import { subjectName } from "@/lib/format";
import { Key, Lock } from "@/components/icons";
import { DigitalEditor, DigitalRowActions } from "./digital-client";

export const metadata = { title: "Digital Accounts" };

export default async function DigitalPage() {
  const v = await requireSection("digital_accounts");
  const accounts = await data.getDigitalAccounts(v);
  await data.logView(v, "digital_accounts");
  const parent = v.role === "parent";
  const canEdit = canWrite(v, "digital_accounts") && !parent;
  const mine = parent ? accounts.filter((a) => a.owner === v.isSubject || a.owner === "both") : accounts;

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 13"} title={parent ? "Your online accounts" : "Digital accounts & logins"}
        intro={parent ? "A list of the accounts you have online. The passwords themselves are kept safely in the family password vault, not here." : "Which online accounts exist, who owns them, what they're for, and what to do with each one later. Credentials live only in the password vault; this page points to the vault item by name."}
        actions={canEdit ? <DigitalEditor /> : undefined} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rule bg-paper-warm px-5 py-4">
        <Lock className="mt-0.5 shrink-0 text-evergreen" />
        <p className="text-[0.95rem] text-ink-soft"><strong className="text-ink">No passwords here, ever.</strong> The app refuses anything that looks like one. Each row names the matching item in the 1Password family vault; whoever needs the login gets it from the vault, and every look is recorded there too.</p>
      </div>

      {mine.length === 0 ? <Empty>No accounts recorded yet.</Empty> : (
        <ul className={`grid gap-3 ${parent ? "" : "md:grid-cols-2"}`}>
          {mine.map((a) => (
            <li key={a.id} className="card flex flex-col gap-2 !p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><Key size={20} /></div>
                  <div>
                    <div className={`font-semibold ${parent ? "text-[1.25rem]" : "text-[1.05rem]"}`}>{a.service}</div>
                    <div className="text-[0.95rem] text-ink-soft">{subjectName(a.owner)}{a.purpose && ` · ${a.purpose}`}</div>
                  </div>
                </div>
                {canEdit && <DigitalRowActions account={a} />}
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-[0.95rem] sm:grid-cols-[auto_1fr]">
                <dt className="font-semibold text-ink-soft">Vault item</dt>
                <dd>{a.vault_item ? <span className="rounded-md bg-parchment px-2 py-0.5 font-mono text-[0.9rem]">{a.vault_item}</span> : <span className="text-ember">Not in the vault yet</span>}</dd>
                {!parent && <><dt className="font-semibold text-ink-soft">Later</dt><dd>{a.after_death ?? <span className="text-ink-soft">—</span>}</dd></>}
                {!parent && a.notes && <><dt className="font-semibold text-ink-soft">Notes</dt><dd className="text-ink-soft">{a.notes}</dd></>}
              </dl>
              {!parent && a.source !== "app" && <div><SourceTag source={a.source} /></div>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
