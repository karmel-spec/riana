"use client";

import { useMemo, useState, useTransition } from "react";
import type { ContactGroup, Person } from "@/lib/types";
import { confirmPerson, deletePerson, setNotifyFirst } from "@/app/actions/records";
import { fmtDate, subjectName } from "@/lib/format";
import { Check, Mail, Phone, Search } from "@/components/icons";
import { Empty } from "@/components/ui";
import { EditPersonForm } from "./edit-person-form";
import { birthdayLabel, byNextBirthday, inDays, upcomingBirthdays, MONTH_NAMES, type Ymd } from "@/lib/people/birthdays";

const METHOD: Record<string, string> = { phone: "Call", text: "Text", email: "Email", mail: "Letter", in_person: "In person" };

export function Directory({ people, groups, canEdit, parent, today }: { people: Person[]; groups: ContactGroup[]; canEdit: boolean; parent: boolean; today: Ymd }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [spouse, setSpouse] = useState("");
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false);
  const [onlyFirst, setOnlyFirst] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [sort, setSort] = useState<"name" | "name_desc" | "unconfirmed" | "first" | "closeness" | "birthday">("name");
  const [, start] = useTransition();
  const remove = (p: Person) => { if (window.confirm(`Remove ${p.full_name} from the contacts? This can't be undone.`)) start(() => { deletePerson(p.id); }); };

  const shown = useMemo(() => people.filter((p) => {
    if (group && !p.group_ids.includes(group)) return false;
    if (spouse && p.connected_to !== spouse && p.connected_to !== "both") return false;
    if (onlyUnconfirmed && p.confirmed) return false;
    if (onlyFirst && !p.notify_first) return false;
    if (onlyMissing && (p.phone || p.email)) return false;
    if (q) {
      const hay = `${p.full_name} ${p.relationship ?? ""} ${p.city ?? ""} ${p.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    const name = a.full_name.localeCompare(b.full_name);
    if (sort === "name_desc") return -name;
    if (sort === "unconfirmed") return Number(a.confirmed) - Number(b.confirmed) || name;
    if (sort === "first") return Number(b.notify_first) - Number(a.notify_first) || name;
    if (sort === "closeness") return (b.closeness ?? 0) - (a.closeness ?? 0) || name;
    if (sort === "birthday") return byNextBirthday(a, b, today) || name;
    return name;
  }), [people, q, group, spouse, onlyUnconfirmed, onlyFirst, onlyMissing, sort, today]);
  const soon = useMemo(() => upcomingBirthdays(people, today, 30), [people, today]);

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? "";

  return (
    <>
      {soon.length > 0 && (
        <section aria-labelledby="bd-soon" className="mb-5 rounded-2xl border border-rule bg-paper-warm px-5 py-4">
          <h2 id="bd-soon" className={`font-semibold ${parent ? "text-[1.4rem]" : "text-[1.15rem]"}`}>Upcoming birthdays <span className="text-[0.9rem] font-normal text-ink-soft">next 30 days</span></h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {soon.map(({ person: p, on, days, turns }) => (
              <li key={p.id} className={`rounded-xl border px-3 py-2 ${days === 0 ? "border-brass-deep/50 bg-brass-tint" : "border-rule-soft bg-paper"} ${parent ? "text-[1.15rem]" : ""}`}>
                <span className="font-semibold">{p.full_name}</span>
                <span className="text-ink-soft"> · {MONTH_NAMES[on.m - 1].slice(0, 3)} {on.d} · {inDays(days)}{turns ? ` · turns ${turns}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-rule bg-paper px-3">
          <Search size={20} className="text-ink-soft" />
          <span className="sr-only">Search people</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={parent ? "Search by name…" : "Search by name, city, note…"} className={`w-full bg-transparent outline-none ${parent ? "min-h-[52px] text-[1.15rem]" : "min-h-[44px]"}`} />
        </label>
        <label className={parent ? "w-full sm:w-auto" : ""}><span className="sr-only">Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={`field ${parent ? "min-h-[52px] text-[1.1rem] sm:w-auto" : "w-auto"}`}>
            <option value="">{parent ? "Everyone" : "All groups"}</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        {!parent && (
          <>
            <label><span className="sr-only">Connected to</span>
              <select value={spouse} onChange={(e) => setSpouse(e.target.value)} className="field w-auto">
                <option value="">Rich & Diana</option><option value="rich">Rich’s people</option><option value="diana">Diana’s people</option>
              </select>
            </label>
            <label><span className="sr-only">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field w-auto">
                <option value="name">Sort: name A–Z</option><option value="name_desc">Sort: name Z–A</option><option value="unconfirmed">Sort: unconfirmed first</option><option value="first">Sort: tell first</option><option value="closeness">Sort: closest first</option><option value="birthday">Sort: by birthday</option>
              </select>
            </label>
          </>
        )}
        {(!parent || people.some((p) => !p.confirmed)) && <label className="flex min-h-[44px] items-center gap-2 font-semibold">
          <input type="checkbox" checked={onlyUnconfirmed} onChange={(e) => setOnlyUnconfirmed(e.target.checked)} className="h-5 w-5 accent-evergreen" />
          {parent ? "Only the ones I haven’t checked" : "Unconfirmed only"}
        </label>}
        {!parent && (
          <>
            <label className="flex min-h-[44px] items-center gap-2 font-semibold">
              <input type="checkbox" checked={onlyFirst} onChange={(e) => setOnlyFirst(e.target.checked)} className="h-5 w-5 accent-evergreen" />Tell first only
            </label>
            <label className="flex min-h-[44px] items-center gap-2 font-semibold">
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-5 w-5 accent-evergreen" />Missing phone & email
            </label>
          </>
        )}
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
              {parent && (p.phone || p.email) && (
                <div className="flex flex-wrap gap-2">
                  {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="btn-primary min-h-[52px] flex-1 px-4 text-[1.1rem] no-underline"><Phone size={22} /> Call</a>}
                  {p.phone && <a href={`sms:${p.phone.replace(/[^\d+]/g, "")}`} className="btn-secondary min-h-[52px] flex-1 px-4 text-[1.1rem] no-underline">Text</a>}
                  {p.email && <a href={`mailto:${p.email}`} className="btn-secondary min-h-[52px] flex-1 px-4 text-[1.1rem] no-underline"><Mail size={22} /> Email</a>}
                </div>
              )}
              <div className={`flex flex-wrap gap-x-4 gap-y-1 ${parent ? "text-[1.05rem]" : "text-[0.95rem]"}`}>
                {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 text-evergreen"><Phone size={16} /> {p.phone}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-evergreen"><Mail size={16} /> {p.email}</a>}
                {p.preferred_method && <span className="text-ink-soft">Prefers: {METHOD[p.preferred_method]}</span>}
              </div>
              {p.birth_month && p.birth_day && <div className="text-[0.95rem]"><span className="font-semibold">Birthday:</span> {birthdayLabel(p, today)}</div>}
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
                  <EditPersonForm person={p} groups={groups} simple={parent} />
                  {!parent && <button type="button" onClick={() => remove(p)} className="btn text-[0.9rem] text-ember">Remove</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
