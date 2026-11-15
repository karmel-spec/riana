import Link from "next/link";
import { requireSection, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { PageHeader } from "@/components/ui";
import { PHASES, resolve } from "@/lib/executrix";
import { DoneBox } from "./checklist";

export const metadata = { title: "Executrix" };

export default async function ExecutrixPage() {
  const v = await requireSection("legal");
  const [legal, wishes, files, widow] = await Promise.all([
    data.getLegalDocuments(v), canRead(v, "final_wishes") ? data.getFinalWishes(v) : Promise.resolve([]),
    v.role === "super_admin" ? listImportedFiles(v) : Promise.resolve([]), data.getWidowBook(v),
  ]);
  await data.logView(v, "legal", "executrix");
  const parent = v.brief;
  const pool = [...files, ...widow.map((w) => ({ name: w.name, target_note: w.target_note, web_view_link: w.web_view_link }))];
  const phases = PHASES.map((p) => ({ ...p, steps: p.steps.map((s) => ({ ...s, needs: resolve(s, pool, legal, wishes) })) }));
  const all = phases.flatMap((p) => p.steps);
  const ready = all.filter((s) => s.needs.every((n) => n.status !== "missing")).length;
  const missing = all.flatMap((s) => s.needs.filter((n) => n.status === "missing").map((n) => n.label));
  const uniqMissing = [...new Set(missing)];

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 11 · Executrix"} title={parent ? "What Heather will do" : "Executrix checklist"}
        intro={parent ? "The steps Heather will take, in order, and the papers each one needs. Where a paper is missing, you can still fix it now." : "What Heather, as executrix, does in the first days, weeks and months, with the binder page or app record behind every step. A red mark means the document is not filed yet, which is the thing to fix while Rich and Diana can still help."}
        actions={<><Link href="/sources/widow-book" className="btn-secondary">The Widow Book →</Link><Link href="/legal" className="btn-secondary">Legal board →</Link><Link href="/glossary" className="btn-secondary">Glossary →</Link></>} />

      <div className="card mb-6 flex flex-wrap items-center gap-6">
        <div><div className="eyebrow">Readiness</div><div className="font-serif text-[2rem] font-semibold leading-tight text-evergreen">{ready} of {all.length}</div><div className="text-[0.9rem] text-ink-soft">steps have every document filed</div></div>
        <div className="min-w-[220px] flex-1">
          <div className="text-[0.9rem] text-ink-soft">Still missing</div>
          {uniqMissing.length === 0 ? <div className="font-semibold text-evergreen">Nothing: every step has its papers.</div> : (
            <div className="mt-1 flex flex-wrap gap-1.5">{uniqMissing.map((m) => <span key={m} className="pill bg-ember-tint text-ember">{m}</span>)}</div>
          )}
        </div>
        {!parent && <div className="text-[0.85rem] text-ink-soft">Check-offs are kept on this device only.<br />Paper binder and the attorney holding the wills: see The Widow Book and Contacts</div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {phases.map((p) => (
          <section key={p.key} className="card border-t-8 p-4" style={{ borderTopColor: p.color }}>
            <h2 className="text-[1.3rem] font-semibold leading-tight">{p.title}</h2>
            <div className="mb-2 text-[0.85rem] text-ink-soft">{p.when}</div>
            <ol className="divide-y divide-rule-soft">
              {p.steps.map((s) => (
                <li key={s.id} className="flex gap-3 py-3">
                  <DoneBox id={s.id} />
                  <div className="min-w-0">
                    <div className={parent ? "text-[1.1rem]" : "text-[0.98rem]"}>{s.text}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.85rem] font-semibold">
                      {s.needs.map((n) => n.status === "missing"
                        ? <span key={n.label} className="text-ember">{n.href ? <Link href={n.href} className="text-ember">{n.label}</Link> : n.label}: not filed</span>
                        : n.href?.startsWith("http")
                          ? <a key={n.label} href={n.href} target="_blank" rel="noreferrer" className="text-evergreen">{n.label} ↗</a>
                          : <Link key={n.label} href={n.href ?? "/"} className="text-evergreen">{n.label} →</Link>)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
