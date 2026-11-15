"use client";

import { useActionState, useMemo, useState } from "react";
import type { LegalDocument } from "@/lib/types";
import { updateLegalDocument } from "@/app/actions/records";
import { fmtDate, subjectName } from "@/lib/format";
import { Empty, SourceTag } from "@/components/ui";

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

function Row({ d, canEdit }: { d: LegalDocument; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(false);
  const [state, action, pending] = useActionState(updateLegalDocument, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setEditing(false); }
  const nxt = nextStep(d);
  return (
    <li className="rounded-2xl border border-rule bg-paper px-4 py-3">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1.6fr_1fr] md:items-center">
        <div className="min-w-0">
          <div className="font-semibold leading-snug">{d.title}</div>
          <div className="mt-0.5 text-[0.85rem] text-ink-soft">{subjectName(d.principal)}{d.prepared_by && ` · ${d.prepared_by}`}{d.original_location ? ` · original: ${d.original_location}` : ["signed", "recorded"].includes(d.status) ? " · original: location unknown" : ""} <SourceTag source={d.source} /></div>
        </div>
        <Track d={d} />
        <div className="flex items-start justify-between gap-2 text-[0.9rem]">
          {nxt ? <div><strong className="text-ember">{nxt.verb}</strong> {nxt.text}{nxt.more && <> <button type="button" onClick={() => setMore(!more)} className="min-h-0 text-[0.85rem] font-semibold text-evergreen">{more ? "less" : "more"}</button>{more && <div className="mt-1 text-[0.85rem] text-ink-soft">{nxt.more}</div>}</>}</div> : <div className="text-evergreen">Nothing to do.</div>}
          {canEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="btn-secondary min-h-[36px] px-3 text-[0.85rem]">Update</button>}
        </div>
      </div>
      {editing && (
        <form action={action} className="mt-3 grid gap-2 border-t border-rule-soft pt-3 md:grid-cols-2">
          <input type="hidden" name="id" value={d.id} />
          <div><label className="label" htmlFor={`st-${d.id}`}>Status</label>
            <select id={`st-${d.id}`} name="status" defaultValue={d.status} className="field"><option value="not_started">Not started</option><option value="drafted">Drafted</option><option value="signed">Signed</option><option value="recorded">Recorded</option><option value="superseded">Superseded</option></select></div>
          <div><label className="label" htmlFor={`loc-${d.id}`}>Where is the original?</label><input id={`loc-${d.id}`} name="original_location" defaultValue={d.original_location ?? ""} className="field" placeholder="Home safe, attorney's office…" /></div>
          <div><label className="label" htmlFor={`sg-${d.id}`}>Signed on</label><input id={`sg-${d.id}`} type="date" name="signed_on" defaultValue={d.signed_on ?? ""} className="field" /></div>
          <div><label className="label" htmlFor={`rc-${d.id}`}>Recorded on</label><input id={`rc-${d.id}`} type="date" name="recorded_on" defaultValue={d.recorded_on ?? ""} className="field" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor={`oi-${d.id}`}>Open issue (becomes the next step)</label><input id={`oi-${d.id}`} name="open_issue" defaultValue={d.open_issue ?? ""} className="field" placeholder="What still needs doing?" /></div>
          {state && !state.ok && <p className="text-ember md:col-span-2">{state.error}</p>}
          <div className="flex gap-2 md:col-span-2"><button className="btn-primary px-4" disabled={pending}>{pending ? "Saving…" : "Save"}</button><button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4">Cancel</button></div>
        </form>
      )}
    </li>
  );
}

const TABS = [["all", "All"], ["both", "Rich & Diana together"], ["rich", "Rich"], ["diana", "Diana"], ["blocked", "Open issue"]] as const;

export function JourneyMap({ docs, canEdit }: { docs: LegalDocument[]; canEdit: boolean }) {
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
      {sorted.length === 0 ? <Empty>Nothing here.</Empty> : <ul className="flex flex-col gap-2">{sorted.map((d) => <Row key={d.id} d={d} canEdit={canEdit} />)}</ul>}
      <p className="mt-3 text-[0.85rem] text-ink-soft">Recorded applies only to deeds; it is greyed out for everything else. Documents with an open issue sort to the top.</p>
    </>
  );
}
