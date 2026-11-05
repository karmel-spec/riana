import Link from "next/link";
import { requireSection } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { Bell, ChevronRight } from "@/components/icons";

export const metadata = { title: "Notification lists" };

const PURPOSE: Record<string, string> = { funeral: "Funeral & service", hospitalization: "Hospital stay", news: "News & updates", other: "Other" };

export default async function NotifyPage() {
  const v = await requireSection("notify");
  const [lists, people] = await Promise.all([data.getNotificationLists(v), data.getPeople(v)]);
  const name = (id: string) => people.find((p) => p.id === id)?.full_name ?? "—";

  return (
    <>
      <PageHeader eyebrow="Section 16" title="Who to notify"
        intro="Ready-made lists for the hard days. Pick a list, write the message, and track who has been reached. Nothing goes out in bulk without a second admin's OK."
        actions={<Link href="/contacts" className="btn-secondary">Back to contacts</Link>} />
      <ul className="grid gap-4 md:grid-cols-3">
        {lists.map((l) => {
          const first = l.members.filter((m) => m.wave === 1);
          return (
            <li key={l.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[0.85rem] font-bold uppercase tracking-wide text-brass-deep"><Bell size={18} /> {PURPOSE[l.purpose]}</div>
              <h2 className="text-[1.3rem] font-semibold">{l.name}</h2>
              {l.description && <p className="text-ink-soft">{l.description}</p>}
              <div className="text-[0.95rem]"><strong>{l.members.length}</strong> people · <strong>{first.length}</strong> to tell first</div>
              {first.length > 0 && <p className="text-[0.9rem] text-ink-soft">First: {first.slice(0, 4).map((m) => name(m.person_id)).join(", ")}{first.length > 4 ? "…" : ""}</p>}
              <Link href={`/contacts/notify/${l.id}`} className="btn-primary mt-auto justify-between">Open list <ChevronRight size={20} /></Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
