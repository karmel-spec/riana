import { notFound } from "next/navigation";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { Empty, PageHeader, SectionCard, SourceTag, DateChip } from "@/components/ui";
import { LabChart } from "@/components/dashboard/lab-chart";
import { fmtDate, fmtTime, monthDay, relative } from "@/lib/format";
import { Phone } from "@/components/icons";
import { ClaimTimeline, ConditionList, HealthForms, MedicationList } from "./health-client";

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
  const [providers, meds, conditions, visits, labs, events, vaClaims, imported] = await Promise.all([
    data.getProviders(v, patient), data.getMedications(v, patient), data.getConditions(v, patient),
    data.getVisitNotes(v, patient), data.getAllLabs(v, patient), data.getUpcomingEvents(v, 120),
    patient === "rich" ? data.getVaClaims(v) : Promise.resolve([]),
    v.role === "super_admin" ? listImportedFiles(v) : Promise.resolve([]),
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
  const providerOpts = providers.map((p) => ({ id: p.id, name: p.name }));
  const vaFiles = imported.filter((f) => f.target_section === "health_rich").map((f) => ({ id: f.id, name: f.name }));

  return (
    <>
      <PageHeader
        eyebrow={parent ? undefined : `Section ${patient === "diana" ? 4 : 5}`}
        title={own ? "My health" : `Health · ${name}`}
        intro={own ? "Your doctors, your medicines, and what's coming up. The kids keep this current; tell them if anything is wrong."
          : `Structured records for ${name}: every medication (daily or as needed), condition, allergy and sensitivity carries the document or visit it came from and the date.${patient === "rich" ? " The VA claim history is a timeline." : ""}`}
        actions={canEdit && !parent ? <HealthForms patient={patient} providers={providerOpts} /> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Coming up">
          {myEvents.length === 0 ? <Empty>No appointments scheduled.</Empty> : (
            <ul className="flex flex-col gap-3">
              {myEvents.slice(0, 4).map((e) => { const { month, day } = monthDay(e.starts_at); return (
                <li key={e.id} className="flex items-center gap-4"><DateChip month={month} day={day} />
                  <div><div className="font-semibold">{e.title}</div><div className="text-[0.9rem] text-ink-soft">{e.all_day ? "All day" : fmtTime(e.starts_at)}{e.location && ` · ${e.location}`}{e.driver && ` · ${e.driver} driving`} · {relative(e.starts_at)}</div></div></li>); })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={own ? "My medicines" : "Medications"}>
          <MedicationList patient={patient} meds={meds} providerNames={Object.fromEntries(providers.map((p) => [p.id, p.name]))} providers={providerOpts} canEdit={canEdit && !parent} parent={parent} />
        </SectionCard>

        <SectionCard title="Allergies & sensitivities" className="border-ember/30">
          <ConditionList patient={patient} items={conditions.filter((c) => c.kind === "allergy" || c.kind === "sensitivity")} canEdit={canEdit && !parent} parent={parent} mode="reactions" />
        </SectionCard>

        <SectionCard title="Conditions">
          <ConditionList patient={patient} items={conditions.filter((c) => c.kind === "condition")} canEdit={canEdit && !parent} parent={parent} mode="conditions" />
        </SectionCard>

        <SectionCard title={own ? "My doctors" : "Providers"}>
          {providers.length === 0 ? <Empty>None recorded.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {providers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div><div className="font-semibold">{p.name}{p.is_va && <span className="pill ml-2 bg-slate-tint text-slate">VA</span>}</div><div className="text-[0.9rem] text-ink-soft">{[p.specialty, p.practice].filter(Boolean).join(" · ")}{p.portal_name && ` · Portal: ${p.portal_name}`}</div></div>
                  {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="btn-secondary px-4 text-[0.95rem]"><Phone size={18} /> {p.phone}</a>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Coverage">
          <ConditionList patient={patient} items={conditions.filter((c) => c.kind === "coverage")} canEdit={canEdit && !parent} parent={parent} mode="coverage" />
        </SectionCard>

        {patient === "rich" && (
          <SectionCard title="VA disability claim · history" className="lg:col-span-2">
            <ClaimTimeline claims={vaClaims} canEdit={canEdit && !parent} parent={parent} files={vaFiles} isAdmin={v.role === "super_admin"} />
          </SectionCard>
        )}

        {!parent && (
          <SectionCard title="Labs over time" className="lg:col-span-2">
            {byTest.size === 0 ? <Empty>No lab results yet.</Empty> : (
              <div className="grid gap-6 md:grid-cols-2">
                {[...byTest.entries()].map(([test, series]) => (
                  <div key={test}>
                    <h3 className="mb-1 font-sans text-[1.05rem] font-bold">{test} <span className="font-normal text-ink-soft">· {series.length} result{series.length > 1 ? "s" : ""}</span></h3>
                    <LabChart series={series} title={test} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {!parent && (
          <SectionCard title="Visit notes" className="lg:col-span-2">
            {visits.length === 0 ? <Empty>No visits logged yet.</Empty> : (
              <ul className="flex flex-col gap-3">
                {visits.map((n) => (
                  <li key={n.id} className="rounded-xl border border-rule-soft p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2"><div className="font-semibold">{fmtDate(n.visit_on, { year: "numeric", weekday: "short" })}{providerName(n.provider_id) && ` · ${providerName(n.provider_id)}`}</div><div className="text-[0.85rem] text-ink-soft">by {n.author_name ?? "—"} <SourceTag source={n.source} /></div></div>
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
