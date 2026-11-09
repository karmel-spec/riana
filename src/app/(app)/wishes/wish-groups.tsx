import Link from "next/link";
import type { ReactNode } from "react";
import { Empty } from "@/components/ui";
import { subjectName } from "@/lib/format";
import { Check, Phone } from "@/components/icons";
import type { FinalWish, Person } from "@/lib/types";
import type { HealthFile } from "@/lib/data";
import { Linked, type DocContext } from "@/lib/doclinks";

export const TOPIC: Record<string, string> = {
  disposition: "Burial or cremation", burial_place: "Resting place", service: "The service", music: "Music",
  speakers: "Who should speak", obituary: "Obituary", organ_donation: "Organ donation", military_honors: "Military honors",
  va_benefits: "VA burial benefits", other: "Other",
};

const BURIAL_TOPICS = ["disposition", "burial_place", "military_honors", "va_benefits"];
const FUNERAL_TOPICS = ["service", "music", "speakers", "obituary", "organ_donation"];
const BURIAL_WORDS = /cemetery|cemetary|plot|grave|headstone|endowment|burial|casket|interment|odd fellows|lake haven|vault|liner/i;
const FUNERAL_WORDS = /funeral|service|program|obituary|speak|read at|viewing|visitation|hymn|music|eulogy|bishop|relief society/i;

/** Which page a wish belongs to. "other" wishes are sorted by their words; anything unsortable stays on the overview only. */
export function sideOf(w: Pick<FinalWish, "topic" | "wish" | "detail">): "burial" | "funeral" | null {
  if (BURIAL_TOPICS.includes(w.topic)) return "burial";
  if (FUNERAL_TOPICS.includes(w.topic)) return "funeral";
  const text = `${w.wish} ${w.detail ?? ""}`;
  if (BURIAL_WORDS.test(text)) return "burial";
  if (FUNERAL_WORDS.test(text)) return "funeral";
  return null;
}
export function fileSide(f: Pick<HealthFile, "name" | "target_note">): "burial" | "funeral" | null {
  const text = `${f.name} ${f.target_note ?? ""}`;
  if (BURIAL_WORDS.test(text)) return "burial";
  if (FUNERAL_WORDS.test(text)) return "funeral";
  return null;
}

export function WishGroups({ wishes, people, parent, blurbs, ctx }: { wishes: FinalWish[]; people: Person[]; parent: boolean; blurbs?: Record<"both" | "rich" | "diana", string>; ctx: DocContext }) {
  const contact = (id: string | null) => (id ? people.find((p) => p.id === id) ?? null : null);
  const groups = [
    ["both", parent ? "Both of you" : "Rich & Diana together", blurbs?.both ?? "Shared arrangements: the funeral home, the church, and what is already paid for."],
    ["rich", "Rich", blurbs?.rich ?? "His own wishes, from the 2021 will and directive."],
    ["diana", "Diana", blurbs?.diana ?? "Her own wishes, from the 2021 will and directive and her May 2026 statement."],
  ] as const;
  if (wishes.length === 0) return <Empty>Nothing written down yet.</Empty>;
  const group = (who: "both" | "rich" | "diana", heading: string, blurb: string, columns: 1 | 2) => {
    const list = wishes.filter((w) => w.person === who);
    return (
      <section id={`wishes-${who}`} className="min-w-0">
        <div className="mb-3 flex items-baseline justify-between gap-3 border-b-2 border-evergreen pb-2">
          <h2 className="font-serif text-[1.7rem] font-semibold">{heading}</h2>
          <span className="text-[0.9rem] text-ink-soft">{list.length === 0 ? "Nothing yet" : `${list.length} ${list.length === 1 ? "wish" : "wishes"}`}</span>
        </div>
        {!parent && <p className="mb-3 text-[0.95rem] text-ink-soft">{blurb}</p>}
        {list.length === 0 ? <Empty>Nothing written down for {who === "both" ? "both of them" : subjectName(who)} yet.</Empty> : (
          <ul className={`grid gap-4 ${columns === 2 ? "md:grid-cols-2" : ""}`}>
            {list.map((w) => (
              <li key={w.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <div className="eyebrow">{TOPIC[w.topic] ?? w.topic}</div>
                  {w.confirmed && <span className="pill bg-evergreen-tint text-evergreen"><Check size={14} /> Confirmed</span>}
                </div>
                <p className={`mt-2 ${parent ? "text-[1.3rem]" : "text-[1.1rem]"}`}><Linked text={w.wish} ctx={ctx} /></p>
                {w.detail && <p className={`mt-1 text-ink-soft ${parent ? "text-[1.1rem]" : "text-[0.95rem]"}`}><Linked text={w.detail} ctx={ctx} /></p>}
                {contact(w.contact_person_id) && (() => { const c = contact(w.contact_person_id)!; return (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-parchment px-3 py-2">
                    <div className="min-w-0 flex-1"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-brass-deep">Who to call</div><Link href="/contacts" className="font-semibold">{c.full_name}</Link>{c.relationship && <span className="text-ink-soft"> · {c.relationship}</span>}</div>
                    {c.phone && <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="btn-secondary px-4 text-[0.95rem]"><Phone size={18} /> {c.phone}</a>}
                  </div>); })()}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };
  // Shared wishes run full width; Rich's and Diana's sit side by side.
  return (
    <div className="flex flex-col gap-8">
      {group("both", groups[0][1], groups[0][2], 2)}
      <div className="grid gap-8 lg:grid-cols-2">
        {group("rich", groups[1][1], groups[1][2], 1)}
        {group("diana", groups[2][1], groups[2][2], 1)}
      </div>
    </div>
  );
}

export function WishFiles({ files, title, parent, upload }: { files: HealthFile[]; title: string; parent: boolean; upload?: ReactNode }) {
  if (files.length === 0 && !upload) return null;
  return (
    <section id="documents" className="card mt-8">
      <h2 className="text-[1.2rem] font-semibold">{title} <span className="text-ink-soft">· {files.length}</span></h2>
      {upload && <div className="mt-2">{upload}</div>}
      {!parent && <p className="mt-1 text-[0.9rem] text-ink-soft">Filed from Drive. Open one to see the original.</p>}
      <ul className="mt-2 divide-y divide-rule-soft">
        {files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0"><div className="font-semibold">{f.name}</div>{f.target_note && !parent && <div className="text-[0.9rem] text-ink-soft">{f.target_note.replace(/^\[[^\]]*\]\s*/, "")}</div>}</div>
            <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Open ↗</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
