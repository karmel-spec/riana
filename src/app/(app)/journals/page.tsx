import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate, subjectName } from "@/lib/format";
import { Book } from "@/components/icons";
import { AddJournalButton, RemoveJournalButton } from "./journals-client";

export const metadata = { title: "Journals" };

const KIND: Record<string, string> = { blog: "Blog", google_doc: "Google Doc", drive_folder: "Drive folder", scan: "Scanned pages", other: "Link" };

export default async function JournalsPage() {
  const v = await requireSection("family_history");
  const journals = await data.getJournals(v);
  await data.logView(v, "family_history", "journals");
  const parent = v.brief;
  const canEdit = canWrite(v, "family_history") && !parent;
  const byAuthor = (["diana", "rich", "both"] as const).map((a) => ({ a, list: journals.filter((j) => j.author === a) })).filter((g) => g.list.length > 0);

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 16 · Journals"} title={parent ? "Your journals" : "Journals & blogs"}
        intro={parent ? "Your writing over the years: journals, the blog, and scanned pages. Tap one to open it." : "Journals, blogs and diaries kept over the years. Each entry is a link to where the writing lives: a Google Doc, a blog export, or a Drive folder of scanned pages."}
        actions={canEdit ? <AddJournalButton /> : undefined} />

      {journals.length === 0 ? <Empty>No journals linked yet.</Empty> : (
        <div className="flex flex-col gap-6">
          {byAuthor.map(({ a, list }) => (
            <section key={a} className="card">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><Book size={22} /></div>
                <h2 className="text-[1.35rem] font-semibold leading-tight">{a === "both" ? "Shared" : subjectName(a)}</h2>
              </div>
              <ul className="divide-y divide-rule-soft">
                {list.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className={`font-semibold ${parent ? "text-[1.3rem]" : "text-[1.1rem]"}`}>{j.title}</div>
                      <div className="text-[0.95rem] text-ink-soft">{KIND[j.kind]}{j.period && ` · ${j.period}`}</div>
                      {j.note && <div className="text-[0.95rem] text-ink-soft">{j.note}</div>}
                      {!parent && <div className="text-[0.8rem] text-ink-soft">Added {fmtDate(j.created_at, { year: "numeric" })}{j.added_by_name && ` by ${j.added_by_name}`}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={j.url} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Open ↗</a>
                      {canEdit && <RemoveJournalButton id={j.id} title={j.title} />}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
