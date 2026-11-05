"use client";

import { useActionState, useState } from "react";
import type { LegalDocument } from "@/lib/types";
import { updateLegalDocument } from "@/app/actions/records";
import { fmtDate, subjectName } from "@/lib/format";
import { SourceTag } from "@/components/ui";

export function LegalBoard({ docs, canEdit }: { docs: LegalDocument[]; canEdit: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {docs.map((d) => <Card key={d.id} d={d} canEdit={canEdit} />)}
    </ul>
  );
}

function Card({ d, canEdit }: { d: LegalDocument; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateLegalDocument, null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) { setLastState(state); if (state?.ok) setEditing(false); }

  return (
    <li className="rounded-xl border border-rule bg-paper p-3">
      <div className="font-semibold leading-snug">{d.title}</div>
      <div className="mt-0.5 text-[0.85rem] text-ink-soft">
        {subjectName(d.principal)}{d.prepared_by && ` · ${d.prepared_by}`}
        {d.signed_on && ` · signed ${fmtDate(d.signed_on, { year: "numeric" })}`}
        {d.recorded_on && ` · recorded ${fmtDate(d.recorded_on, { year: "numeric" })}`}
        {" "}<SourceTag source={d.source} />
      </div>
      {d.original_location && <div className="mt-1 text-[0.9rem]">Original: <strong>{d.original_location}</strong></div>}
      {!d.original_location && ["signed", "recorded"].includes(d.status) && <div className="mt-1 text-[0.9rem] font-semibold text-ember">Original: location unknown</div>}
      {d.open_issue && <div className="mt-1 rounded-lg bg-brass-tint px-2 py-1 text-[0.9rem] text-brass-deep">{d.open_issue}</div>}

      {canEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="mt-2 min-h-[36px] text-[0.9rem] font-semibold text-evergreen">Update</button>}
      {editing && (
        <form action={action} className="mt-3 flex flex-col gap-2 border-t border-rule-soft pt-3">
          <input type="hidden" name="id" value={d.id} />
          <label className="label" htmlFor={`st-${d.id}`}>Status</label>
          <select id={`st-${d.id}`} name="status" defaultValue={d.status} className="field">
            <option value="not_started">Not started</option><option value="drafted">Drafted</option>
            <option value="signed">Signed</option><option value="recorded">Recorded</option><option value="superseded">Superseded</option>
          </select>
          <label className="label" htmlFor={`loc-${d.id}`}>Where is the original?</label>
          <input id={`loc-${d.id}`} name="original_location" defaultValue={d.original_location ?? ""} className="field" placeholder="Home safe, attorney's office…" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor={`sg-${d.id}`}>Signed on</label><input id={`sg-${d.id}`} type="date" name="signed_on" defaultValue={d.signed_on ?? ""} className="field" /></div>
            <div><label className="label" htmlFor={`rc-${d.id}`}>Recorded on</label><input id={`rc-${d.id}`} type="date" name="recorded_on" defaultValue={d.recorded_on ?? ""} className="field" /></div>
          </div>
          <label className="label" htmlFor={`oi-${d.id}`}>Open issue</label>
          <input id={`oi-${d.id}`} name="open_issue" defaultValue={d.open_issue ?? ""} className="field" placeholder="What still needs doing?" />
          {state && !state.ok && <p className="text-ember">{state.error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary px-4" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}
