import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader, LegalStatusPill, Empty } from "@/components/ui";
import { LegalBoard } from "./legal-board";
import type { LegalStatus } from "@/lib/types";

export const metadata = { title: "Legal & Estate" };

const COLUMNS: { status: LegalStatus; label: string; tint: string; text: string }[] = [
  { status: "not_started", label: "Not started", tint: "bg-rule-soft/60", text: "text-ink-soft" },
  { status: "drafted", label: "Drafted", tint: "bg-brass-tint", text: "text-brass-deep" },
  { status: "signed", label: "Signed", tint: "bg-evergreen-tint", text: "text-evergreen" },
  { status: "recorded", label: "Recorded", tint: "bg-slate-tint", text: "text-slate" },
];

export default async function LegalPage() {
  const v = await requireSection("legal");
  const docs = await data.getLegalDocuments(v);
  await data.logView(v, "legal", "legal_documents");
  const parent = v.role === "parent";

  if (parent) {
    return (
      <>
        <PageHeader title="Your legal papers" intro="Where things stand. Karmel and Heather are taking care of the details." />
        <ul className="flex flex-col gap-3">
          {docs.filter((d) => d.status !== "superseded").map((d) => (
            <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[1.3rem] font-semibold">{d.title}</div>
                {d.original_location && <div className="text-ink-soft">Original: {d.original_location}</div>}
              </div>
              <LegalStatusPill status={d.status} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  const live = docs.filter((d) => d.status !== "superseded");
  const missingOriginal = live.filter((d) => ["signed", "recorded"].includes(d.status) && !d.original_location);
  const needsRecording = live.filter((d) => d.needs_recording && d.status === "signed");

  return (
    <>
      <PageHeader eyebrow="Section 11" title="Legal & estate documents"
        intro="Drafted → signed → recorded. Each card says where the original is kept and what still needs doing." />

      {(missingOriginal.length > 0 || needsRecording.length > 0) && (
        <div className="mb-6 rounded-2xl border border-ember/40 bg-ember-tint px-5 py-4">
          <strong className="text-ember">Needs attention:</strong>
          <ul className="mt-1 list-disc pl-5">
            {missingOriginal.map((d) => <li key={d.id}>{d.title} is signed, but nobody has written down where the original is.</li>)}
            {needsRecording.map((d) => <li key={d.id}>{d.title} is signed but not yet recorded with the county.</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = live.filter((d) => d.status === col.status);
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`} className={`rounded-2xl p-3 ${col.tint}`}>
              <h2 id={`col-${col.status}`} className={`mb-3 px-1 font-sans text-[0.85rem] font-bold uppercase tracking-wide ${col.text}`}>{col.label} · {items.length}</h2>
              {items.length === 0
                ? <Empty>{col.status === "recorded" ? "Deeds move here once recorded." : "None"}</Empty>
                : <LegalBoard docs={items} canEdit={canWrite(v, "legal")} />}
            </section>
          );
        })}
      </div>

      <section className="card mt-6">
        <h2 className="text-[1.3rem] font-semibold">Document history</h2>
        <p className="mt-1 text-ink-soft">The 2021 drafts (will, transfer-on-death deeds, easement amendment) are the starting point for the 2026 estate planning. Files themselves are uploaded in phase 2 and kept in private storage; this board tracks their status.</p>
      </section>
    </>
  );
}
