import Link from "next/link";
import type { Viewer } from "@/lib/session";
import { canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { fmtTime, greeting, monthDay, relative, subjectName, todayLong, fmtMoney, fmtDate } from "@/lib/format";
import { DateChip, Empty, LegalStatusPill, SectionCard, SourceTag, Stat } from "@/components/ui";
import { LabChart } from "./lab-chart";
import { Mic } from "@/components/icons";
import { ShareUpdateButton } from "./share-update";
import { DismissQuestion } from "./dismiss-question";
import { isHealthQuestion } from "@/lib/questions";
import { AgentRiana, findRiana } from "./agent-riana";
import { MONTH_NAMES, inDays, todayIn, upcomingBirthdays } from "@/lib/people/birthdays";

export async function MainDashboard({ viewer: v }: { viewer: Viewer }) {
  const [questions, events, legal, bills, labs, riana, people] = await Promise.all([
    data.getQuestions(v), data.getUpcomingEvents(v), data.getLegalDocuments(v),
    data.getBills(v), data.getLabSeries(v, "diana", "A1C"), data.getRianaPending(v), data.getPeople(v),
  ]);
  // "Coming up" mixes calendar events with contacts' birthdays in the next two weeks, in date order.
  const pad = (n: number) => String(n).padStart(2, "0");
  const comingUp = [
    ...events.map((e) => ({ key: e.id, at: e.starts_at, event: e, birthday: null })),
    ...upcomingBirthdays(people, todayIn(), 14).map((b) => ({ key: `bd-${b.person.id}`, at: `${b.on.y}-${pad(b.on.m)}-${pad(b.on.d)}T00:00:00-07:00`, event: null, birthday: b })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(0, 5);
  const openQs = questions.filter((q) => !["answered", "closed"].includes(q.status) && !isHealthQuestion(q));
  const failed = bills.filter((b) => b.status === "failed" || b.status === "overdue");
  const dueThisMonth = bills.filter((b) => b.next_due_on && new Date(b.next_due_on).getMonth() === new Date().getMonth());
  const signed = legal.filter((d) => ["signed", "recorded"].includes(d.status)).length;
  const next = events[0];

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[0.9rem] font-semibold uppercase tracking-[0.04em] text-ink-soft">{todayLong()}</div>
          <h1 className="text-[2.2rem] font-semibold leading-tight sm:text-[2.6rem]">{greeting()}, {v.name}</h1>
          <p className="text-ink-soft">{canWrite(v, "urgent_questions") ? "Here is what needs your care this week." : "Here is what is happening in the family."}</p>
        </div>
        <ShareUpdateButton />
      </header>

      {v.locked.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brass-deep/40 bg-brass-tint px-5 py-4">
          <div><strong>Some sections are locked</strong> <span className="text-ink-soft">until you finish 2-step verification for this sign-in.</span></div>
          <Link href="/mfa" className="font-bold text-brass-deep">Verify now</Link>
        </div>
      )}

      <section aria-label="At a glance" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {canRead(v, "bills") && <Stat label="Bills due this month" value={dueThisMonth.length} note={`${dueThisMonth.filter((b) => b.autopay).length} on autopay`} href="/bills" />}
        {canRead(v, "bills") && <Stat label="Failed payments" value={failed.length} tone={failed.length ? "ember" : "evergreen"} note={failed[0] ? `${failed[0].payee} · ${fmtMoney(failed[0].amount)}` : "All clear"} href="/bills" />}
        <Stat label="Next appointment" value={next ? fmtDate(next.starts_at) : "—"} note={next ? `${subjectName(next.about)} · ${next.title}` : "Nothing scheduled"} href="/calendar" />
        {canRead(v, "legal") && (
          <Stat label="Estate documents signed" value={<>{signed} <span className="text-[1.1rem] text-ink-soft">of {legal.length}</span></>} href="/legal"
            note={<div className="mt-1 h-2 overflow-hidden rounded-full bg-rule-soft"><div className="h-2 bg-evergreen" style={{ width: `${legal.length ? (signed / legal.length) * 100 : 0}%` }} /></div>} />
        )}
        {!canRead(v, "legal") && <Stat label="Open questions" value={openQs.length} href="/questions" />}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {canRead(v, "urgent_questions") && (
          <SectionCard title="Questions for Mom & Dad" link={{ href: "/questions", label: `All ${questions.filter((q) => !isHealthQuestion(q)).length}` }}>
            {openQs.length === 0 ? <Empty>Nothing open. Well done.</Empty> : (
              <ul className="divide-y divide-rule-soft">
                {openQs.slice(0, 4).map((q) => (
                  <li key={q.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span aria-hidden className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${q.priority === "high" ? "bg-ember" : "bg-brass"}`} />
                    <div className="min-w-0">
                      <Link href={`/questions#${q.id}`} className="font-semibold text-ink">{q.question}</Link>
                      <div className="text-[0.9rem] text-ink-soft">
                        Owner: {q.owner_name ?? "—"} · Ask {subjectName(q.asked_of)}{q.due_on ? ` · due ${relative(q.due_on)}` : ""} <SourceTag source={q.source} />
                        {canWrite(v, "urgent_questions") && <> · <DismissQuestion id={q.id} /></>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        <SectionCard title="Coming up" link={{ href: "/calendar", label: "Calendar" }}>
          {comingUp.length === 0 ? <Empty>Nothing in the next six weeks.</Empty> : (
            <ul className="flex flex-col gap-3">
              {comingUp.map(({ key, event: e, birthday: b }) => {
                if (b) return (
                  <li key={key} className="flex items-center gap-4">
                    <DateChip month={MONTH_NAMES[b.on.m - 1].slice(0, 3).toUpperCase()} day={String(b.on.d)} />
                    <div className="min-w-0">
                      <div className="font-semibold">{b.person.full_name}’s birthday</div>
                      <div className="text-[0.9rem] text-ink-soft">{inDays(b.days).replace(/^./, (c) => c.toUpperCase())}{b.turns ? ` · turns ${b.turns}` : ""} · <Link href="/contacts" className="font-semibold text-evergreen">Contacts</Link></div>
                    </div>
                  </li>
                );
                if (!e) return null;
                const { month, day } = monthDay(e.starts_at);
                return (
                  <li key={key} className="flex items-center gap-4">
                    <DateChip month={month} day={day} />
                    <div className="min-w-0">
                      <div className="font-semibold">{subjectName(e.about)} · {e.title}</div>
                      <div className="text-[0.9rem] text-ink-soft">
                        {e.all_day ? "All day" : fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ""}{e.driver ? ` · ${e.driver} driving` : ""} <SourceTag source={e.source} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <AgentRiana riana={findRiana(people)} pending={riana.length} canReview={canRead(v, "admin")} />

        {canRead(v, "legal") && (
          <SectionCard title="Estate documents" link={{ href: "/legal", label: "Status board" }}>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {legal.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-rule-soft px-3 py-2">
                  <span className="truncate font-semibold">{d.title}</span>
                  <LegalStatusPill status={d.status} />
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {canRead(v, "health_diana") && (
          <SectionCard title="Diana · A1C over time" link={{ href: "/health/diana", label: "Health" }}>
            <LabChart series={labs} title="A1C" />
          </SectionCard>
        )}
      </div>

      {canRead(v, "family_history") && (
        <section className="mt-6 flex flex-wrap items-center gap-7 rounded-3xl bg-ink p-7 text-parchment">
          <div className="flex aspect-[4/3] w-full max-w-[260px] items-center justify-center rounded-lg border-[6px] border-parchment bg-[#4a4136] text-[0.9rem] text-[#d8ccb4]">
            Archive photo
          </div>
          <div className="flex min-w-[260px] flex-1 flex-col gap-2">
            <div className="eyebrow text-brass">From the family archive</div>
            <h2 className="text-[1.7rem] font-semibold leading-tight text-parchment">A memory from the 1970s</h2>
            <p className="text-[#e3d9c6]">Each week this spot will surface one photo, journal page or recorded story, with the people in it tagged and the story behind it. The archive arrives in phase 6.</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link href="/history" className="btn border border-brass text-parchment hover:bg-[#3a342c]">Open the timeline</Link>
              <Link href="/history" className="btn-brass"><Mic size={20} /> Record a memory</Link>
            </div>
          </div>
        </section>
      )}

    </>
  );
}
