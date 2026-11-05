import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { Tracker } from "./tracker";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireSection("notify");
  const { id } = await params;
  const [lists, people, campaigns] = await Promise.all([data.getNotificationLists(v), data.getPeople(v), data.getCampaigns(v, id)]);
  const list = lists.find((l) => l.id === id);
  if (!list) notFound();
  await data.logView(v, "notify", "notification_lists");

  const members = list.members
    .map((m) => ({ ...m, person: people.find((p) => p.id === m.person_id) }))
    .filter((m) => m.person)
    .sort((a, b) => a.wave - b.wave || a.person!.full_name.localeCompare(b.person!.full_name));

  return (
    <>
      <PageHeader eyebrow="Notification list" title={list.name} intro={list.description ?? undefined}
        actions={<Link href="/contacts/notify" className="btn-secondary">All lists</Link>} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card">
          <h2 className="text-[1.3rem] font-semibold">People on this list ({members.length})</h2>
          <p className="mb-3 text-[0.9rem] text-ink-soft">Wave 1 is told first, in person or by phone. Waves 2 and 3 follow.</p>
          {[1, 2, 3].map((w) => {
            const group = members.filter((m) => m.wave === w);
            if (!group.length) return null;
            return (
              <div key={w} className="mb-4">
                <h3 className="mb-1 font-sans text-[0.85rem] font-bold uppercase tracking-wide text-brass-deep">Wave {w} · {group.length}</h3>
                <ul className="divide-y divide-rule-soft">
                  {group.map((m) => (
                    <li key={m.person_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span><strong>{m.person!.full_name}</strong> <span className="text-ink-soft">· {m.person!.relationship}</span></span>
                      <span className="text-[0.9rem] text-ink-soft">{m.person!.phone ?? m.person!.email ?? "no contact info"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card">
            <h2 className="text-[1.2rem] font-semibold">Send a message</h2>
            <p className="mt-1 text-[0.95rem] text-ink-soft">Write or paste the message (obituary, service time and place, an update). One super admin requests the send; a <strong>different</strong> super admin must approve it before anything goes out. The sending itself (email/SMS) is wired up in phase 5.</p>
            <button type="button" disabled className="btn-primary mt-3 w-full opacity-60">Draft a message (phase 5)</button>
          </section>
          {campaigns.map((c) => (
            <Tracker key={c.id} campaign={c} people={people} canEdit={canWrite(v, "notify")} />
          ))}
        </aside>
      </div>
    </>
  );
}
