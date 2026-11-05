"use client";

import { useActionState, useState, useTransition } from "react";
import type { DigitalAccount } from "@/lib/types";
import { deleteDigitalAccount, importAccountsCsv, saveDigitalAccount } from "@/app/actions/household";
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
        <Field id="da-service" label="Account"><input id="da-service" name="service" defaultValue={a?.service ?? ""} required className="field" placeholder="Gmail, Apple ID, the bank's website…" /></Field>
        <Field id="da-site" label="Website"><input id="da-site" name="website" type="url" defaultValue={a?.website ?? ""} className="field" placeholder="https://" /></Field>
        <Field id="da-owner" label="Whose"><select id="da-owner" name="owner" defaultValue={a?.owner ?? "both"} className="field"><option value="both">Joint</option><option value="rich">Rich</option><option value="diana">Diana</option></select></Field>
        <Field id="da-cat" label="Category"><input id="da-cat" name="category" defaultValue={a?.category ?? ""} className="field" list="da-cats" placeholder="Banking, Utilities, Health…" /><datalist id="da-cats">{["Email", "Banking", "Investments", "Government", "Utilities", "Rentals", "Health", "Devices", "Shopping", "Entertainment", "Church", "Social", "Travel", "Photos"].map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field id="da-status" label="Status"><select id="da-status" name="status" defaultValue={a?.status ?? "to_find"} className="field"><option value="to_find">Still to find</option><option value="found">In the vault</option></select></Field>
        <Field id="da-vname" label="Vault"><input id="da-vname" name="vault_name" defaultValue={a?.vault_name ?? "Greene Family"} className="field" /></Field>
        <Field id="da-vault" label="Vault item name" span><input id="da-vault" name="vault_item" defaultValue={a?.vault_item ?? ""} className="field" placeholder="e.g. Rich – Gmail" /></Field>
        <Field id="da-purpose" label="What it's for" span><input id="da-purpose" name="purpose" defaultValue={a?.purpose ?? ""} className="field" /></Field>
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

export function CsvImport() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(importAccountsCsv, null);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-secondary">Import CSV</button>;
  return (
    <FormDialog title="Import accounts from a CSV" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.message : undefined} submitLabel="Import">
      <p className="text-[0.95rem] text-ink-soft">Paste a spreadsheet export with a header row. Allowed columns: <code>name</code>, <code>website</code>, <code>owner</code>, <code>category</code>, <code>vault</code>, <code>vault_item</code>, <code>status</code>, <code>notes</code>. A password column anywhere stops the whole import. Rows with the same name and owner update in place.</p>
      <Field id="csv" label="CSV"><textarea id="csv" name="csv" rows={10} required className="field font-mono text-[0.85rem]" placeholder={"name,owner,status\nGmail (Rich),Rich,found\nStreaming,Joint,to find"} /></Field>
      {state?.ok && <p className="rounded-xl bg-evergreen-tint px-4 py-3 text-evergreen">{state.message}</p>}
      <p className="text-[0.85rem] text-ink-soft">A fake 54-row example lives in the repo at <code>docs/samples/accounts-directory-sample.csv</code>.</p>
    </FormDialog>
  );
}
