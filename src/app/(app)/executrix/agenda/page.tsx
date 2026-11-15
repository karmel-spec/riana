import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { UploadFile } from "@/components/upload-file";
import { AddAgendaItem, AgendaActions } from "./agenda-client";

export const metadata = { title: "Meeting Agenda" };

export default async function AgendaPage() {
  const v = await requireSection("legal");
  const [items, files, questions] = await Promise.all([data.getAgenda(v), data.getFiledDocuments(v), canRead(v, "urgent_questions") ? data.getQuestions(v) : Promise.resolve([])]);
  await data.logView(v, "legal", "agenda");
  const parent = v.brief;
  const canEdit = canWrite(v, "legal") && !parent;
  const fileById = new Map(files.map((f) => [f.id, f]));
  const taggedDocs = files.filter((f) => /^\[Agenda\]/i.test(f.target_note ?? "") && !items.some((i) => i.file_id === f.id));
  const openQs = questions.filter((q) => q.status === "open" || q.status === "asked");
  const open = items.filter((i) => i.status !== "resolved");
  const done = items.filter((i) => i.status === "resolved");
  const byKind = (k: string) => open.filter((i) => i.kind === k);

  const Item = ({ i }: { i: (typeof items)[number] }) => {
    const f = i.file_id ? fileById.get(i.file_id) : null;
    return (
      <li className="flex flex-wrap items-start justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className={`${parent ? "text-[1.15rem]" : ""} font-semibold`}>{i.text}{i.status === "discussed" && <span className="pill ml-2 bg-brass-tint text-brass-deep">discussed</span>}</div>
          {i.detail && <div className="mt-0.5 whitespace-pre-line text-[0.95rem] text-ink-soft">{i.detail}</div>}
          {f && <div className="mt-1 text-[0.9rem]"><a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="font-semibold text-evergreen">Open {f.name.replace(/\.[a-z0-9]+$/i, "")} ↗</a>{f.target_note && <span className="text-ink-soft"> · {f.target_note.replace(/^\[[^\]]*\]\s*/, "")}</span>}</div>}
          {i.question_id && <div className="text-[0.85rem] text-ink-soft">Also on <Link href="/questions">Questions</Link></div>}
          {i.outcome && <div className="mt-1 text-[0.95rem] text-evergreen">Decided: {i.outcome}</div>}
          {!parent && <div className="text-[0.8rem] text-ink-soft">Added {fmtDate(i.created_at, { year: "numeric" })}{i.added_by_name && ` by ${i.added_by_name}`}</div>}
        </div>
        {canEdit && <AgendaActions id={i.id} status={i.status} />}
      </li>
    );
  };

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Executrix · Next meeting"} title={parent ? "For our next meeting" : "Meeting agenda"}
        intro={parent ? "The questions and papers Heather and Karmel want to go over with you next time." : "What to go over with Rich and Diana at the next estate-planning meeting: the questions to settle and the documents to read together. Mark each one discussed or resolved as you go, with what was decided."}
        actions={<><Link href="/executrix" className="btn-secondary">Checklist →</Link><Link href="/questions" className="btn-secondary">Urgent Questions →</Link></>} />

      {canEdit && (
        <div className="mb-6 flex flex-col gap-3">
          <AddAgendaItem files={files.map((f) => ({ id: f.id, name: f.name }))} questions={openQs.map((q) => ({ id: q.id, question: q.question }))} />
          <UploadFile section="legal" label="Upload a document for the meeting" defaultNote="[Agenda]" back="/executrix/agenda" />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-[1.3rem] font-semibold">Questions to settle <span className="text-ink-soft">· {byKind("question").length}</span></h2>
          {byKind("question").length === 0 ? <Empty>No questions queued.</Empty> : <ul className="divide-y divide-rule-soft">{byKind("question").map((i) => <Item key={i.id} i={i} />)}</ul>}
        </section>
        <section className="card">
          <h2 className="text-[1.3rem] font-semibold">Documents to review <span className="text-ink-soft">· {byKind("document").length + taggedDocs.length}</span></h2>
          {byKind("document").length === 0 && taggedDocs.length === 0 ? <Empty>No documents queued.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {byKind("document").map((i) => <Item key={i.id} i={i} />)}
              {taggedDocs.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div><div className="font-semibold">{f.name.replace(/\.[a-z0-9]+$/i, "")}</div><div className="text-[0.85rem] text-ink-soft">{(f.target_note ?? "").replace(/^\[[^\]]*\]\s*/, "") || "Uploaded for the meeting"}</div></div>
                  <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {byKind("note").length > 0 && (
        <section className="card mt-5"><h2 className="text-[1.2rem] font-semibold">Notes</h2><ul className="divide-y divide-rule-soft">{byKind("note").map((i) => <Item key={i.id} i={i} />)}</ul></section>
      )}
      {done.length > 0 && (
        <section className="card mt-5"><h2 className="text-[1.2rem] font-semibold">Resolved <span className="text-ink-soft">· {done.length}</span></h2><ul className="divide-y divide-rule-soft">{done.map((i) => <Item key={i.id} i={i} />)}</ul></section>
      )}
    </>
  );
}
