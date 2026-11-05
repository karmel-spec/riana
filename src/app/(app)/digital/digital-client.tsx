"use client";

import { useActionState, useState, useTransition } from "react";
import type { DigitalAccount } from "@/lib/types";
import { deleteDigitalAccount, saveDigitalAccount } from "@/app/actions/household";
import { FormDialog, Field } from "@/components/dialog";

export function DigitalEditor({ account }: { account?: DigitalAccount }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveDigitalAccount, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const a = account;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={a ? "btn-secondary px-3 text-[0.9rem]" : "btn-primary"}>{a ? "Edit" : "+ Add an account"}</button>;
  return (
    <FormDialog title={a ? `Edit ${a.service}` : "Add an online account"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="da-service" label="Service"><input id="da-service" name="service" defaultValue={a?.service ?? ""} required className="field" placeholder="Gmail, Apple ID, the bank's website…" /></Field>
        <Field id="da-owner" label="Whose"><select id="da-owner" name="owner" defaultValue={a?.owner ?? "both"} className="field"><option value="both">Rich & Diana</option><option value="rich">Rich</option><option value="diana">Diana</option></select></Field>
        <Field id="da-purpose" label="What it's for" span><input id="da-purpose" name="purpose" defaultValue={a?.purpose ?? ""} className="field" /></Field>
        <Field id="da-vault" label="Name of the item in the password vault" span><input id="da-vault" name="vault_item" defaultValue={a?.vault_item ?? ""} className="field" placeholder="e.g. Rich – Gmail" /></Field>
        <Field id="da-after" label="What to do with it later" span><input id="da-after" name="after_death" defaultValue={a?.after_death ?? ""} className="field" placeholder="Close, memorialize, transfer to…" /></Field>
        <Field id="da-notes" label="Notes" span><textarea id="da-notes" name="notes" rows={2} defaultValue={a?.notes ?? ""} className="field" /></Field>
      </div>
      <p className="text-[0.85rem] text-ink-soft">Never type the password itself. The form will refuse it.</p>
    </FormDialog>
  );
}

export function DigitalRowActions({ account }: { account: DigitalAccount }) {
  const [, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex shrink-0 gap-1">
      <DigitalEditor account={account} />
      {confirm
        ? <><button type="button" onClick={() => start(() => { deleteDigitalAccount(account.id); })} className="btn px-3 text-[0.9rem] text-ember">Remove</button><button type="button" onClick={() => setConfirm(false)} className="btn px-2 text-[0.9rem] text-ink-soft">Keep</button></>
        : <button type="button" aria-label={`Remove ${account.service}`} onClick={() => setConfirm(true)} className="btn px-2 text-[0.9rem] text-ink-soft">×</button>}
    </div>
  );
}
