"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";

export type TimelineEntry = {
  id: string;
  on: string;                 // ISO date, or "" when undated
  kind: string;               // visit, ER, lab, imaging, letter, appointment, patient statement, VA/CHAMPVA, medication, condition, claim, document, other
  title: string;
  detail?: string | null;
  source?: string | null;     // where it came from
  link?: string | null;       // open the scan
  pending?: boolean;          // document still awaiting approval (admins only)
};

const KIND_LABEL: Record<string, string> = {
  visit: "Visit", ER: "ER", discharge: "Hospital", lab: "Lab", imaging: "Imaging", eye: "Eye", device: "Device", letter: "Letter",
  appointment: "Appointment", "patient statement": "Patient statement", "medication list": "Medication list", "VA/CHAMPVA": "VA / CHAMPVA",
  "end-of-life": "End-of-life wishes", medication: "Medication", condition: "Condition", claim: "VA claim", document: "Document", other: "Other",
};
const KIND_TONE: Record<string, string> = {
  ER: "bg-ember-tint text-ember", discharge: "bg-ember-tint text-ember", lab: "bg-evergreen-tint text-evergreen", imaging: "bg-evergreen-tint text-evergreen",
  appointment: "bg-brass-tint text-brass-deep", "VA/CHAMPVA": "bg-slate-tint text-slate", claim: "bg-slate-tint text-slate", medication: "bg-plum-tint text-plum", condition: "bg-plum-tint text-plum",
};

export function MedicalTimeline({ entries, parent }: { entries: TimelineEntry[]; parent: boolean }) {
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const kinds = useMemo(() => [...new Set(entries.map((e) => e.kind))].sort((a, b) => (KIND_LABEL[a] ?? a).localeCompare(KIND_LABEL[b] ?? b)), [entries]);
  const shown = useMemo(() => entries.filter((e) => (kind === "all" || e.kind === kind) && (!q || `${e.title} ${e.detail ?? ""} ${e.source ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [entries, kind, q]);
  const years = useMemo(() => {
    const by = new Map<string, TimelineEntry[]>();
    for (const e of shown) { const y = e.on ? e.on.slice(0, 4) : "Undated"; by.set(y, [...(by.get(y) ?? []), e]); }
    return [...by.entries()].sort((a, b) => (a[0] === "Undated" ? 1 : b[0] === "Undated" ? -1 : b[0].localeCompare(a[0])));
  }, [shown]);

  if (entries.length === 0) return <p className="text-ink-soft">Nothing on the timeline yet. Visits, labs, scanned records and VA paperwork will appear here as they are added.</p>;
  return (
    <>
      {!parent && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the timeline…" className="field min-h-[40px] w-full sm:w-64" />
          <button type="button" onClick={() => setKind("all")} className={`pill min-h-[36px] px-3 ${kind === "all" ? "bg-ink text-paper" : "bg-rule-soft text-ink-soft"}`}>All · {entries.length}</button>
          {kinds.map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`pill min-h-[36px] px-3 ${kind === k ? "bg-ink text-paper" : KIND_TONE[k] ?? "bg-rule-soft text-ink-soft"}`}>{KIND_LABEL[k] ?? k} · {entries.filter((e) => e.kind === k).length}</button>)}
        </div>
      )}
      <p className="mb-3 text-[0.9rem] text-ink-soft">{shown.length} of {entries.length} entries, newest first.</p>
      <ol className="relative ml-3 border-l-2 border-rule-soft pl-6">
        {years.map(([year, list]) => (
          <li key={year} className="mb-6">
            <div className="relative mb-3 -ml-[1.95rem] flex items-center gap-3"><span className="h-4 w-4 rounded-full border-2 border-evergreen bg-paper" /><span className="font-serif text-[1.3rem] font-semibold">{year}</span><span className="text-[0.85rem] text-ink-soft">{list.length}</span></div>
            <ul className="flex flex-col gap-3">
              {list.map((e) => (
                <li key={e.id} className="relative rounded-xl border border-rule-soft bg-paper p-3">
                  <span className="absolute -left-[1.85rem] top-5 h-2.5 w-2.5 rounded-full bg-evergreen-mid" />
                  <div className="flex flex-wrap items-center gap-2 text-[0.85rem]">
                    <span className="font-semibold text-ink">{e.on ? fmtDate(e.on, { year: "numeric" }) : "Undated"}</span>
                    <span className={`pill ${KIND_TONE[e.kind] ?? "bg-rule-soft text-ink-soft"}`}>{KIND_LABEL[e.kind] ?? e.kind}</span>
                    {e.pending && <span className="pill bg-brass-tint text-brass-deep">awaiting approval</span>}
                  </div>
                  <div className={`mt-1 font-semibold ${parent ? "text-[1.15rem]" : ""}`}>{e.title}</div>
                  {e.detail && <p className={`mt-0.5 whitespace-pre-line text-ink-soft ${parent ? "" : "text-[0.95rem]"}`}>{e.detail}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[0.85rem] text-ink-soft">
                    {e.source && <span>{e.source}</span>}
                    {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="font-semibold text-evergreen">Open the scan ↗</a>}
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}
