"use client";

import { useTransition } from "react";
import type { NotificationCampaign, Person, RecipientStatus } from "@/lib/types";
import { setRecipientStatus } from "@/app/actions/records";

const STATUS: Record<RecipientStatus, [string, string]> = {
  not_sent: ["Not yet", "bg-rule-soft text-ink-soft"],
  sent: ["Contacted", "bg-slate-tint text-slate"],
  replied: ["Replied", "bg-brass-tint text-brass-deep"],
  attending: ["Attending", "bg-evergreen-tint text-evergreen"],
  not_attending: ["Can't come", "bg-rule-soft text-ink-soft"],
};

export function Tracker({ campaign: c, people, canEdit }: { campaign: NotificationCampaign; people: Person[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const name = (id: string) => people.find((p) => p.id === id)?.full_name ?? "—";
  const counts = c.recipients.reduce((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {} as Record<string, number>);
  const reached = c.recipients.filter((r) => r.status !== "not_sent").length;

  return (
    <section className="card">
      <div className="eyebrow">{c.status === "sent" ? "Sent" : c.status.replace("_", " ")}</div>
      <h2 className="text-[1.2rem] font-semibold">{c.title}</h2>
      <p className="mt-1 whitespace-pre-line rounded-xl bg-parchment px-3 py-2 text-[0.95rem]">{c.message}</p>
      <p className="mt-2 text-[0.85rem] text-ink-soft">Requested by {c.requested_by_name ?? "—"}{c.approved_by_name && `, approved by ${c.approved_by_name}`}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-rule-soft" role="progressbar" aria-valuenow={reached} aria-valuemax={c.recipients.length} aria-label="People reached">
        <div className="h-2 bg-evergreen" style={{ width: `${c.recipients.length ? (reached / c.recipients.length) * 100 : 0}%` }} />
      </div>
      <p className="mt-1 text-[0.9rem]"><strong>{reached}</strong> of {c.recipients.length} reached · {counts.attending ?? 0} attending</p>
      <ul className="mt-3 divide-y divide-rule-soft">
        {c.recipients.map((r) => (
          <li key={r.person_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="font-semibold">{name(r.person_id)}</div>
              {r.contacted_by && <div className="text-[0.85rem] text-ink-soft">by {r.contacted_by}{r.note ? ` · ${r.note}` : ""}</div>}
            </div>
            {canEdit ? (
              <label>
                <span className="sr-only">Status for {name(r.person_id)}</span>
                <select value={r.status} disabled={pending}
                  onChange={(e) => start(() => { setRecipientStatus(c.id, r.person_id, e.target.value as RecipientStatus); })}
                  className={`min-h-[40px] rounded-lg border-0 px-2 text-[0.85rem] font-bold ${STATUS[r.status][1]}`}>
                  {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            ) : <span className={`pill ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
