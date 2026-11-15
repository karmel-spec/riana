"use client";

import { useActionState, useState } from "react";
import type { ContactGroup, Person } from "@/lib/types";
import { updatePerson } from "@/app/actions/records";
import { Close } from "@/components/icons";

export function EditPersonForm({ person: p, groups }: { person: Person; groups: ContactGroup[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updatePerson, null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) { setLastState(state); if (state?.ok) setOpen(false); }
  const id = (f: string) => `ep-${p.id}-${f}`;

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn text-[0.9rem] text-ink-soft">Edit</button>;
  return (
    <div role="dialog" aria-labelledby={id("title")} className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <form action={action} className="card flex max-h-[95dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-b-none sm:rounded-2xl">
        <input type="hidden" name="id" value={p.id} />
        <div className="flex items-center justify-between">
          <h2 id={id("title")} className="text-[1.4rem] font-semibold">Edit {p.full_name}</h2>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        <div><label htmlFor={id("name")} className="label">Name</label><input id={id("name")} name="full_name" required defaultValue={p.full_name} className="field" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor={id("rel")} className="label">How you know them</label><input id={id("rel")} name="relationship" defaultValue={p.relationship ?? ""} className="field" /></div>
          <div>
            <label htmlFor={id("con")} className="label">Connected to</label>
            <select id={id("con")} name="connected_to" className="field" defaultValue={p.connected_to}>
              <option value="both">Both</option><option value="rich">Rich</option><option value="diana">Diana</option>
            </select>
          </div>
          <div><label htmlFor={id("phone")} className="label">Phone</label><input id={id("phone")} name="phone" type="tel" inputMode="tel" defaultValue={p.phone ?? ""} className="field" /></div>
          <div><label htmlFor={id("email")} className="label">Email</label><input id={id("email")} name="email" type="email" inputMode="email" defaultValue={p.email ?? ""} className="field" /></div>
          <div><label htmlFor={id("city")} className="label">City</label><input id={id("city")} name="city" defaultValue={p.city ?? ""} className="field" /></div>
          <div>
            <label htmlFor={id("method")} className="label">Best way to reach them</label>
            <select id={id("method")} name="preferred_method" className="field" defaultValue={p.preferred_method ?? ""}>
              <option value="">—</option><option value="phone">Phone call</option><option value="text">Text</option><option value="email">Email</option><option value="mail">Letter</option><option value="in_person">In person</option>
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label">Tags</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <label key={g.id} className="flex min-h-[40px] items-center gap-2 rounded-full border border-rule px-3 text-[0.95rem]">
                <input type="checkbox" name="group_ids" value={g.id} defaultChecked={p.group_ids.includes(g.id)} className="h-4 w-4 accent-evergreen" />{g.name}
              </label>
            ))}
          </div>
          <input name="new_group" className="field mt-2" placeholder="New tag, e.g. Neighbors" maxLength={60} />
        </fieldset>
        <div><label htmlFor={id("notes")} className="label">Notes</label><textarea id={id("notes")} name="notes" rows={3} defaultValue={p.notes ?? ""} className="field" /></div>
        {state && !state.ok && <p className="text-ember">{state.error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
