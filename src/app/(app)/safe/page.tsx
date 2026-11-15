import Link from "next/link";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { Lock } from "@/components/icons";
import { RemoveSafeItemButton, SafeItemEditor } from "./safe-client";
import { UploadFile } from "@/components/upload-file";

export const metadata = { title: "The Safe" };

/** Turns https:// links inside free text into clickable links. */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return <>{parts.map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="font-semibold text-evergreen">Open ↗</a> : <span key={i}>{part}</span>)}</>;
}

const CAT: Record<string, string> = { document: "Documents", cash: "Cash", keys: "Keys", jewelry: "Jewelry & valuables", media: "Photos, drives & media", other: "Other" };
const ORDER = ["document", "cash", "keys", "jewelry", "media", "other"];

export default async function SafePage() {
  const v = await requireSection("accounts");
  const [items, files] = await Promise.all([data.getSafeItems(v), data.getFiledDocuments(v)]);
  const vital = files.filter((f) => /^\[Vital records/i.test(f.target_note ?? ""));
  await data.logView(v, "accounts", "safe");
  const parent = v.brief;
  const canEdit = canWrite(v, "accounts") && !parent;
  const safes = [...new Set(items.map((i) => i.safe_name))];
  if (safes.length === 0) safes.push("Home safe");

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 7 · The Safe"} title="The Safe"
        intro={parent ? "What is kept in the safe, so the kids know where to look." : "What is kept in the home safe (and any other safe or deposit box), where each thing sits, and when it was last checked. The combination is never written here: it lives in 1Password under its own item name."}
        actions={canEdit ? <SafeItemEditor safes={safes} /> : undefined} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rule bg-paper-warm px-5 py-4">
        <Lock className="mt-0.5 shrink-0 text-evergreen" />
        <p className="text-[0.95rem] text-ink-soft"><strong className="text-ink">How to open it:</strong> the combination and any key location are in the family 1Password vault. Search there for the item named after the safe. See <Link href="/passwords">Passwords</Link> for how to get vault access.</p>
      </div>

      {items.length === 0 ? <Empty>Nothing recorded yet.</Empty> : safes.map((safe) => (
        <section key={safe} className="card mb-6">
          <h2 className="text-[1.35rem] font-semibold">{safe}</h2>
          {ORDER.filter((c) => items.some((i) => i.safe_name === safe && i.category === c)).map((c) => (
            <div key={c} className="mt-4">
              <div className="eyebrow mb-1">{CAT[c]}</div>
              <ul className="divide-y divide-rule-soft">
                {items.filter((i) => i.safe_name === safe && i.category === c).map((i) => (
                  <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className={`font-semibold ${parent ? "text-[1.25rem]" : "text-[1.05rem]"}`}>{i.name}</div>
                      {i.detail && <p className={`whitespace-pre-line text-ink-soft ${parent ? "" : "text-[0.95rem]"}`}><Linkify text={i.detail} /></p>}
                      {!parent && <div className="text-[0.8rem] text-ink-soft">{i.confirmed_on ? `Last checked ${fmtDate(i.confirmed_on, { year: "numeric" })}` : "Not checked yet"}{i.added_by_name && ` · added by ${i.added_by_name}`}</div>}
                    </div>
                    {canEdit && <div className="flex gap-2"><SafeItemEditor item={i} safes={safes} /><RemoveSafeItemButton id={i.id} name={i.name} /></div>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <section className="card mt-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-1 shrink-0 text-evergreen" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.3rem] font-semibold">Vital records <span className="text-ink-soft">· {vital.length}</span></h2>
            <p className="text-[0.95rem] text-ink-soft">Scans of driver licenses, passports, birth and marriage certificates, Social Security cards and the like. Every one is vault-only: it is stored in the app’s private storage, only super admins can open it, and it never appears on any family page.</p>
          </div>
        </div>
        {vital.length > 0 && (
          <ul className="mt-3 divide-y divide-rule-soft">
            {vital.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0"><div className="font-semibold">{f.name.replace(/\.(pdf|jpe?g|png|heic)$/i, "")}</div><div className="text-[0.85rem] text-ink-soft">{(f.target_note ?? "").replace(/^\[[^\]]*\]\s*/, "")}{f.taken_at && ` · ${fmtDate(f.taken_at.slice(0, 10), { year: "numeric" })}`}</div></div>
                <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a>
              </li>
            ))}
          </ul>
        )}
        {canEdit && <div className="mt-3"><UploadFile section="accounts" label="Upload an ID or certificate" forceVault back="/safe"
          notes={[["Driver license", "[Vital records · Driver license]"], ["Passport", "[Vital records · Passport]"], ["Birth certificate", "[Vital records · Birth certificate]"], ["Marriage certificate", "[Vital records · Marriage certificate]"], ["Social Security card", "[Vital records · Social Security card]"], ["Medicare / insurance card", "[Vital records · Insurance card]"], ["Other", "[Vital records · Other]"]].map(([label, value]) => ({ label, value }))} /></div>}
      </section>
    </>
  );
}
