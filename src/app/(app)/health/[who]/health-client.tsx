"use client";

import { useActionState, useState, useTransition } from "react";
import type { Medication } from "@/lib/types";
import { addLabResult, addMedication, addVisitNote, stopMedication } from "@/app/actions/health";
import { fmtDate } from "@/lib/format";
import { SourceTag } from "@/components/ui";
import { Close } from "@/components/icons";

type Patient = "rich" | "diana";
type Prov = { id: string; name: string };
type Kind = "visit" | "med" | "lab" | null;

export function HealthForms({ patient, providers }: { patient: Patient; providers: Prov[] }) {
  const [open, setOpen] = useState<Kind>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen("visit")} className="btn-primary">Log a visit</button>
      <button type="button" onClick={() => setOpen("med")} className="btn-secondary">Add medication</button>
      <button type="button" onClick={() => setOpen("lab")} className="btn-secondary">Add lab result</button>
      {open && <Dialog kind={open} patient={patient} providers={providers} close={() => setOpen(null)} />}
    </>
  );
}

function Dialog({ kind, patient, providers, close }: { kind: Exclude<Kind, null>; patient: Patient; providers: Prov[]; close: () => void }) {
  const action = kind === "visit" ? addVisitNote : kind === "med" ? addMedication : addLabResult;
  const [state, formAction, pending] = useActionState(action, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) close(); }
  const title = { visit: "Log a doctor visit", med: "Add a medication", lab: "Add a lab result" }[kind];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div role="dialog" aria-labelledby="hf-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <form action={formAction} className="card flex max-h-[95dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 id="hf-title" className="text-[1.4rem] font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        <input type="hidden" name="patient" value={patient} />

        {kind === "visit" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="v-date" className="label">Visit date</label><input id="v-date" type="date" name="visit_on" defaultValue={today} required className="field" /></div>
              <div><label htmlFor="v-prov" className="label">Provider</label>
                <select id="v-prov" name="provider_id" className="field" defaultValue=""><option value="">—</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <div><label htmlFor="v-sum" className="label">What happened</label><textarea id="v-sum" name="summary" rows={4} required className="field" placeholder="What the doctor said, any changes, how they're feeling." /></div>
            <div><label htmlFor="v-fu" className="label">Follow-up</label><input id="v-fu" name="follow_up" className="field" placeholder="Repeat labs in 3 months, call if…" /></div>
          </>
        )}

        {kind === "med" && (
          <>
            <div><label htmlFor="m-name" className="label">Medication</label><input id="m-name" name="name" required className="field" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="m-dose" className="label">Dose</label><input id="m-dose" name="dose" className="field" placeholder="10 mg" /></div>
              <div><label htmlFor="m-sched" className="label">When</label><input id="m-sched" name="schedule" className="field" placeholder="Every morning" /></div>
              <div><label htmlFor="m-purpose" className="label">For</label><input id="m-purpose" name="purpose" className="field" placeholder="Blood pressure" /></div>
              <div><label htmlFor="m-prov" className="label">Prescribed by</label>
                <select id="m-prov" name="prescriber_id" className="field" defaultValue=""><option value="">—</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <div><label htmlFor="m-notes" className="label">Notes</label><input id="m-notes" name="notes" className="field" /></div>
          </>
        )}

        {kind === "lab" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="l-test" className="label">Test</label><input id="l-test" name="test_name" required className="field" placeholder="A1C" list="lab-tests" /><datalist id="lab-tests"><option value="A1C" /><option value="LDL cholesterol" /><option value="Creatinine" /><option value="TSH" /><option value="Vitamin D" /></datalist></div>
              <div><label htmlFor="l-date" className="label">Taken on</label><input id="l-date" type="date" name="taken_on" defaultValue={today} required className="field" /></div>
              <div><label htmlFor="l-val" className="label">Result</label><input id="l-val" name="value" type="number" step="any" inputMode="decimal" required className="field" /></div>
              <div><label htmlFor="l-unit" className="label">Unit</label><input id="l-unit" name="unit" className="field" placeholder="%" /></div>
              <div><label htmlFor="l-lo" className="label">Normal from</label><input id="l-lo" name="ref_low" type="number" step="any" inputMode="decimal" className="field" /></div>
              <div><label htmlFor="l-hi" className="label">Normal to</label><input id="l-hi" name="ref_high" type="number" step="any" inputMode="decimal" className="field" /></div>
            </div>
            <p className="text-[0.9rem] text-ink-soft">Results outside the normal range are flagged automatically on the chart.</p>
          </>
        )}

        {state && !state.ok && <p className="text-ember">{state.error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={close} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export function MedicationList({ patient, meds, providerNames, canEdit, parent }: {
  patient: Patient; meds: Medication[]; providerNames: Record<string, string>; canEdit: boolean; parent: boolean;
}) {
  const [showStopped, setShowStopped] = useState(false);
  const [, start] = useTransition();
  const active = meds.filter((m) => m.active);
  const stopped = meds.filter((m) => !m.active);
  return (
    <>
      <ul className="divide-y divide-rule-soft">
        {active.map((m) => (
          <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
            <div>
              <div className={`font-semibold ${parent ? "text-[1.25rem]" : ""}`}>{m.name}{m.dose && <span className="font-normal text-ink-soft"> · {m.dose}</span>}</div>
              <div className={`text-ink-soft ${parent ? "" : "text-[0.9rem]"}`}>{[m.schedule, m.purpose].filter(Boolean).join(" · ")}</div>
              {!parent && (m.prescriber_id || m.notes) && <div className="text-[0.85rem] text-ink-soft">{m.prescriber_id && providerNames[m.prescriber_id]}{m.notes && ` · ${m.notes}`} <SourceTag source={m.source} /></div>}
            </div>
            {canEdit && <button type="button" onClick={() => start(() => { stopMedication(patient, m.id, true); })} className="btn text-[0.9rem] text-ink-soft">Mark stopped</button>}
          </li>
        ))}
      </ul>
      {stopped.length > 0 && !parent && (
        <div className="border-t border-rule-soft pt-3">
          <button type="button" onClick={() => setShowStopped((s) => !s)} className="min-h-0 text-[0.9rem] font-semibold text-ink-soft">{showStopped ? "Hide" : "Show"} {stopped.length} stopped</button>
          {showStopped && (
            <ul className="mt-2 flex flex-col gap-1 text-[0.9rem] text-ink-soft">
              {stopped.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="line-through">{m.name} {m.dose}</span><span>stopped {fmtDate(m.stopped_on, { year: "numeric" })}{canEdit && <button type="button" onClick={() => start(() => { stopMedication(patient, m.id, false); })} className="ml-2 min-h-0 font-semibold text-evergreen">Restart</button>}</span></li>)}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
