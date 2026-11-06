"use client";

import { useActionState, useState, useTransition } from "react";
import type { HealthCondition, Medication, VaClaim } from "@/lib/types";
import { addLabResult, addVisitNote, saveClaimEvent, saveCondition, saveMedication, stopMedication, syncVaLetters } from "@/app/actions/health";
import { FormDialog, Field } from "@/components/dialog";
import { fmtDate } from "@/lib/format";
import { Empty, SourceTag } from "@/components/ui";

type Patient = "rich" | "diana";
type Prov = { id: string; name: string };
const todayIso = () => new Date().toISOString().slice(0, 10);

function Source({ doc, date }: { doc: string | null; date: string | null }) {
  if (!doc) return <span className="text-[0.8rem] text-ember">source not recorded</span>;
  return <span className="text-[0.8rem] text-ink-soft">Source: {doc}{date && ` · ${fmtDate(date, { year: "numeric" })}`}</span>;
}

// --- Header buttons ---------------------------------------------------------------------
export function HealthForms({ patient, providers }: { patient: Patient; providers: Prov[] }) {
  const [open, setOpen] = useState<"visit" | "lab" | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen("visit")} className="btn-primary">Log a visit</button>
      <MedicationEditor patient={patient} providers={providers} />
      <ConditionEditor patient={patient} />
      <button type="button" onClick={() => setOpen("lab")} className="btn-secondary">Add lab result</button>
      {open === "visit" && <VisitDialog patient={patient} providers={providers} close={() => setOpen(null)} />}
      {open === "lab" && <LabDialog patient={patient} close={() => setOpen(null)} />}
    </>
  );
}

function VisitDialog({ patient, providers, close }: { patient: Patient; providers: Prov[]; close: () => void }) {
  const [state, action, pending] = useActionState(addVisitNote, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) close(); }
  return (
    <FormDialog title="Log a doctor visit" close={close} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="patient" value={patient} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="v-date" label="Visit date"><input id="v-date" type="date" name="visit_on" defaultValue={todayIso()} required className="field" /></Field>
        <Field id="v-prov" label="Provider"><select id="v-prov" name="provider_id" className="field" defaultValue=""><option value="">—</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field id="v-sum" label="What happened" span><textarea id="v-sum" name="summary" rows={4} required className="field" /></Field>
        <Field id="v-fu" label="Follow-up" span><input id="v-fu" name="follow_up" className="field" /></Field>
      </div>
    </FormDialog>
  );
}

function LabDialog({ patient, close }: { patient: Patient; close: () => void }) {
  const [state, action, pending] = useActionState(addLabResult, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) close(); }
  return (
    <FormDialog title="Add a lab result" close={close} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="patient" value={patient} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="l-test" label="Test"><input id="l-test" name="test_name" required className="field" placeholder="A1C" /></Field>
        <Field id="l-date" label="Taken on"><input id="l-date" type="date" name="taken_on" defaultValue={todayIso()} required className="field" /></Field>
        <Field id="l-val" label="Result"><input id="l-val" name="value" type="number" step="any" inputMode="decimal" required className="field" /></Field>
        <Field id="l-unit" label="Unit"><input id="l-unit" name="unit" className="field" /></Field>
        <Field id="l-lo" label="Normal from"><input id="l-lo" name="ref_low" type="number" step="any" className="field" /></Field>
        <Field id="l-hi" label="Normal to"><input id="l-hi" name="ref_high" type="number" step="any" className="field" /></Field>
      </div>
    </FormDialog>
  );
}

// --- Medications ------------------------------------------------------------------------
export function MedicationEditor({ patient, providers, med }: { patient: Patient; providers: Prov[]; med?: Medication }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Medication["frequency_kind"]>(med?.frequency_kind ?? "daily");
  const [state, action, pending] = useActionState(saveMedication, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={med ? "btn-secondary px-3 text-[0.85rem]" : "btn-secondary"}>{med ? "Edit" : "Add medication"}</button>;
  return (
    <FormDialog title={med ? `Edit ${med.name}` : "Add a medication"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="patient" value={patient} />{med && <input type="hidden" name="id" value={med.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="m-name" label="Medication" span><input id="m-name" name="name" defaultValue={med?.name ?? ""} required className="field" /></Field>
        <Field id="m-kind" label="How often"><select id="m-kind" name="frequency_kind" value={kind} onChange={(e) => setKind(e.target.value as Medication["frequency_kind"])} className="field"><option value="daily">Every day</option><option value="prn">As needed (PRN)</option><option value="weekly">Weekly</option><option value="other">Other</option></select></Field>
        <Field id="m-dose" label="Dose"><input id="m-dose" name="dose" defaultValue={med?.dose ?? ""} className="field" placeholder="10 mg" /></Field>
        {kind === "prn" ? (<>
          <Field id="m-for" label="Take it for"><input id="m-for" name="prn_for" defaultValue={med?.prn_for ?? ""} className="field" placeholder="nerve pain flare" /></Field>
          <Field id="m-max" label="At most"><input id="m-max" name="max_per_day" defaultValue={med?.max_per_day ?? ""} className="field" placeholder="2 tablets a day" /></Field>
        </>) : (
          <Field id="m-sched" label="When"><input id="m-sched" name="schedule" defaultValue={med?.schedule ?? ""} className="field" placeholder="Every morning" /></Field>
        )}
        <Field id="m-purpose" label="For"><input id="m-purpose" name="purpose" defaultValue={med?.purpose ?? ""} className="field" /></Field>
        <Field id="m-prov" label="Prescribed by"><select id="m-prov" name="prescriber_id" defaultValue={med?.prescriber_id ?? ""} className="field"><option value="">—</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field id="m-src" label="Source (document, visit, call)"><input id="m-src" name="source_document" defaultValue={med?.source_document ?? ""} required className="field" placeholder="Medication list from Oct visit" /></Field>
        <Field id="m-srcd" label="Source date"><input id="m-srcd" type="date" name="source_date" defaultValue={med?.source_date ?? todayIso()} className="field" /></Field>
        <Field id="m-notes" label="Notes" span><input id="m-notes" name="notes" defaultValue={med?.notes ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function MedicationList({ patient, meds, providerNames, providers, canEdit, parent }: { patient: Patient; meds: Medication[]; providerNames: Record<string, string>; providers: Prov[]; canEdit: boolean; parent: boolean }) {
  const [showStopped, setShowStopped] = useState(false);
  const [, start] = useTransition();
  const active = meds.filter((m) => m.active); const stopped = meds.filter((m) => !m.active);
  const daily = active.filter((m) => m.frequency_kind !== "prn"); const prn = active.filter((m) => m.frequency_kind === "prn");
  const Row = ({ m }: { m: Medication }) => (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className={`font-semibold ${parent ? "text-[1.25rem]" : ""}`}>{m.name}{m.dose && <span className="font-normal text-ink-soft"> · {m.dose}</span>}</div>
        <div className={`text-ink-soft ${parent ? "" : "text-[0.9rem]"}`}>{m.frequency_kind === "prn" ? `As needed${m.prn_for ? ` for ${m.prn_for}` : ""}${m.max_per_day ? ` · at most ${m.max_per_day}` : ""}` : [m.schedule, m.purpose].filter(Boolean).join(" · ")}</div>
        {!parent && <div className="flex flex-wrap gap-x-3 text-[0.85rem] text-ink-soft">{m.prescriber_id && providerNames[m.prescriber_id] && <span>{providerNames[m.prescriber_id]}</span>}<Source doc={m.source_document} date={m.source_date} /><SourceTag source={m.source} /></div>}
      </div>
      {canEdit && <div className="flex gap-1"><MedicationEditor patient={patient} providers={providers} med={m} /><button type="button" onClick={() => start(() => { stopMedication(patient, m.id, true); })} className="btn px-2 text-[0.85rem] text-ink-soft">Mark stopped</button></div>}
    </li>
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-sans text-[0.85rem] font-bold uppercase tracking-wide text-brass-deep">Every day · {daily.length}</h3>
        {daily.length === 0 ? <p className="text-ink-soft">{parent ? "No daily medicines." : "None. (A deliberate zero: the record says no daily medications.)"}</p> : <ul className="divide-y divide-rule-soft">{daily.map((m) => <Row key={m.id} m={m} />)}</ul>}
      </div>
      <div>
        <h3 className="font-sans text-[0.85rem] font-bold uppercase tracking-wide text-brass-deep">As needed (PRN) · {prn.length}</h3>
        {prn.length === 0 ? <p className="text-ink-soft">None.</p> : <ul className="divide-y divide-rule-soft">{prn.map((m) => <Row key={m.id} m={m} />)}</ul>}
      </div>
      {stopped.length > 0 && !parent && (
        <div className="border-t border-rule-soft pt-3">
          <button type="button" onClick={() => setShowStopped((s) => !s)} className="min-h-0 text-[0.9rem] font-semibold text-ink-soft">{showStopped ? "Hide" : "Show"} {stopped.length} stopped</button>
          {showStopped && <ul className="mt-2 flex flex-col gap-1 text-[0.9rem] text-ink-soft">{stopped.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="line-through">{m.name} {m.dose}</span><span>stopped {fmtDate(m.stopped_on, { year: "numeric" })}{canEdit && <button type="button" onClick={() => start(() => { stopMedication(patient, m.id, false); })} className="ml-2 min-h-0 font-semibold text-evergreen">Restart</button>}</span></li>)}</ul>}
        </div>
      )}
    </div>
  );
}

// --- Conditions / allergies / sensitivities / coverage ----------------------------------------
const SEV: Record<string, string> = { mild: "mild", moderate: "moderate", severe: "severe", life_threatening: "life-threatening" };

export function ConditionEditor({ patient, item }: { patient: Patient; item?: HealthCondition }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<HealthCondition["kind"]>(item?.kind ?? "condition");
  const [state, action, pending] = useActionState(saveCondition, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={item ? "btn-secondary px-3 text-[0.85rem]" : "btn-secondary"}>{item ? "Edit" : "Add condition / allergy"}</button>;
  const reactionKind = kind === "allergy" || kind === "sensitivity";
  return (
    <FormDialog title={item ? `Edit ${item.name}` : "Add a condition, allergy or sensitivity"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="patient" value={patient} />{item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-kind" label="Kind"><select id="c-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as HealthCondition["kind"])} className="field"><option value="condition">Condition</option><option value="allergy">Allergy</option><option value="sensitivity">Sensitivity (bad reaction)</option><option value="coverage">Coverage</option></select></Field>
        <Field id="c-name" label="Name"><input id="c-name" name="name" defaultValue={item?.name ?? ""} required className="field" /></Field>
        {kind === "condition" && <Field id="c-since" label="Started (onset)"><input id="c-since" type="date" name="since" defaultValue={item?.since ?? ""} className="field" /></Field>}
        {kind === "condition" && <Field id="c-status" label="Status"><select id="c-status" name="status" defaultValue={item?.status ?? "active"} className="field"><option value="active">Active</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option></select></Field>}
        {kind !== "condition" && <input type="hidden" name="status" value={item?.status ?? "active"} />}
        {reactionKind && <Field id="c-react" label="Reaction"><input id="c-react" name="reaction" defaultValue={item?.reaction ?? ""} className="field" placeholder="Rash, stomach bleeding…" /></Field>}
        {(reactionKind || kind === "condition") && <Field id="c-sev" label="How serious"><select id="c-sev" name="severity" defaultValue={item?.severity ?? ""} className="field"><option value="">—</option>{Object.entries(SEV).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>}
        <Field id="c-detail" label="Details" span><textarea id="c-detail" name="detail" rows={2} defaultValue={item?.detail ?? ""} className="field" /></Field>
        {kind !== "coverage" && <>
          <Field id="c-src" label="Source (document, visit, call)"><input id="c-src" name="source_document" defaultValue={item?.source_document ?? ""} className="field" placeholder="Hospital discharge summary" /></Field>
          <Field id="c-srcd" label="Source date"><input id="c-srcd" type="date" name="source_date" defaultValue={item?.source_date ?? todayIso()} className="field" /></Field>
        </>}
      </div>
    </FormDialog>
  );
}

export function ConditionList({ patient, items, canEdit, parent, mode }: { patient: Patient; items: HealthCondition[]; canEdit: boolean; parent: boolean; mode: "conditions" | "reactions" | "coverage" }) {
  if (items.length === 0) return <Empty>{mode === "reactions" ? "No allergies or sensitivities recorded." : mode === "conditions" ? "No conditions recorded." : "No coverage recorded."}</Empty>;
  return (
    <ul className="divide-y divide-rule-soft">
      {items.map((c) => (
        <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <div className={`font-semibold ${parent ? "text-[1.2rem]" : ""} ${mode === "reactions" ? "text-ember" : ""}`}>{c.name}
              {c.kind === "sensitivity" && <span className="pill ml-2 bg-brass-tint text-brass-deep">sensitivity</span>}
              {c.status !== "active" && <span className="pill ml-2 bg-rule-soft text-ink-soft">{c.status}</span>}
              {c.severity && <span className="pill ml-2 bg-ember-tint text-ember">{SEV[c.severity]}</span>}
            </div>
            {c.reaction && <div className={parent ? "" : "text-[0.95rem]"}>Reaction: {c.reaction}</div>}
            {c.since && <div className="text-[0.9rem] text-ink-soft">Since {fmtDate(c.since, { year: "numeric", month: "long", day: undefined })}</div>}
            {c.detail && <div className={`text-ink-soft ${parent ? "" : "text-[0.9rem]"}`}>{c.detail}</div>}
            {!parent && c.kind !== "coverage" && <Source doc={c.source_document} date={c.source_date} />}
          </div>
          {canEdit && <ConditionEditor patient={patient} item={c} />}
        </li>
      ))}
    </ul>
  );
}

// --- VA claim timeline -------------------------------------------------------------------
const KIND: Record<VaClaim["kind"], [string, string]> = {
  rating_decision: ["Rating decision", "bg-evergreen text-paper"], claim: ["Claim filed", "bg-slate-tint text-slate"], appeal: ["Appeal", "bg-brass-tint text-brass-deep"],
  letter: ["VA letter", "bg-parchment text-ink"], cp_exam: ["C&P exam", "bg-ember-tint text-ember"], evidence: ["Evidence sent", "bg-slate-tint text-slate"], note: ["Note", "bg-rule-soft text-ink-soft"],
};

export function ClaimTimeline({ claims, canEdit, parent, files, isAdmin }: { claims: VaClaim[]; canEdit: boolean; parent: boolean; files: { id: string; name: string }[]; isAdmin: boolean }) {
  const [pending, start] = useTransition(); const [msg, setMsg] = useState("");
  const dated = (c: VaClaim) => c.event_on ?? c.decided_on ?? c.filed_on ?? null;
  const today = todayIso();
  const rating = [...claims].reverse().find((c) => c.kind === "rating_decision" && c.rating_pct !== null);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-ink-soft">{rating ? <>Current combined rating: <strong className="text-ink">{rating.rating_pct}%</strong> (since {fmtDate(dated(rating), { year: "numeric" })})</> : "No rating decision on file."}</div>
        {canEdit && <div className="flex items-center gap-2">{isAdmin && <button type="button" disabled={pending} onClick={() => start(async () => { const r = await syncVaLetters(); setMsg(r.ok ? `${r.data!.created} letter${r.data!.created === 1 ? "" : "s"} added from Drive` : r.error); })} className="btn-secondary px-3 text-[0.9rem]">Sync letters from Drive</button>}<ClaimEditor files={files} />{msg && <span className="text-[0.85rem] text-ink-soft">{msg}</span>}</div>}
      </div>
      {claims.length === 0 ? <Empty>Nothing on the timeline yet.</Empty> : (
        <ol className="relative ml-3 border-l-2 border-rule">
          {claims.map((c) => { const d = dated(c); const future = d !== null && d > today; return (
            <li key={c.id} className="relative mb-5 pl-6 last:mb-0">
              <span className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-paper ${future ? "bg-ember" : c.kind === "rating_decision" ? "bg-evergreen" : "bg-brass"}`} aria-hidden />
              <div className="flex flex-wrap items-center gap-2"><span className={`pill ${KIND[c.kind][1]}`}>{KIND[c.kind][0]}</span><span className="font-semibold">{d ? fmtDate(d, { year: "numeric" }) : "undated"}</span>{future && <span className="text-[0.85rem] font-semibold text-ember">upcoming</span>}<SourceTag source={c.source} /></div>
              <div className={`mt-0.5 ${parent ? "text-[1.15rem]" : ""}`}><span className="font-semibold">{c.title}</span> <span className="text-ink-soft">· {c.status}{c.rating_pct !== null && c.kind !== "rating_decision" ? ` · ${c.rating_pct}%` : ""}</span></div>
              {c.summary && <div className="text-[0.95rem] text-ink-soft">{c.summary}</div>}
              {c.next_step && <div className="mt-1 inline-block rounded-lg bg-brass-tint px-3 py-1 text-[0.9rem] text-brass-deep">Next: {c.next_step}</div>}
              {c.imported_file_id && !parent && <div className="text-[0.85rem]"><a href={`/api/files/${c.imported_file_id}`} target="_blank" rel="noreferrer">Open the letter</a></div>}
              {canEdit && <div className="mt-1"><ClaimEditor files={files} claim={c} /></div>}
            </li>); })}
        </ol>
      )}
    </div>
  );
}

function ClaimEditor({ claim, files }: { claim?: VaClaim; files: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveClaimEvent, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const c = claim;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={c ? "btn px-2 text-[0.85rem] text-evergreen" : "btn-secondary px-3 text-[0.9rem]"}>{c ? "Edit" : "+ Add an entry"}</button>;
  return (
    <FormDialog title={c ? "Edit timeline entry" : "Add a timeline entry"} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ce-kind" label="Kind"><select id="ce-kind" name="kind" defaultValue={c?.kind ?? "letter"} className="field">{Object.entries(KIND).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="ce-date" label="Date"><input id="ce-date" type="date" name="event_on" defaultValue={c?.event_on ?? c?.decided_on ?? c?.filed_on ?? todayIso()} required className="field" /></Field>
        <Field id="ce-title" label="Title"><input id="ce-title" name="title" defaultValue={c?.title ?? ""} required className="field" /></Field>
        <Field id="ce-status" label="Status"><input id="ce-status" name="status" defaultValue={c?.status ?? ""} required className="field" placeholder="Received, Under review, Granted…" /></Field>
        <Field id="ce-pct" label="Rating % (if any)"><input id="ce-pct" name="rating_pct" type="number" min={0} max={100} defaultValue={c?.rating_pct ?? ""} className="field" /></Field>
        <Field id="ce-file" label="Letter (imported)"><select id="ce-file" name="imported_file_id" defaultValue={c?.imported_file_id ?? ""} className="field"><option value="">—</option>{files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
        <Field id="ce-sum" label="Summary" span><textarea id="ce-sum" name="summary" rows={2} defaultValue={c?.summary ?? ""} className="field" /></Field>
        <Field id="ce-next" label="Next step"><input id="ce-next" name="next_step" defaultValue={c?.next_step ?? ""} className="field" /></Field>
        <Field id="ce-notes" label="Notes"><input id="ce-notes" name="notes" defaultValue={c?.notes ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}
