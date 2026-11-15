import type { ReactNode } from "react";

const URL_RE = /^https?:\/\/\S+$/;
const label = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Value({ v }: { v: unknown }): ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-ink-soft">—</span>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "string") {
    if (URL_RE.test(v)) return <a href={v} target="_blank" rel="noreferrer" className="break-all text-evergreen">{v} ↗</a>;
    return <span className="whitespace-pre-line">{v}</span>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-ink-soft">none</span>;
    return <ul className="list-disc pl-5">{v.map((x, i) => <li key={i}><Value v={x} /></li>)}</ul>;
  }
  if (typeof v === "object") return <Fields obj={v as Record<string, unknown>} />;
  return String(v);
}

function Fields({ obj }: { obj: Record<string, unknown> }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr]">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-sans text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">{label(k)}</dt>
          <dd className="mb-1 text-[0.95rem]"><Value v={v} /></dd>
        </div>
      ))}
    </dl>
  );
}

const EFFECT: Record<string, string> = {
  contact: "Approving adds this person to Contacts (unconfirmed, labeled via Riana).",
  album: "Approving saves the album link under Photos.",
  document: "Approving files this document on the right Health page (it joins the Medical Notes Timeline) with its Drive link, labeled via Riana.",
  lab_result: "Approving adds this lab result to the patient's Health page, labeled via Riana.",
  bill: "Approving adds this bill to the Bills page (a correction updates the matching bill instead), labeled via Riana. Account numbers are shortened to their last four digits.",
  urgent_question: "Approving adds this to Urgent Questions as an open question from Riana.",
  appointment: "Approving puts this on the shared calendar, labeled via Riana.",
};

/** The full payload behind an inbox item, opened by clicking its title. */
export function PayloadView({ summary, kind, payload }: { summary: string; kind: string; payload?: Record<string, unknown> }) {
  const effect = EFFECT[kind] ?? "Approving marks it reviewed and keeps it in the log; any binder change is made by hand from the details below.";
  const empty = !payload || Object.keys(payload).length === 0;
  return (
    <details className="group min-w-0">
      <summary className="flex cursor-pointer list-none items-start gap-2 text-[1.1rem] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="mt-1 shrink-0 text-[0.8rem] text-evergreen transition-transform group-open:rotate-90">▶</span>
        <span className="underline decoration-rule-soft underline-offset-4 hover:decoration-evergreen">{summary}</span>
      </summary>
      <div className="mt-3 rounded-xl border border-rule-soft bg-paper-warm/60 p-4">
        <p className="mb-3 text-[0.9rem] text-ink-soft">{effect}</p>
        {empty ? <p className="text-ink-soft">Riana sent no details with this item, only the summary line.</p> : <Fields obj={payload} />}
      </div>
    </details>
  );
}
