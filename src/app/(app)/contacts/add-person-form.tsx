"use client";

import { useActionState, useState } from "react";
import type { ContactGroup } from "@/lib/types";
import { addPerson } from "@/app/actions/records";
import { Close } from "@/components/icons";

export function AddPersonForm({ groups, parent }: { groups: ContactGroup[]; parent: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addPerson, null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) { setLastState(state); if (state?.ok) setOpen(false); }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">{parent ? "+ Someone is missing" : "+ Add a person"}</button>;
  return (
    <div role="dialog" aria-labelledby="ap-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <form action={action} className="card flex max-h-[95dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 id="ap-title" className="text-[1.4rem] font-semibold">{parent ? "Who should we add?" : "Add a person"}</h2>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        <div><label htmlFor="ap-name" className="label">Name</label><input id="ap-name" name="full_name" required className="field" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="ap-rel" className="label">How you know them</label><input id="ap-rel" name="relationship" className="field" placeholder="Neighbor, cousin, bishop…" /></div>
          <div>
            <label htmlFor="ap-con" className="label">{parent ? "Whose friend?" : "Connected to"}</label>
            <select id="ap-con" name="connected_to" className="field" defaultValue="both">
              <option value="both">Both of us</option><option value="rich">Rich</option><option value="diana">Diana</option>
            </select>
          </div>
          <div><label htmlFor="ap-phone" className="label">Phone</label><input id="ap-phone" name="phone" type="tel" inputMode="tel" className="field" /></div>
          <div><label htmlFor="ap-email" className="label">Email</label><input id="ap-email" name="email" type="email" inputMode="email" className="field" /></div>
          <div><label htmlFor="ap-city" className="label">City</label><input id="ap-city" name="city" className="field" /></div>
          <div>
            <label htmlFor="ap-method" className="label">Best way to reach them</label>
            <select id="ap-method" name="preferred_method" className="field" defaultValue="">
              <option value="">—</option><option value="phone">Phone call</option><option value="text">Text</option><option value="email">Email</option><option value="mail">Letter</option><option value="in_person">In person</option>
            </select>
          </div>
          {!parent && (
            <div className="sm:col-span-2">
              <label htmlFor="ap-group" className="label">Group</label>
              <select id="ap-group" name="group_id" className="field" defaultValue="">
                <option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div><label htmlFor="ap-notes" className="label">Notes</label><textarea id="ap-notes" name="notes" rows={2} className="field" placeholder={parent ? "Anything the kids should know" : ""} /></div>
        {state && !state.ok && <p className="text-ember">{state.error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
