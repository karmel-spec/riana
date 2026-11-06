"use client";

import { useActionState, useState, useTransition } from "react";
import { proposeContacts, reviewRianaUpdate } from "@/app/actions/records";

export function ReviewButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const go = (d: "approved" | "rejected") => start(async () => { const r = await reviewRianaUpdate(id, d); setErr(r.ok ? "" : r.error); });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => go("approved")} className="btn-primary px-4">Approve</button>
      <button type="button" disabled={pending} onClick={() => go("rejected")} className="btn-secondary px-4">Reject</button>
      {err && <span className="text-[0.85rem] text-ember">{err}</span>}
    </div>
  );
}

export function ProposeContacts() {
  const [state, action, pending] = useActionState(proposeContacts, null);
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <label htmlFor="pc-lines" className="label">One per line: Name | relationship | phone | email | rich, diana or both | professional</label>
      <textarea id="pc-lines" name="lines" rows={5} className="field font-mono text-[0.9rem]" placeholder={"Sample Attorney | Attorney (2021 will) | (555) 010-0701 | attorney@example.com | both | professional\nSample Old Friend | Navy buddy | (555) 010-0801 | | rich"} />
      <div className="flex items-center gap-3"><button type="submit" disabled={pending} className="btn-secondary">{pending ? "Queuing…" : "Queue for review"}</button>
        {state && (state.ok ? <span className="text-[0.9rem] text-evergreen">{state.data!.queued} queued above.</span> : <span className="text-[0.9rem] text-ember">{state.error}</span>)}</div>
    </form>
  );
}
