"use client";

import { useActionState, useState } from "react";
import type { UrgentQuestion } from "@/lib/types";
import { answerQuestion, setQuestionStatus } from "@/app/actions/records";
import { QuestionStatusPill, SourceTag, Empty } from "@/components/ui";
import { fmtDate, relative, subjectName } from "@/lib/format";
import { SECTION_LABELS } from "@/lib/permissions";

type ViewerInfo = { role: string; brief: boolean; canEdit: boolean; name: string };

export function QuestionList({ title, questions, viewer, collapsed = false }: {
  title: string; questions: UrgentQuestion[]; viewer: ViewerInfo; collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <section>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="mb-3 flex items-center gap-2 font-serif text-[1.5rem] font-semibold text-ink">
        <span aria-hidden className="text-ink-soft">{open ? "▾" : "▸"}</span>{title}
      </button>
      {open && (questions.length === 0 ? <Empty>Nothing here.</Empty> : (
        <ul className="flex flex-col gap-4">
          {questions.map((q) => <QuestionCard key={q.id} q={q} viewer={viewer} />)}
        </ul>
      ))}
    </section>
  );
}

function QuestionCard({ q, viewer }: { q: UrgentQuestion; viewer: ViewerInfo }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(answerQuestion, null);
  const parent = viewer.brief;
  const answered = ["answered", "closed"].includes(q.status);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) { setLastState(state); if (state?.ok) setEditing(false); }

  return (
    <li id={q.id} className="card scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {q.priority === "high" && !answered && <span className="pill bg-ember-tint text-ember">Important</span>}
            <QuestionStatusPill status={q.status} />
            <SourceTag source={q.source} />
          </div>
          <h3 className={`mt-2 font-semibold leading-snug ${parent ? "text-[1.5rem]" : "text-[1.25rem]"}`}>{q.question}</h3>
          {!parent && (
            <div className="mt-1 text-[0.9rem] text-ink-soft">
              Ask {subjectName(q.asked_of)} · Owner: {q.owner_name ?? "—"}
              {q.topic && <> · {SECTION_LABELS[q.topic]}</>}
              {q.due_on && <> · due {fmtDate(q.due_on)} ({relative(q.due_on)})</>}
            </div>
          )}
        </div>
      </div>

      {q.answer && !editing && (
        <blockquote className="mt-4 rounded-xl border-l-4 border-evergreen bg-evergreen-tint/60 px-4 py-3">
          <div className="eyebrow text-evergreen">{q.answered_by ? `${subjectName(q.answered_by)}'s answer` : "Answer"}{q.answered_at ? ` · ${fmtDate(q.answered_at, { year: "numeric" })}` : ""}</div>
          <p className="mt-1 whitespace-pre-line">{q.answer}</p>
        </blockquote>
      )}

      {viewer.canEdit && (editing || (!q.answer && parent)) ? (
        <form action={action} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="id" value={q.id} />
          <label htmlFor={`a-${q.id}`} className="label">{parent ? "Your answer" : "Answer from Mom and Dad"}</label>
          <textarea id={`a-${q.id}`} name="answer" rows={parent ? 4 : 3} defaultValue={q.answer ?? ""} required className="field" placeholder={parent ? "Type here, or ask one of the kids to type for you." : "What did they say?"} />
          {state && !state.ok && <p className="text-ember">{state.error}</p>}
          <div className="flex flex-wrap gap-3">
            <button name="status" value="answered" className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save answer"}</button>
            <button name="status" value="partly_answered" className="btn-secondary" disabled={pending}>Save as partly answered</button>
            <button type="button" disabled={pending} onClick={() => { if (window.confirm("Dismiss this question? It moves to the answered list without an answer.")) setQuestionStatus(q.id, "closed"); }} className="btn text-ink-soft">Dismiss</button>
            {editing && <button type="button" onClick={() => setEditing(false)} className="btn text-ink-soft">Cancel</button>}
          </div>
        </form>
      ) : viewer.canEdit ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => setEditing(true)} className={q.answer ? "btn-secondary" : "btn-primary"}>{q.answer ? "Change the answer" : "Write the answer"}</button>
          {!parent && q.status === "open" && <button type="button" onClick={() => setQuestionStatus(q.id, "asked")} className="btn-secondary">Mark as asked</button>}
          {!parent && answered && q.status !== "closed" && <button type="button" onClick={() => setQuestionStatus(q.id, "closed")} className="btn text-ink-soft">Close</button>}
        </div>
      ) : null}
    </li>
  );
}
