"use client";

import { useActionState, useState } from "react";
import { addQuestion } from "@/app/actions/records";
import { SECTION_LABELS } from "@/lib/permissions";
import { Close } from "@/components/icons";

export function NewQuestionForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(addQuestion, null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) { setLastState(state); if (state?.ok) setOpen(false); }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">+ New question</button>;
  return (
    <div role="dialog" aria-labelledby="nq-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <form action={action} className="card flex w-full max-w-[560px] flex-col gap-4 rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 id="nq-title" className="text-[1.4rem] font-semibold">New question for Mom & Dad</h2>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        <div>
          <label htmlFor="nq-q" className="label">The question</label>
          <textarea id="nq-q" name="question" rows={3} required className="field" placeholder="e.g. Where is the key to the safe deposit box?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nq-who" className="label">Ask</label>
            <select id="nq-who" name="asked_of" className="field" defaultValue="both">
              <option value="both">Mom and Dad</option><option value="diana">Mom</option><option value="rich">Dad</option>
            </select>
          </div>
          <div>
            <label htmlFor="nq-pri" className="label">Priority</label>
            <select id="nq-pri" name="priority" className="field" defaultValue="normal">
              <option value="normal">Normal</option><option value="high">Important</option>
            </select>
          </div>
          <div>
            <label htmlFor="nq-owner" className="label">Who will ask</label>
            <input id="nq-owner" name="owner_name" className="field" placeholder="Karmel" />
          </div>
          <div>
            <label htmlFor="nq-topic" className="label">About</label>
            <select id="nq-topic" name="topic" className="field" defaultValue="">
              <option value="">—</option>
              {Object.entries(SECTION_LABELS).filter(([k]) => !["admin", "notify"].includes(k)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
        {state && !state.ok && <p className="text-ember">{state.error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add question"}</button>
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
