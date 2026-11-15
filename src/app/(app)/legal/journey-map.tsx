"use client";

import { useActionState, useMemo, useState } from "react";
import type { LegalDocument } from "@/lib/types";
import { updateLegalDocument } from "@/app/actions/records";
import { fmtDate, subjectName } from "@/lib/format";
import { Empty, SourceTag } from "@/components/ui";
import { UploadFile } from "@/components/upload-file";
import { LEGAL_COPY_TAG } from "@/lib/legal/scans";
import { explainerFor, gapsFor } from "@/lib/legal/explainers";

const STEPS = ["not_started", "drafted", "signed", "recorded"] as const;
const STEP_LABEL: Record<(typeof STEPS)[number], string> = { not_started: "Started", drafted: "Drafted", signed: "Signed", recorded: "Recorded" };
const DEED_TYPES = new Set(["tod_deed", "easement"]);

/** The one thing that moves a document forward. Open issue wins; otherwise it follows from status. */
export function nextStep(d: LegalDocument): { verb: string; text: string; more?: string } | null {
  if (d.open_issue) {
    // First sentence is the step; the rest is available behind "more".
    const m = /^(.*?[.?!])(\s+[\s\S]+)?$/.exec(d.open_issue.trim());
    const first = (m ? m[1] : d.open_issue).trim(); const rest = m && m[2] ? m[2].trim() : "";
    const [verb, ...words] = first.split(" ");
    const imperative = /^[A-Z][a-z]+$/.test(verb) && words.length > 1;
    return imperative ? { verb, text: words.join(" "), more: rest || undefined } : { verb: "Resolve", text: first, more: rest || undefined };
  }
  if (d.status === "superseded") return null;
  if (d.status === "not_started") return { verb: "Draft", text: "it, or decide it isn't needed." };
  if (d.status === "drafted") return { verb: "Sign", text: d.doc_type === "will" || d.doc_type === "directive" ? "with two witnesses." : "and notarize." };
  if (d.status === "signed" && d.needs_recording) return { verb: "Record", text: "with the county." };
  if (!d.original_location) return { verb: "Note", text: "where the original is kept." };
  return null;
}

function stepIndex(status: LegalDocument["status"]) { return status === "superseded" ? -1 : STEPS.indexOf(status); }

function Track({ d }: { d: LegalDocument }) {
  const idx = stepIndex(d.status);
  const recordable = d.needs_recording || DEED_TYPES.has(d.doc_type);
  const dates: Record<string, string | null> = { drafted: d.drafted_on, signed: d.signed_on, recorded: d.recorded_on };
  return (
    <ol className="flex w-full items-start" aria-label="Progress">
      {STEPS.map((s, i) => {
        const na = s === "recorded" && !recordable;
        const done = i < idx || (i === idx && (s === "recorded" || (s === "signed" && !recordable)));
        const cur = i === idx && !done;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center">
            {i < STEPS.length - 1 && <span className={`absolute left-1/2 top-[11px] h-[3px] w-full ${i < idx ? "bg-evergreen" : "bg-rule"}`} />}
            <span className={`relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 text-[11px] font-bold text-paper ${done ? "border-evergreen bg-evergreen" : cur ? "border-brass bg-brass" : na ? "border-dashed border-rule bg-paper opacity-60" : "border-rule bg-paper"}`}>{done ? "✓" : ""}</span>
            <span className={`mt-1 text-[0.68rem] uppercase tracking-wide ${na ? "text-ink-soft/50" : cur || done ? "text-ink" : "text-ink-soft"}`}>{STEP_LABEL[s]}</span>
            {dates[s] && (done || cur) && <span className="text-[0.68rem] text-ink-soft">{fmtDate(dates[s] as string, { year: "numeric" })}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** "Learn more": what this kind of document is and why it matters, then what is on file about this family's own. */
function Learn({ d, scanId, today }: { d: LegalDocument; scanId?: string; today: string }) {
  const e = explainerFor(d);
  const gaps = gapsFor(d, !!scanId, today);
  const date = (iso: string | null) => (iso ? fmtDate(iso, { year: "numeric" }) : null);
  const facts: [string, string | null][] = [
    ["Status", d.status === "not_started" ? "Not started" : d.status[0].toUpperCase() + d.status.slice(1)],
    ["Drafted", date(d.drafted_on)], ["Signed", date(d.signed_on)], ["Recorded", date(d.recorded_on)],
    ["Prepared by", d.prepared_by], ["Original kept", d.original_location],
  ];
  const h = "text-[0.72rem] font-bold uppercase tracking-wide text-ink-soft";
  return (
    <div className="mt-3 grid gap-4 border-t border-rule-soft pt-3 md:grid-cols-2">
      <section className="rounded-xl bg-parchment px-4 py-3">
        <div className={h}>In general</div>
        <h3 className="mt-1 text-[1.15rem] font-semibold">{e.kind}</h3>
        <p className="mt-2"><strong>What it is.</strong> {e.what}</p>
        <p className="mt-2"><strong>Why it matters in an estate plan.</strong> {e.why}</p>
      </section>
      <section className="rounded-xl border border-rule-soft px-4 py-3">
        <div className={h}>{subjectName(d.principal)}: this document</div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.95rem]">
          {facts.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-soft">{k}</dt><dd>{v}</dd></div>)}
          <div className="contents"><dt className="text-ink-soft">Digital copy</dt><dd>{scanId ? <a href={`/files/${scanId}`} target="_blank" rel="noreferrer" className="font-semibold text-evergreen underline">Open it ↗</a> : "None filed yet"}</dd></div>
        </dl>
        <div className={`${h} mt-3`}>What theirs says</div>
        <p className="mt-1 whitespace-pre-line">{d.notes ?? "Nothing has been written down yet about what this one says. Open the digital copy, then add the key points with Update."}</p>
        {(d.open_issue || gaps.length > 0) && (
          <>
            <div className={`${h} mt-3`}>Missing or needs attention</div>
            <ul className="mt-1 list-disc pl-5">
              {d.open_issue && <li className="text-ember">{d.open_issue}</li>}
              {gaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </>
        )}
        <div className={`${h} mt-3`}>Questions to ask about theirs</div>
        <ul className="mt-1 list-disc pl-5">{e.lookFor.map((q) => <li key={q}>{q}</li>)}</ul>
      </section>
      <p className="text-[0.8rem] text-ink-soft md:col-span-2">The left side is general background, not legal advice. The right side shows only what has been recorded in the binder; the estate attorney has the final word.</p>
    </div>
  );
}

function Row({ d, canEdit, scanId, today }: { d: LegalDocument; canEdit: boolean; scanId?: string; today: string }) {
  const [editing, setEditing] = useState(false);
  const [learning, setLearning] = useState(false);
  const [more, setMore] = useState(false);
  const [state, action, pending] = useActionState(updateLegalDocument, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setEditing(false); }
  const nxt = nextStep(d);
  return (
    <li className="rounded-2xl border border-rule bg-paper px-4 py-3">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1.6fr_1fr] md:items-center">
        <div className="min-w-0">
          <div className="font-semibold leading-snug">
            {scanId
              ? <a href={`/files/${scanId}`} target="_blank" rel="noreferrer" title="Open the digital copy in a new tab" className="text-evergreen underline decoration-evergreen/40 underline-offset-2">{d.title} ↗</a>
              : d.title}
          </div>
          <div className="mt-0.5 text-[0.85rem] text-ink-soft">{subjectName(d.principal)}{d.prepared_by && ` · ${d.prepared_by}`}{d.original_location ? ` · original: ${d.original_location}` : ["signed", "recorded"].includes(d.status) ? " · original: location unknown" : ""} <SourceTag source={d.source} />{!scanId && <span className="italic"> · no digital copy filed yet</span>}</div>
        </div>
        <Track d={d} />
        <div className="flex items-start justify-between gap-2 text-[0.9rem]">
          {nxt ? <div><strong className="text-ember">{nxt.verb}</strong> {nxt.text}{nxt.more && <> <button type="button" onClick={() => setMore(!more)} className="min-h-0 text-[0.85rem] font-semibold text-evergreen">{more ? "less" : "more"}</button>{more && <div className="mt-1 text-[0.85rem] text-ink-soft">{nxt.more}</div>}</>}</div> : <div className="text-evergreen">Nothing to do.</div>}
          <div className="flex shrink-0 flex-col gap-2">
            {canEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="btn-secondary min-h-[36px] px-3 text-[0.85rem]">Update</button>}
            <button type="button" onClick={() => setLearning(!learning)} aria-expanded={learning} className="btn-secondary min-h-[36px] whitespace-nowrap px-3 text-[0.85rem]">{learning ? "Close" : "Learn more"}</button>
          </div>
        </div>
      </div>
      {learning && <Learn d={d} scanId={scanId} today={today} />}
      {editing && (
        <form action={action} className="mt-3 grid gap-2 border-t border-rule-soft pt-3 md:grid-cols-2">
          <input type="hidden" name="id" value={d.id} />
          <div><label className="label" htmlFor={`st-${d.id}`}>Status</label>
            <select id={`st-${d.id}`} name="status" defaultValue={d.status} className="field"><option value="not_started">Not started</option><option value="drafted">Drafted</option><option value="signed">Signed</option><option value="recorded">Recorded</option><option value="superseded">Superseded</option></select></div>
          <div><label className="label" htmlFor={`loc-${d.id}`}>Where is the original?</label><input id={`loc-${d.id}`} name="original_location" defaultValue={d.original_location ?? ""} className="field" placeholder="Home safe, attorney's office…" /></div>
          <div><label className="label" htmlFor={`sg-${d.id}`}>Signed on</label><input id={`sg-${d.id}`} type="date" name="signed_on" defaultValue={d.signed_on ?? ""} className="field" /></div>
          <div><label className="label" htmlFor={`rc-${d.id}`}>Recorded on</label><input id={`rc-${d.id}`} type="date" name="recorded_on" defaultValue={d.recorded_on ?? ""} className="field" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor={`oi-${d.id}`}>Open issue (becomes the next step)</label><input id={`oi-${d.id}`} name="open_issue" defaultValue={d.open_issue ?? ""} className="field" placeholder="What still needs doing?" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor={`nt-${d.id}`}>What this one says (shown under Learn more)</label><textarea id={`nt-${d.id}`} name="notes" rows={4} maxLength={4000} defaultValue={d.notes ?? ""} className="field" placeholder="Who it names, what it gives to whom, anything unusual about it" /></div>
          {state && !state.ok && <p className="text-ember md:col-span-2">{state.error}</p>}
          <div className="flex gap-2 md:col-span-2"><button className="btn-primary px-4" disabled={pending}>{pending ? "Saving…" : "Save"}</button><button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4">Cancel</button></div>
        </form>
      )}
      {editing && canEdit && (
        <div className="mt-3 border-t border-rule-soft pt-3">
          <UploadFile section="legal" label={scanId ? "Replace the digital copy" : "Add the digital copy"} defaultNote={`${LEGAL_COPY_TAG} ${d.title}`} back="/legal" />
        </div>
      )}
    </li>
  );
}

const TABS = [["all", "All"], ["both", "Rich & Diana together"], ["rich", "Rich"], ["diana", "Diana"], ["blocked", "Open issue"]] as const;

export function JourneyMap({ docs, canEdit, scans, today }: { docs: LegalDocument[]; canEdit: boolean; scans: Record<string, string>; today: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const live = useMemo(() => docs.filter((d) => d.status !== "superseded"), [docs]);
  const count = (t: string) => t === "all" ? live.length : t === "blocked" ? live.filter((d) => !!d.open_issue).length : live.filter((d) => d.principal === t).length;
  const shown = live.filter((d) => tab === "all" || (tab === "blocked" ? !!d.open_issue : d.principal === tab));
  const order = { recorded: 0, signed: 1, drafted: 2, not_started: 3, superseded: 4 };
  const sorted = [...shown].sort((a, b) => (a.open_issue ? 0 : 1) - (b.open_issue ? 0 : 1) || order[a.status] - order[b.status] || a.sort_order - b.sort_order);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`pill min-h-[36px] px-3 ${tab === k ? "bg-ink text-paper" : k === "blocked" ? "border border-brass bg-brass-tint text-brass-deep" : "bg-paper text-ink-soft border border-rule"}`}>{label} · {count(k)}</button>
        ))}
      </div>
      <div className="mb-2 hidden grid-cols-[1.2fr_1.6fr_1fr] gap-4 px-4 text-[0.72rem] font-bold uppercase tracking-wide text-ink-soft md:grid"><span>Document</span><span>Track</span><span>Next step</span></div>
      {sorted.length === 0 ? <Empty>Nothing here.</Empty> : <ul className="flex flex-col gap-2">{sorted.map((d) => <Row key={d.id} d={d} canEdit={canEdit} scanId={scans[d.id]} today={today} />)}</ul>}
      <p className="mt-3 text-[0.85rem] text-ink-soft">Recorded applies only to deeds; it is greyed out for everything else. Documents with an open issue sort to the top. A green title opens that document’s digital copy in a new tab; to add a missing copy, press Update on its row.</p>
    </>
  );
}
