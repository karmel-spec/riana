"use client";

import { useActionState, useState, useTransition } from "react";
import { addCollectionItem, deleteCollectionItem } from "@/app/actions/collections";
import { FormDialog, Field } from "@/components/dialog";

export function AddCollectionButton({ defaultCategory = "book", people = [] }: { defaultCategory?: string; people?: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addCollectionItem, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const [category, setCategory] = useState(defaultCategory);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">+ Add an item</button>;
  return (
    <FormDialog title="Add a book, album or collection" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <p className="mb-3 text-[0.95rem] text-ink-soft">A link for things that live online (iMemories, Drive, a shared album) or a note of where the physical item is kept. Either is fine; both is best.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="co-cat" label="What is it">
          <select id="co-cat" name="category" className="field" value={category} onChange={(e) => setCategory(e.target.value)}><option value="book">Book</option><option value="photos">Photos</option><option value="imemories">iMemories</option><option value="digital_history">Digital family history</option><option value="love_letter">Love letter</option><option value="interview">Interview</option><option value="ancestor">Ancestor’s keepsake</option><option value="other">Other</option></select>
        </Field>
        <Field id="co-owner" label="Whose">
          <select id="co-owner" name="owner" className="field" defaultValue="diana"><option value="diana">Mom{category === "ancestor" ? "’s side" : ""}</option><option value="rich">Dad{category === "ancestor" ? "’s side" : ""}</option><option value="both">Both</option></select>
        </Field>
        {category === "ancestor" && <Field id="co-person" label="Whose it was (full name)" span><input id="co-person" name="person" required list="co-people" className="field" placeholder="First, middle and last name" /><datalist id="co-people">{people.map((p) => <option key={p} value={p} />)}</datalist></Field>}
        <Field id="co-title" label="Name" span><input id="co-title" name="title" required className="field" placeholder="Our Family Story, vol. 1" /></Field>
        <Field id="co-url" label="Link (if online)" span><input id="co-url" name="url" type="url" inputMode="url" className="field" placeholder="https://…" /></Field>
        <Field id="co-loc" label="Where it is kept" span><input id="co-loc" name="location" className="field" placeholder="Living room bookcase, second shelf" /></Field>
        <Field id="co-period" label="Years covered"><input id="co-period" name="period" className="field" placeholder="1970s" /></Field>
        <Field id="co-note" label="Note" span><input id="co-note" name="note" className="field" placeholder="What's in it, who it's meant for" /></Field>
      </div>
    </FormDialog>
  );
}

export function RemoveCollectionButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remove "${title}" from the list? The item itself is not touched.`)) start(() => { deleteCollectionItem(id); }); }} className="btn text-[0.9rem] text-ink-soft">Remove</button>
  );
}
