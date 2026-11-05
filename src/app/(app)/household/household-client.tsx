"use client";

import { useActionState, useState, useTransition } from "react";
import type { HouseholdItem } from "@/lib/types";
import { deleteHouseholdItem, saveHouseholdItem } from "@/app/actions/household";
import { FormDialog, Field } from "@/components/dialog";

const KINDS: [HouseholdItem["kind"], string, string][] = [
  ["pet", "Pet", "Name, age, vet, food and routine, medicines, who takes them if needed."],
  ["vehicle", "Vehicle", "Year and model, where the title is, spare key, who it's meant for."],
  ["heirloom", "Heirloom or keepsake", "What it is, where it is, the story, and who should have it."],
  ["service", "Someone who comes to the house", "What they do, when, how they're paid, phone, whether they have a key."],
  ["other", "Something else", "The safe, shut-off valves, spare keys… codes only by vault item name."],
];

export function HouseholdEditor({ item, parent }: { item?: HouseholdItem; parent: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<HouseholdItem["kind"]>(item?.kind ?? "pet");
  const [state, action, pending] = useActionState(saveHouseholdItem, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const i = item;
  const hint = KINDS.find((k) => k[0] === kind)?.[2];
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={i ? "btn-secondary px-3 text-[0.9rem]" : "btn-primary"}>{i ? "Edit" : parent ? "+ Add something" : "+ Add an item"}</button>;
  return (
    <FormDialog title={i ? `Edit ${i.name}` : parent ? "Add something the kids should know" : "Add a household item"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {i && <input type="hidden" name="id" value={i.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="hh-kind" label="What kind of thing"><select id="hh-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as HouseholdItem["kind"])} className="field">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="hh-name" label="Name"><input id="hh-name" name="name" defaultValue={i?.name ?? ""} required className="field" /></Field>
        <Field id="hh-details" label="Details" span><textarea id="hh-details" name="details" rows={parent ? 5 : 4} defaultValue={i?.details ?? ""} className="field" placeholder={hint} /></Field>
      </div>
      <p className="text-[0.85rem] text-ink-soft">Don’t type safe combinations or door codes here. Put them in the password vault and say which item.</p>
    </FormDialog>
  );
}

export function HouseholdRowActions({ item, parent }: { item: HouseholdItem; parent: boolean }) {
  const [, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex shrink-0 gap-1">
      <HouseholdEditor item={item} parent={parent} />
      {!parent && (confirm
        ? <><button type="button" onClick={() => start(() => { deleteHouseholdItem(item.id); })} className="btn px-3 text-[0.9rem] text-ember">Remove</button><button type="button" onClick={() => setConfirm(false)} className="btn px-2 text-[0.9rem] text-ink-soft">Keep</button></>
        : <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setConfirm(true)} className="btn px-2 text-[0.9rem] text-ink-soft">×</button>)}
    </div>
  );
}
