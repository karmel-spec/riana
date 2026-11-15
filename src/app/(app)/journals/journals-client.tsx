"use client";

import { useActionState, useState, useTransition } from "react";
import { addJournal, deleteJournal } from "@/app/actions/journals";
import { FormDialog, Field } from "@/components/dialog";

export function AddJournalButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addJournal, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">+ Add a journal</button>;
  return (
    <FormDialog title="Add a journal or blog" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <p className="mb-3 text-[0.95rem] text-ink-soft">Paste a link to a Google Doc, a blog, or a Drive folder of scanned pages. The app keeps the link; the writing stays where it is.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="jn-title" label="Name" span><input id="jn-title" name="title" required className="field" placeholder="Diana's blog, 2009–2015" /></Field>
        <Field id="jn-url" label="Link" span><input id="jn-url" name="url" type="url" required inputMode="url" className="field" placeholder="https://docs.google.com/document/d/…" /></Field>
        <Field id="jn-author" label="Whose">
          <select id="jn-author" name="author" className="field" defaultValue="both"><option value="diana">Diana</option><option value="rich">Rich</option><option value="both">Both</option></select>
        </Field>
        <Field id="jn-period" label="Years covered"><input id="jn-period" name="period" className="field" placeholder="2009–2015" /></Field>
        <Field id="jn-note" label="Note" span><input id="jn-note" name="note" className="field" placeholder="What it is, where it came from" /></Field>
      </div>
    </FormDialog>
  );
}

export function RemoveJournalButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remove "${title}" from the journals list? The document itself is not touched.`)) start(() => { deleteJournal(id); }); }} className="btn text-[0.9rem] text-ink-soft">Remove</button>
  );
}
