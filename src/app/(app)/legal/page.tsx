import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader, LegalStatusPill, Stat } from "@/components/ui";
import { JourneyMap } from "./journey-map";
import type { LegalStatus } from "@/lib/types";
import { scanMap } from "@/lib/legal/scans";
import { TZ } from "@/lib/format";

export const metadata = { title: "Legal & Estate" };


export default async function LegalPage() {
  const v = await requireSection("legal");
  const [docs, filed, widow] = await Promise.all([data.getLegalDocuments(v), data.getFiledDocuments(v), data.getWidowBook(v)]);
  // Each document's digital copy, matched by title among the filed scans the viewer may open.
  const scans = scanMap(docs, [...filed, ...widow.filter((w) => !filed.some((f) => f.id === w.id))]);
  await data.logView(v, "legal", "legal_documents");
  const parent = v.brief;

  if (parent) {
    return (
      <>
        <PageHeader title="Your legal papers" intro="Where things stand. Karmel and Heather are taking care of the details." />
        <ul className="flex flex-col gap-3">
          {docs.filter((d) => d.status !== "superseded").map((d) => (
            <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[1.3rem] font-semibold">{scans[d.id] ? <a href={`/files/${scans[d.id]}`} target="_blank" rel="noreferrer" className="text-evergreen underline underline-offset-2">{d.title} ↗</a> : d.title}</div>
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
  const blocked = live.filter((d) => d.open_issue).length;
  const missingOriginal = live.filter((d) => ["signed", "recorded"].includes(d.status) && !d.original_location).length;
  const n = (st: LegalStatus) => live.filter((d) => d.status === st).length;

  return (
    <>
      <PageHeader eyebrow="Section 11" title="Legal & estate documents"
        intro="Each document moves along the same track: started, drafted, signed, recorded. The gold dot is where it is now; the red word is the one thing that moves it forward." />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Signed or recorded" value={n("signed") + n("recorded")} note={missingOriginal ? `${missingOriginal} original${missingOriginal === 1 ? "" : "s"} unlocated` : "all originals located"} tone="evergreen" />
        <Stat label="Drafted, unsigned" value={n("drafted")} tone={n("drafted") ? "ember" : "ink"} />
        <Stat label="Not started" value={n("not_started")} />
        <Stat label="With an open issue" value={blocked} tone={blocked ? "ember" : "evergreen"} />
      </section>

      <JourneyMap docs={docs} canEdit={canWrite(v, "legal")} scans={scans} today={new Date().toLocaleDateString("en-CA", { timeZone: TZ })} />
    </>
  );
}
