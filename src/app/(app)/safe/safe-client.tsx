"use client";

import { useActionState, useState, useTransition } from "react";
import type { SafeItem } from "@/lib/types";
import { deleteSafeItem, saveSafeItem } from "@/app/actions/safe";
import { FormDialog, Field } from "@/components/dialog";

const CATS: [SafeItem["category"], string][] = [["document", "Document"], ["cash", "Cash"], ["keys", "Keys"], ["jewelry", "Jewelry & valuables"], ["media", "Photos, drives & media"], ["other", "Other"]];

export function SafeItemEditor({ item, safes }: { item?: SafeItem; safes: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveSafeItem, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const i = item;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={i ? "btn text-[0.9rem] text-ink-soft" : "btn-primary"}>{i ? "Edit" : "+ Add an item"}</button>;
  return (
    <FormDialog title={i ? `Edit: ${i.name}` : "What is in the safe?"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {i && <input type="hidden" name="id" value={i.id} />}
      <p className="mb-3 text-[0.95rem] text-ink-soft">Describe the item and where it sits. Never type the combination, a code or a full account number here; refer to the vault item by name.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sf-safe" label="Which safe"><input id="sf-safe" name="safe_name" list="sf-safes" defaultValue={i?.safe_name ?? safes[0] ?? "Home safe"} required className="field" /><datalist id="sf-safes">{safes.map((s) => <option key={s} value={s} />)}</datalist></Field>
        <Field id="sf-cat" label="Kind"><select id="sf-cat" name="category" defaultValue={i?.category ?? "document"} className="field">{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="sf-name" label="What it is" span><input id="sf-name" name="name" required defaultValue={i?.name ?? ""} className="field" placeholder="Signed 2021 wills (originals)" /></Field>
        <Field id="sf-detail" label="Details" span><textarea id="sf-detail" name="detail" rows={3} defaultValue={i?.detail ?? ""} className="field" placeholder="Which envelope or shelf, what it is for, who it is meant for" /></Field>
        <Field id="sf-on" label="Last checked"><input id="sf-on" type="date" name="confirmed_on" defaultValue={i?.confirmed_on ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function RemoveSafeItemButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remove "${name}" from the safe list?`)) start(() => { deleteSafeItem(id); }); }} className="btn text-[0.9rem] text-ember">Remove</button>;
}
