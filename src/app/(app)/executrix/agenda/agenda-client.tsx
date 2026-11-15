"use client";

import { useActionState, useState, useTransition } from "react";
import { addAgendaItem, removeAgendaItem, setAgendaStatus } from "@/app/actions/agenda";

type FileRef = { id: string; name: string };
type QRef = { id: string; question: string };

export function AddAgendaItem({ files, questions }: { files: FileRef[]; questions: QRef[] }) {
  const [open, setOpen] = useState<null | "question" | "document" | "note">(null);
  const [state, action, pending] = useActionState(addAgendaItem, null);
  const [q, setQ] = useState("");
  const [fileQ, setFileQ] = useState("");
  const [fileId, setFileId] = useState("");
  const hits = fileQ.trim().length >= 2 ? files.filter((f) => f.name.toLowerCase().includes(fileQ.trim().toLowerCase())).slice(0, 8) : [];
  if (!open) return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen("question")} className="btn-primary">+ Question</button>
      <button type="button" onClick={() => setOpen("document")} className="btn-secondary">+ Document to review</button>
      <button type="button" onClick={() => setOpen("note")} className="btn-secondary">+ Note</button>
    </div>
  );
  return (
    <form action={action} className="card flex flex-col gap-3">
      <input type="hidden" name="kind" value={open} />
      <div className="font-semibold">{open === "question" ? "A question for the meeting" : open === "document" ? "A document to review" : "A note"}</div>
      {open === "question" && questions.length > 0 && (
        <label className="label">Pull in an open Urgent Question (optional)
          <select name="question_id" className="field mt-1" onChange={(e) => { const sel = questions.find((x) => x.id === e.target.value); if (sel) setQ(sel.question); }}>
            <option value="">—</option>
            {questions.map((x) => <option key={x.id} value={x.id}>{x.question.slice(0, 110)}</option>)}
          </select>
        </label>
      )}
      {open === "document" && (
        <label className="label">Find the document (type part of its name)
          <input value={fileQ} onChange={(e) => { setFileQ(e.target.value); setFileId(""); }} className="field mt-1" placeholder="e.g. Memorandum" />
          {hits.length > 0 && !fileId && <ul className="mt-1 divide-y divide-rule-soft rounded-xl border border-rule-soft bg-paper">{hits.map((f) => <li key={f.id}><button type="button" onClick={() => { setFileId(f.id); setFileQ(f.name); if (!q) setQ(f.name.replace(/\.[a-z0-9]+$/i, "")); }} className="block w-full px-3 py-2 text-left hover:bg-paper-warm">{f.name}</button></li>)}</ul>}
          <input type="hidden" name="file_id" value={fileId} />
        </label>
      )}
      <label className="label">{open === "question" ? "The question" : open === "document" ? "What to review, in one line" : "The note"}
        <input name="text" value={q} onChange={(e) => setQ(e.target.value)} required maxLength={600} className="field mt-1" />
      </label>
      <label className="label">Details (optional)<textarea name="detail" rows={3} maxLength={2000} className="field mt-1" /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || (open === "document" && !fileId)} className="btn-primary">{pending ? "Adding…" : "Add to the agenda"}</button>
        <button type="button" onClick={() => setOpen(null)} className="btn-secondary">Cancel</button>
        {state && !state.ok && <span className="text-[0.9rem] text-ember">{state.error}</span>}
      </div>
    </form>
  );
}

export function AgendaActions({ id, status }: { id: string; status: "open" | "discussed" | "resolved" }) {
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState("");
  const go = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => start(async () => { const r = await fn(); setErr(r.ok ? "" : r.error); });
  if (asking) return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What was decided" className="field min-w-[220px] flex-1 py-1.5 text-[0.9rem]" />
      <button type="button" disabled={pending} onClick={() => { go(() => setAgendaStatus(id, "resolved", outcome)); setAsking(false); }} className="btn-primary px-3 py-1 text-[0.85rem]">Resolved</button>
      <button type="button" onClick={() => setAsking(false)} className="btn-secondary px-3 py-1 text-[0.85rem]">Back</button>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "open" && <button type="button" disabled={pending} onClick={() => go(() => setAgendaStatus(id, "discussed"))} className="btn-secondary px-3 py-1 text-[0.85rem]">Discussed</button>}
      {status !== "resolved" && <button type="button" disabled={pending} onClick={() => setAsking(true)} className="btn-secondary px-3 py-1 text-[0.85rem]">Resolve…</button>}
      {status !== "open" && <button type="button" disabled={pending} onClick={() => go(() => setAgendaStatus(id, "open"))} className="btn-secondary px-3 py-1 text-[0.85rem]">Reopen</button>}
      <button type="button" disabled={pending} onClick={() => { if (window.confirm("Remove this from the agenda?")) go(() => removeAgendaItem(id)); }} className="text-[0.85rem] text-ember">Remove</button>
      {err && <span className="text-[0.85rem] text-ember">{err}</span>}
    </div>
  );
}
