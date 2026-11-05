"use client";

import { useActionState, useState } from "react";
import type { Property } from "@/lib/types";
import { saveProperty } from "@/app/actions/property";
import { FormDialog, Field } from "@/components/dialog";

export function PropertyEditor({ property, managers }: { property?: Property; managers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveProperty, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const p = property;

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={p ? "btn-secondary px-4 text-[0.95rem]" : "btn-primary"}>{p ? "Edit" : "+ Add a property"}</button>;
  return (
    <FormDialog title={p ? `Edit ${p.name}` : "Add a property"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pr-name" label="Name"><input id="pr-name" name="name" defaultValue={p?.name ?? ""} required className="field" placeholder="Rental A · Tumwater" /></Field>
        <Field id="pr-kind" label="Type">
          <select id="pr-kind" name="kind" defaultValue={p?.kind ?? "rental"} className="field"><option value="residence">Home</option><option value="rental">Rental</option><option value="land">Land</option><option value="other">Other</option></select>
        </Field>
        <Field id="pr-addr" label="Address" span><input id="pr-addr" name="address" defaultValue={p?.address ?? ""} className="field" /></Field>
        <Field id="pr-held" label="Held by"><input id="pr-held" name="held_by" defaultValue={p?.held_by ?? ""} className="field" placeholder="Rich & Diana, StarLar…" /></Field>
        <Field id="pr-hoa" label="HOA"><input id="pr-hoa" name="hoa_name" defaultValue={p?.hoa_name ?? ""} className="field" /></Field>
        <Field id="pr-mgr" label="Property manager" span>
          <select id="pr-mgr" name="manager_person_id" defaultValue={p?.manager_person_id ?? ""} className="field"><option value="">—</option>{managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </Field>
        <Field id="pr-succ" label="What happens to it later" span><textarea id="pr-succ" name="succession_plan" rows={2} defaultValue={p?.succession_plan ?? ""} className="field" placeholder="e.g. 50/50 to two children via TOD deed, outside the will" /></Field>
        <Field id="pr-notes" label="Notes" span><textarea id="pr-notes" name="notes" rows={2} defaultValue={p?.notes ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}
