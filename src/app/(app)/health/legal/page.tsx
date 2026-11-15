import Link from "next/link";
import { scanFor } from "@/lib/legal/scans";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { CollapsibleCard, Empty, LegalStatusPill, PageHeader } from "@/components/ui";
import { fmtDate, subjectName } from "@/lib/format";
import { UploadFile } from "@/components/upload-file";
import { Linked } from "@/lib/doclinks";

export const metadata = { title: "Medical Legal Docs" };

/** Which legal records belong on this page: anything about health care decisions. */
const HEALTH_DOC = /health ?care|health directive|living will|medical|comfort|end-of-life|prehospital|DNR|HIPAA|mental health/i;
const HEALTH_TYPE = new Set(["healthcare_poa"]);
/** Filed pages that belong here: the 2026 binder's Health Directive tab, and anything tagged for this page. */
const HEALTH_FILE = /\[Widow Book · Health Directive\]|\[Medical legal\]|health ?care directive|living will|healthcare power|medical power|HIPAA|DNR|prehospital|comfort and end-of-life|emergency medical summary/i;

export default async function MedicalLegalPage() {
  const v = await requireSection("legal");
  const [legal, files, albums, widow] = await Promise.all([data.getLegalDocuments(v), data.getFiledDocuments(v), canRead(v, "family_history") ? data.getSharedAlbums(v) : Promise.resolve([]), data.getWidowBook(v)]);
  await data.logView(v, "legal", "medical-legal");
  const parent = v.brief;
  const canEdit = canWrite(v, "legal") && !parent;
  const docs = legal.filter((d) => d.status !== "superseded" && (HEALTH_TYPE.has(d.doc_type) || HEALTH_DOC.test(d.title)));
  const pool = [...files, ...widow.filter((w) => !files.some((f) => f.id === w.id))];
  const pages = pool.filter((f) => HEALTH_FILE.test(`${f.name} ${f.target_note ?? ""}`));
  const album = albums.find((a) => /health directive/i.test(a.title));
  const ctx = { files: pool, legal };
  const who = (["both", "rich", "diana"] as const);
  const heading = { both: parent ? "Both of you" : "Rich & Diana together", rich: "Rich", diana: "Diana" };

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 4 · Medical legal documents"} title={parent ? "Your medical papers" : "Medical legal documents"}
        intro={parent ? "The papers that say who speaks for you and what care you want: health directives, living wills and medical powers of attorney." : "Every legal document about health care in one place: healthcare directives and living wills, medical and mental-health powers of attorney, the HIPAA authorization, the prehospital DNR, and Diana's signed comfort-care statements. Each card says where it stands and opens the scan when one is filed."}
        actions={<>{album && <a href={album.url} target="_blank" rel="noreferrer" className="btn-primary">Health Directives album ↗</a>}<Link href="/legal" className="btn-secondary">Legal board →</Link></>} />

      {canEdit && <div className="mb-6"><UploadFile section="legal" label="Upload a signed directive or POA" defaultNote="[Medical legal]" back="/health/legal" /></div>}

      {docs.length === 0 ? <Empty>No health-care documents on the Legal board yet.</Empty> : (
        <div className="flex flex-col gap-6">
          {who.map((p) => {
            const list = docs.filter((d) => d.principal === p);
            if (list.length === 0) return null;
            return (
              <section key={p}>
                <div className="mb-3 flex items-baseline justify-between gap-3 border-b-2 border-evergreen pb-2">
                  <h2 className="font-serif text-[1.6rem] font-semibold">{heading[p]}</h2>
                  <span className="text-[0.9rem] text-ink-soft">{list.length} {list.length === 1 ? "document" : "documents"}</span>
                </div>
                <ul className="grid gap-4 md:grid-cols-2">
                  {list.map((d) => {
                    const scan = scanFor(d, pool);
                    return (
                      <li key={d.id} className="card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold leading-snug">{d.title}</div>
                          <LegalStatusPill status={d.status} />
                        </div>
                        <div className="mt-1 text-[0.9rem] text-ink-soft">{d.signed_on ? `Signed ${fmtDate(d.signed_on, { year: "numeric" })}` : d.drafted_on ? `Drafted ${fmtDate(d.drafted_on, { year: "numeric" })}` : "No date recorded"}{d.prepared_by && ` · ${d.prepared_by}`}{!parent && p !== "both" && ` · ${subjectName(p)}`}</div>
                        {d.original_location && <div className="mt-1 text-[0.9rem]"><span className="text-ink-soft">Original: </span>{d.original_location}</div>}
                        {d.notes && <p className={`mt-2 ${parent ? "text-[1.05rem]" : "text-[0.95rem]"} text-ink-soft`}><Linked text={d.notes} ctx={ctx} /></p>}
                        {d.open_issue && <p className="mt-2 text-[0.95rem] text-ember">{d.open_issue}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {scan && <a href={`/files/${scan.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.9rem]">Open the scan ↗</a>}
                          {album && <a href={album.url} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.9rem]">Photos album ↗</a>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {!parent && (
        <div className="mt-6">
          <CollapsibleCard title="Signed pages on file" count={pages.length} defaultOpen={false}>
            <p className="mb-2 text-[0.9rem] text-ink-soft">Photographed pages from the 2026 Widow Book&rsquo;s Health Directive tab and anything uploaded here. Each opens from the app&rsquo;s private storage.</p>
            {pages.length === 0 ? <Empty>Nothing filed yet.</Empty> : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {pages.map((f, n) => (
                  <li key={f.id} className="flex min-h-[110px] flex-col rounded-xl border border-rule bg-white p-3 text-[0.85rem] shadow-sm">
                    <div className="font-semibold text-ink">{f.name.replace(/\.(pdf|jpe?g|png|heic|docx?)$/i, "")}</div>
                    <div className="line-clamp-3 text-ink-soft">{(f.target_note ?? "").replace(/^\[[^\]]*\]\s*/, "")}</div>
                    <div className="mt-auto flex items-end justify-between pt-2"><span className="text-[0.75rem] text-ink-soft">{n + 1}</span><a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a></div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>
        </div>
      )}
    </>
  );
}
