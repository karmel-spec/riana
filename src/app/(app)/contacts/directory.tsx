"use client";

import { useMemo, useState, useTransition } from "react";
import type { ContactGroup, Person } from "@/lib/types";
import { confirmPerson, setNotifyFirst } from "@/app/actions/records";
import { fmtDate, subjectName } from "@/lib/format";
import { Check, Mail, Phone, Search } from "@/components/icons";
import { Empty } from "@/components/ui";

const METHOD: Record<string, string> = { phone: "Call", text: "Text", email: "Email", mail: "Letter", in_person: "In person" };

export function Directory({ people, groups, canEdit, parent }: { people: Person[]; groups: ContactGroup[]; canEdit: boolean; parent: boolean }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [spouse, setSpouse] = useState("");
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false);
  const [, start] = useTransition();

  const shown = useMemo(() => people.filter((p) => {
    if (group && !p.group_ids.includes(group)) return false;
    if (spouse && p.connected_to !== spouse && p.connected_to !== "both") return false;
    if (onlyUnconfirmed && p.confirmed) return false;
    if (q) {
      const hay = `${p.full_name} ${p.relationship ?? ""} ${p.city ?? ""} ${p.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [people, q, group, spouse, onlyUnconfirmed]);

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? "";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-rule bg-paper px-3">
          <Search size={20} className="text-ink-soft" />
          <span className="sr-only">Search people</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, city, note…" className="min-h-[44px] w-full bg-transparent outline-none" />
        </label>
        {!parent && (
          <>
            <label><span className="sr-only">Group</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="field w-auto">
                <option value="">All groups</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label><span className="sr-only">Connected to</span>
              <select value={spouse} onChange={(e) => setSpouse(e.target.value)} className="field w-auto">
                <option value="">Rich & Diana</option><option value="rich">Rich’s people</option><option value="diana">Diana’s people</option>
              </select>
            </label>
          </>
        )}
        <label className="flex min-h-[44px] items-center gap-2 font-semibold">
          <input type="checkbox" checked={onlyUnconfirmed} onChange={(e) => setOnlyUnconfirmed(e.target.checked)} className="h-5 w-5 accent-evergreen" />
          {parent ? "Only the ones I haven’t checked" : "Unconfirmed only"}
        </label>
      </div>

      <p className="mb-3 text-[0.9rem] text-ink-soft">{shown.length} of {people.length} people</p>
      {shown.length === 0 ? <Empty>Nobody matches.</Empty> : (
        <ul className={`grid gap-3 ${parent ? "" : "md:grid-cols-2"}`}>
          {shown.map((p) => (
            <li key={p.id} className="card flex flex-col gap-2 !p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`font-semibold ${parent ? "text-[1.35rem]" : "text-[1.1rem]"}`}>{p.full_name}</div>
                  <div className="text-ink-soft">{p.relationship}{!parent && ` · ${subjectName(p.connected_to)}`}{p.city && ` · ${p.city}${p.region ? `, ${p.region}` : ""}`}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.notify_first && <span className="pill bg-ember-tint text-ember">Tell first</span>}
                  {p.confirmed ? <span className="pill bg-evergreen-tint text-evergreen"><Check size={14} /> Confirmed</span> : <span className="pill bg-brass-tint text-brass-deep">Please check</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.95rem]">
                {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 text-evergreen"><Phone size={16} /> {p.phone}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-evergreen"><Mail size={16} /> {p.email}</a>}
                {p.preferred_method && <span className="text-ink-soft">Prefers: {METHOD[p.preferred_method]}</span>}
              </div>
              {!parent && (
                <div className="flex flex-wrap gap-1 text-[0.8rem]">
                  {p.group_ids.map((g) => <span key={g} className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">{groupName(g)}</span>)}
                  {p.closeness && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">Closeness {p.closeness}/5</span>}
                  {p.last_contact_on && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">Last contact {fmtDate(p.last_contact_on)}</span>}
                </div>
              )}
              {p.notes && <p className="text-[0.95rem] text-ink-soft">{p.notes}</p>}
              {canEdit && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {!p.confirmed && <button type="button" onClick={() => start(() => { confirmPerson(p.id, true); })} className="btn-primary px-4 text-[0.95rem]"><Check size={18} /> {parent ? "Yes, that's right" : "Confirm"}</button>}
                  {p.confirmed && !parent && <button type="button" onClick={() => start(() => { confirmPerson(p.id, false); })} className="btn text-[0.9rem] text-ink-soft">Unconfirm</button>}
                  <button type="button" onClick={() => start(() => { setNotifyFirst(p.id, !p.notify_first); })} className="btn-secondary px-4 text-[0.95rem]">{p.notify_first ? "Not first" : "Tell first"}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
