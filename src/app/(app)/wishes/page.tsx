import { requireSection } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { subjectName } from "@/lib/format";
import Link from "next/link";
import { Check, Phone } from "@/components/icons";

export const metadata = { title: "Final Wishes" };

const TOPIC: Record<string, string> = {
  disposition: "Burial or cremation", burial_place: "Resting place", service: "The service", music: "Music",
  speakers: "Who should speak", obituary: "Obituary", organ_donation: "Organ donation", military_honors: "Military honors",
  va_benefits: "VA burial benefits", other: "Other",
};

export default async function WishesPage() {
  const v = await requireSection("final_wishes");
  const [wishes, people] = await Promise.all([data.getFinalWishes(v), data.getPeople(v)]);
  const contact = (id: string | null) => (id ? people.find((p) => p.id === id) ?? null : null);
  await data.logView(v, "final_wishes");
  const parent = v.role === "parent";
  const shown = parent ? wishes.filter((w) => w.person === v.isSubject || w.person === "both") : wishes;

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 12"} title={parent ? "My wishes" : "Final wishes & funeral requests"}
        intro={parent ? "What you'd like, in your own words. Nothing here is final until you say so." : "Burial, service, music, speakers, obituary, organ donation, military honors and VA benefits, as Rich and Diana have expressed them."} />
      {shown.length === 0 ? <Empty>Nothing written down yet.</Empty> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((w) => (
            <li key={w.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <div className="eyebrow">{TOPIC[w.topic] ?? w.topic}{!parent && ` · ${subjectName(w.person)}`}</div>
                {w.confirmed && <span className="pill bg-evergreen-tint text-evergreen"><Check size={14} /> Confirmed</span>}
              </div>
              <p className={`mt-2 ${parent ? "text-[1.3rem]" : "text-[1.1rem]"}`}>{w.wish}</p>
              {w.detail && <p className={`mt-1 text-ink-soft ${parent ? "text-[1.1rem]" : "text-[0.95rem]"}`}>{w.detail}</p>}
              {contact(w.contact_person_id) && (() => { const c = contact(w.contact_person_id)!; return (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-parchment px-3 py-2">
                  <div className="min-w-0 flex-1"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-brass-deep">Who to call</div><Link href="/contacts" className="font-semibold">{c.full_name}</Link>{c.relationship && <span className="text-ink-soft"> · {c.relationship}</span>}</div>
                  {c.phone && <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="btn-secondary px-4 text-[0.95rem]"><Phone size={18} /> {c.phone}</a>}
                </div>); })()}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-[0.9rem] text-ink-soft">Editing wishes and recording them by voice come in phase 2 and phase 6.</p>
    </>
  );
}
