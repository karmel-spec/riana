import Link from "next/link";
import type { Viewer } from "@/lib/session";
import * as data from "@/lib/data";
import { fmtDateLong, fmtTime, greeting, subjectName } from "@/lib/format";
import { Calendar, Dove, Mic, People, Question, Book, ChevronRight } from "@/components/icons";

/**
 * The parents' home. Calm by design: one next thing, questions the
 * family is waiting on, and the four things they can do. No money,
 * bills, failed payments or document counts.
 */
export async function ParentHome({ viewer: v }: { viewer: Viewer }) {
  const [events, questions] = await Promise.all([data.getUpcomingEvents(v, 60), data.getQuestions(v)]);
  const mine = events.filter((e) => e.about === v.isSubject || e.about === "both" || e.about === "household");
  const next = mine[0];
  const forMe = questions.filter((q) => !["answered", "closed"].includes(q.status) && (q.asked_of === v.isSubject || q.asked_of === "both"));

  return (
    <>
      <h1 className="mb-6 text-[2.4rem] font-semibold leading-tight sm:text-[2.8rem]">{greeting()}, {v.name}.</h1>

      <section aria-labelledby="next-up" className="on-dark mb-6 rounded-3xl bg-evergreen p-7 text-paper sm:p-9">
        <div id="next-up" className="eyebrow text-brass">Next on your calendar</div>
        {next ? (
          <>
            <div className="mt-2 font-serif text-[2rem] font-semibold leading-tight sm:text-[2.3rem]">{next.title}</div>
            <div className="mt-2 text-[1.2rem] text-mist">
              {fmtDateLong(next.starts_at)}{!next.all_day && ` at ${fmtTime(next.starts_at)}`}
              {next.location && <><br />{next.location}</>}
              {next.driver && <><br />{next.driver} will drive you</>}
            </div>
            {next.about !== v.isSubject && <div className="mt-1 text-mist">For {subjectName(next.about)}</div>}
          </>
        ) : (
          <div className="mt-2 font-serif text-[1.8rem] font-semibold">Nothing scheduled. Enjoy your day.</div>
        )}
        <Link href="/calendar" className="btn mt-5 bg-paper text-evergreen hover:bg-parchment"><Calendar size={22} /> See the whole calendar</Link>
      </section>

      {forMe.length > 0 && (
        <section aria-labelledby="qs" className="card mb-6">
          <h2 id="qs" className="text-[1.5rem] font-semibold">The family would love your answer</h2>
          <ul className="mt-3 divide-y divide-rule-soft">
            {forMe.slice(0, 3).map((q) => (
              <li key={q.id}>
                <Link href={`/questions#${q.id}`} className="flex items-center justify-between gap-4 py-3 text-ink no-underline">
                  <span className="font-semibold">{q.question}</span>
                  <ChevronRight className="shrink-0 text-evergreen" />
                </Link>
              </li>
            ))}
          </ul>
          {forMe.length > 3 && <Link href="/questions" className="mt-3 inline-block font-semibold text-evergreen">All {forMe.length} questions</Link>}
        </section>
      )}

      <section aria-label="Things you can do" className="grid gap-4 sm:grid-cols-2">
        <Tile href="/questions" icon={<Question size={30} />} title="Answer a question" text="Short questions from the kids, one at a time." />
        <Tile href="/wishes" icon={<Dove size={30} />} title="My wishes" text="Your service, music, and what matters to you." />
        <Tile href="/contacts" icon={<People size={30} />} title="People to tell" text="Check the list of friends and family we have." />
        <Tile href="/history" icon={<Book size={30} />} title="Memories" text="Photos, journals and the stories behind them." />
      </section>

      <section className="on-dark mt-6 flex flex-wrap items-center gap-6 rounded-3xl bg-evergreen-mid p-7 text-paper">
        <Link href="/history" aria-label="Record a memory" className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full border-[6px] border-mist bg-paper text-ember">
          <Mic size={44} />
        </Link>
        <div className="min-w-[240px] flex-1">
          <h2 className="text-[1.6rem] font-semibold leading-tight text-paper">Tell us a story</h2>
          <p className="mt-1 text-mist">Tap the button and talk. We’ll save it with the family photos and type it out for the grandkids.</p>
          <p className="mt-3 rounded-xl bg-evergreen-deep/60 px-4 py-3 text-[1.05rem]">This week: “What was your first car, and where did you drive it?”</p>
        </div>
      </section>
    </>
  );
}

function Tile({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="card flex min-h-[150px] flex-col gap-2 no-underline hover:border-evergreen-mid">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-2xl bg-evergreen-tint text-evergreen">{icon}</div>
      <div className="font-serif text-[1.4rem] font-semibold text-ink">{title}</div>
      <div className="text-ink-soft">{text}</div>
    </Link>
  );
}
