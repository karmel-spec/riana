"use client";

import { useActionState, useState } from "react";
import type { Vehicle } from "@/lib/types";
import { addImprovement, saveVehicle } from "@/app/actions/vehicles";
import { FormDialog, Field } from "@/components/dialog";

type Opt = { id: string; name: string };

export function VehicleEditor({ vehicle, policies, provisions, files }: { vehicle?: Vehicle; policies: Opt[]; provisions: Opt[]; files: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveVehicle, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const x = vehicle;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={x ? "btn-secondary px-3 text-[0.9rem]" : "btn-primary"}>{x ? "Edit" : "+ Add a vehicle"}</button>;
  return (
    <FormDialog title={x ? `Edit ${x.nickname ?? x.make}` : "Add a vehicle"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {x && <input type="hidden" name="id" value={x.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="vh-year" label="Year"><input id="vh-year" name="year" type="number" inputMode="numeric" defaultValue={x?.year ?? ""} className="field" /></Field>
        <Field id="vh-make" label="Make"><input id="vh-make" name="make" defaultValue={x?.make ?? ""} required className="field" /></Field>
        <Field id="vh-model" label="Model"><input id="vh-model" name="model" defaultValue={x?.model ?? ""} className="field" /></Field>
        <Field id="vh-nick" label="Nickname"><input id="vh-nick" name="nickname" defaultValue={x?.nickname ?? ""} className="field" placeholder="Vickie" /></Field>
        <Field id="vh-engine" label="Engine"><input id="vh-engine" name="engine" defaultValue={x?.engine ?? ""} className="field" placeholder="350 Chevy V8" /></Field>
        <Field id="vh-vin" label="VIN (last 4)"><input id="vh-vin" name="vin_last4" maxLength={4} defaultValue={x?.vin_last4 ?? ""} className="field font-mono" /></Field>
        <Field id="vh-val" label="Estimated value"><input id="vh-val" name="estimated_value" type="number" step="1" inputMode="decimal" defaultValue={x?.estimated_value ?? ""} className="field" /></Field>
        <Field id="vh-valon" label="Valued on"><input id="vh-valon" type="date" name="valuation_on" defaultValue={x?.valuation_on ?? ""} className="field" /></Field>
        <Field id="vh-valsrc" label="Valuation source" span><input id="vh-valsrc" name="valuation_source" defaultValue={x?.valuation_source ?? ""} className="field" placeholder="Appraisal, auction comps, family estimate…" /></Field>
        <Field id="vh-title" label="Where the title is"><input id="vh-title" name="title_location" defaultValue={x?.title_location ?? ""} className="field" /></Field>
        <Field id="vh-owner" label="Owner"><select id="vh-owner" name="owner" defaultValue={x?.owner ?? "both"} className="field"><option value="both">Rich & Diana</option><option value="rich">Rich</option><option value="diana">Diana</option></select></Field>
        <Field id="vh-pol" label="Insurance policy"><select id="vh-pol" name="insurance_policy_id" defaultValue={x?.insurance_policy_id ?? ""} className="field"><option value="">—</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field id="vh-prov" label="Estate plan provision"><select id="vh-prov" name="estate_provision_id" defaultValue={x?.estate_provision_id ?? ""} className="field"><option value="">—</option>{provisions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field id="vh-specs" label="Specs document (imported)" span><select id="vh-specs" name="specs_file_id" defaultValue={x?.specs_file_id ?? ""} className="field"><option value="">—</option>{files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
        <Field id="vh-notes" label="Notes" span><textarea id="vh-notes" name="notes" rows={2} defaultValue={x?.notes ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function ImprovementButton({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addImprovement, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 text-[0.9rem]">+ Add an improvement</button>;
  return (
    <FormDialog title="Add an improvement" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="im-desc" label="What was done" span><input id="im-desc" name="description" required className="field" placeholder="Disc brake conversion" /></Field>
        <Field id="im-date" label="Date"><input id="im-date" type="date" name="done_on" className="field" /></Field>
        <Field id="im-approx" label="…or roughly when"><input id="im-approx" name="done_on_approx" className="field" placeholder="summer 2021" /></Field>
        <Field id="im-cost" label="Cost"><input id="im-cost" name="cost" type="number" step="0.01" inputMode="decimal" className="field" /></Field>
        <Field id="im-vendor" label="Shop / who did it"><input id="im-vendor" name="vendor" className="field" /></Field>
      </div>
    </FormDialog>
  );
}
