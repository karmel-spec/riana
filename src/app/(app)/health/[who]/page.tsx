import { notFound } from "next/navigation";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SectionCard, SourceTag } from "@/components/ui";
import { LabChart } from "@/components/dashboard/lab-chart";
import { fmtDate, fmtTime, monthDay, relative } from "@/lib/format";
import { DateChip } from "@/components/ui";
import { Phone } from "@/components/icons";
import { HealthForms, MedicationList } from "./health-client";

const WHO = { diana: "Diana", rich: "Rich" } as const;

export async function generateMetadata({ params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;
  return { title: `Health · ${WHO[who as keyof typeof WHO] ?? ""}` };
}

export default async function HealthPage({ params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;
  if (who !== "diana" && who !== "rich") notFound();
  const patient = who;
  const section = `health_${patient}` as const;
  const v = await requireSection(section);
  const [providers, meds, conditions, visits, labs, events, vaClaims] = await Promise.all([
    data.getProviders(v, patient), data.getMedications(v, patient), data.getConditions(v, patient),
    data.getVisitNotes(v, patient), data.getAllLabs(v, patient), data.getUpcomingEvents(v, 120),
    patient === "rich" ? data.getVaClaims(v) : Promise.resolve([]),
  ]);
  await data.logView(v, section);
  const name = WHO[patient];
  const parent = v.role === "parent";
  const own = parent && v.isSubject === patient;
  const canEdit = canWrite(v, section);
  const myEvents = events.filter((e) => e.about === patient && e.kind === "appointment");
  const providerName = (id: string | null) => providers.find((p) => p.id === id)?.name ?? null;
  const byTest = new Map<string, typeof labs>();
  for (const l of labs) byTest.set(l.test_name, [...(byTest.get(l.test_name) ?? []), l]);
  const activeMeds = meds.filter((m) => m.active);
  const allergies = conditions.filter((c) => c.kind === "allergy");
  const diagnoses = conditions.filter((c) => c.kind === "condition");
  const coverage = conditions.filter((c) => c.kind === "coverage");

  return (
    <>
      <PageHeader
        eyebrow={parent ? undefined : `Section ${patient === "diana" ? 4 : 5}`}
        title={own ? "My health" : `Health · ${name}`}
        intro={own
          ? "Your doctors, your medicines, and what's coming up. The kids keep this current; tell them if anything is wrong."
          : `Providers, coverage, medications, allergies, conditions, visit notes and labs for ${name}.${patient === "rich" ? " Includes the VA claim." : ""}`}
        actions={canEdit && !parent ? <HealthForms patient={patient} providers={providers.map((p) => ({ id: p.id, name: p.name }))} /> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Coming up">
          {myEvents.length === 0 ? <Empty>No appointments scheduled.</Empty> : (
            <ul className="flex flex-col gap-3">
              {myEvents.slice(0, 4).map((e) => {
                const { month, day } = monthDay(e.starts_at);
                return (
                  <li key={e.id} className="flex items-center gap-4">
                    <DateChip month={month} day={day} />
                    <div>
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-[0.9rem] text-ink-soft">{e.all_day ? "All day" : fmtTime(e.starts_at)}{e.location && ` · ${e.location}`}{e.driver && ` · ${e.driver} driving`} · {relative(e.starts_at)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={own ? "My medicines" : "Medications"}>
          {activeMeds.length === 0 ? <Empty>None recorded.</Empty> : (
            <MedicationList patient={patient} meds={meds} providerNames={Object.fromEntries(providers.map((p) => [p.id, p.name]))} canEdit={canEdit && !parent} parent={parent} />
          )}
        </SectionCard>

        <SectionCard title={own ? "My doctors" : "Providers"}>
          {providers.length === 0 ? <Empty>None recorded.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {providers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-semibold">{p.name}{p.is_va && <span className="pill ml-2 bg-slate-tint text-slate">VA</span>}</div>
                    <div className="text-[0.9rem] text-ink-soft">{[p.specialty, p.practice].filter(Boolean).join(" · ")}{p.portal_name && ` · Portal: ${p.portal_name}`}</div>
                    {p.notes && <div className="text-[0.9rem] text-ink-soft">{p.notes}</div>}
                  </div>
                  {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="btn-secondary px-4 text-[0.95rem]"><Phone size={18} /> {p.phone}</a>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Conditions, allergies & coverage">
          <div className="flex flex-col gap-3">
            <Group label="Allergies" items={allergies} tone="ember" />
            <Group label="Conditions" items={diagnoses} />
            <Group label="Coverage" items={coverage} />
          </div>
        </SectionCard>

        {patient === "rich" && (
          <SectionCard title="VA disability claim" className="lg:col-span-2">
            {vaClaims.length === 0 ? <Empty>Nothing on file.</Empty> : (
              <ul className="grid gap-3 md:grid-cols-3">
                {vaClaims.map((c) => (
                  <li key={c.id} className="rounded-xl border border-rule-soft p-4">
                    <div className="eyebrow">{{ claim: "Claim", appeal: "Appeal", cp_exam: "C&P exam", rating_decision: "Rating" }[c.kind]}</div>
                    <div className="mt-1 font-semibold">{c.title}</div>
                    <div className="text-ink-soft">{c.status}{c.rating_pct !== null && c.kind !== "rating_decision" ? ` · ${c.rating_pct}%` : ""}</div>
                    {c.filed_on && <div className="text-[0.9rem] text-ink-soft">Filed {fmtDate(c.filed_on, { year: "numeric" })}</div>}
                    {c.decided_on && <div className="text-[0.9rem] text-ink-soft">Decided {fmtDate(c.decided_on, { year: "numeric" })}</div>}
                    {c.next_step && <div className="mt-2 rounded-lg bg-brass-tint px-3 py-2 text-[0.9rem] text-brass-deep">Next: {c.next_step}</div>}
                    {c.notes && <div className="mt-1 text-[0.9rem] text-ink-soft">{c.notes}</div>}
                    <div className="mt-1"><SourceTag source={c.source} /></div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {!parent && (
          <SectionCard title="Labs over time" className="lg:col-span-2">
            {byTest.size === 0 ? <Empty>No lab results yet.</Empty> : (
              <div className="grid gap-6 md:grid-cols-2">
                {[...byTest.entries()].map(([test, series]) => (
                  <div key={test}>
                    <h3 className="mb-1 font-sans text-[1.05rem] font-bold">{test} <span className="font-normal text-ink-soft">· {series.length} result{series.length > 1 ? "s" : ""}{series[0].ref_low !== null && series[0].ref_high !== null ? ` · normal ${series[0].ref_low}–${series[0].ref_high}${series[0].unit ?? ""}` : ""}</span></h3>
                    <LabChart series={series} title={test} />
                    <table className="mt-2 w-full text-[0.9rem]">
                      <tbody>
                        {[...series].reverse().slice(0, 4).map((l) => (
                          <tr key={l.id} className="border-t border-rule-soft">
                            <td className="py-1 text-ink-soft">{fmtDate(l.taken_on, { year: "numeric" })}</td>
                            <td className={`py-1 font-semibold ${l.flag !== "normal" ? "text-ember" : ""}`}>{l.value}{l.unit}{l.flag !== "normal" && ` · ${l.flag}`}</td>
                            <td className="py-1 text-right"><SourceTag source={l.source} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {!parent && (
          <SectionCard title="Visit notes" className="lg:col-span-2">
            {visits.length === 0 ? <Empty>No visits logged yet. Use “Log a visit” after each appointment.</Empty> : (
              <ul className="flex flex-col gap-3">
                {visits.map((n) => (
                  <li key={n.id} className="rounded-xl border border-rule-soft p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-semibold">{fmtDate(n.visit_on, { year: "numeric", weekday: "short" })}{providerName(n.provider_id) && ` · ${providerName(n.provider_id)}`}</div>
                      <div className="text-[0.85rem] text-ink-soft">by {n.author_name ?? "—"} <SourceTag source={n.source} /></div>
                    </div>
                    <p className="mt-1 whitespace-pre-line">{n.summary}</p>
                    {n.follow_up && <p className="mt-1 text-[0.95rem] text-evergreen"><strong>Follow up:</strong> {n.follow_up}</p>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}
      </div>
    </>
  );
}

function Group({ label, items, tone }: { label: string; items: { id: string; name: string; detail: string | null; since: string | null }[]; tone?: "ember" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className={`eyebrow ${tone === "ember" ? "text-ember" : ""}`}>{label}</div>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((c) => (
          <li key={c.id}><span className="font-semibold">{c.name}</span>{c.detail && <span className="text-ink-soft"> · {c.detail}</span>}{c.since && <span className="text-[0.85rem] text-ink-soft"> · since {fmtDate(c.since, { year: "numeric", month: undefined, day: undefined })}</span>}</li>
        ))}
      </ul>
    </div>
  );
}
