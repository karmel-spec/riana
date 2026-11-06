"use client";

import { useActionState, useState } from "react";
import { shareUpdate } from "@/app/actions/records";
import { SECTION_LABELS } from "@/lib/permissions";
import { Close } from "@/components/icons";

export function ShareUpdateButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(shareUpdate, null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) { setLastState(state); if (state?.ok) setOpen(false); }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">+ Add an update</button>;
  return (
    <div role="dialog" aria-labelledby="su-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <form action={action} className="card flex w-full max-w-[560px] flex-col gap-4 rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 id="su-title" className="text-[1.4rem] font-semibold">Share an update</h2>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        <p className="text-[0.95rem] text-ink-soft">Something the family should know: a change, a new detail, a reminder. It goes to the admins’ inbox for review before anything in the binder changes.</p>
        <div>
          <label htmlFor="su-text" className="label">The update</label>
          <textarea id="su-text" name="text" rows={4} required minLength={3} maxLength={2000} className="field" placeholder="e.g. Dad’s cardiology follow-up moved to March 12 at 10:30." />
        </div>
        <div>
          <label htmlFor="su-section" className="label">About</label>
          <select id="su-section" name="section" className="field" defaultValue="">
            <option value="">—</option>
            {Object.entries(SECTION_LABELS).filter(([k]) => !["admin", "notify"].includes(k)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {state && !state.ok && <p className="text-ember">{state.error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send for review"}</button>
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
