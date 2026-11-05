import { requireSection } from "@/lib/session";
import * as data from "@/lib/data";
import { DateChip, Empty, PageHeader, SourceTag } from "@/components/ui";
import { fmtDateLong, fmtTime, monthDay, relative, subjectName } from "@/lib/format";

export const metadata = { title: "Calendar" };

const KIND: Record<string, string> = { appointment: "Appointment", deadline: "Deadline", renewal: "Renewal", family: "Family", other: "" };

export default async function CalendarPage() {
  const v = await requireSection("calendar");
  const events = await data.getUpcomingEvents(v, 120);
  const parent = v.role === "parent";
  const shown = parent ? events.filter((e) => e.about === v.isSubject || e.about === "both" || e.about === "household") : events;

  // Group by month label
  const groups = new Map<string, typeof shown>();
  for (const e of shown) {
    const k = new Date(e.starts_at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/Phoenix" });
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 2"} title={parent ? "Your calendar" : "Key dates & calendar"}
        intro={parent ? "Appointments and family plans for the next few months." : "Appointments, deadlines and renewals for the next four months. You only see dates for sections you have access to."} />
      {shown.length === 0 ? <Empty>Nothing coming up.</Empty> : [...groups.entries()].map(([month, list]) => (
        <section key={month} className="mb-8">
          <h2 className="mb-3 text-[1.4rem] font-semibold">{month}</h2>
          <ul className="flex flex-col gap-3">
            {list.map((e) => {
              const { month: m, day } = monthDay(e.starts_at);
              return (
                <li key={e.id} className="card flex items-start gap-4 !p-4">
                  <DateChip month={m} day={day} />
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${parent ? "text-[1.3rem]" : "text-[1.1rem]"}`}>{e.title}</div>
                    <div className="text-ink-soft">
                      {fmtDateLong(e.starts_at)}{!e.all_day && ` at ${fmtTime(e.starts_at)}`} · {relative(e.starts_at)}
                      {e.location && <><br />{e.location}</>}
                      {e.driver && <><br />{e.driver} {parent ? "will drive" : "driving"}</>}
                    </div>
                    {!parent && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[0.85rem]">
                        <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">{subjectName(e.about)}</span>
                        {KIND[e.kind] && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">{KIND[e.kind]}</span>}
                        <SourceTag source={e.source} />
                      </div>
                    )}
                    {e.notes && <p className="mt-1 text-[0.95rem] text-ink-soft">{e.notes}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-[0.9rem] text-ink-soft">Adding and editing dates, and reminders by email, come in phase 2.</p>
    </>
  );
}
