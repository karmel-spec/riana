import { notFound } from "next/navigation";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { CollapsibleCard, Empty, PageHeader, SourceTag, DateChip } from "@/components/ui";
import { MedicalTimeline, type TimelineEntry } from "./timeline";
import { LabChart } from "@/components/dashboard/lab-chart";
import { fmtDate, fmtTime, monthDay, relative } from "@/lib/format";
import { Phone } from "@/components/icons";
import { ClaimTimeline, ConditionList, HealthForms, MedicationList, ProviderRowActions } from "./health-client";
import { HEALTH_RECORDS_INDEX_URL } from "@/lib/links";

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
  const [providers, meds, conditions, visits, labs, events, vaClaims, imported, healthFiles] = await Promise.all([
    data.getProviders(v, patient), data.getMedications(v, patient), data.getConditions(v, patient),
    data.getVisitNotes(v, patient), data.getAllLabs(v, patient), data.getUpcomingEvents(v, 120),
    patient === "rich" ? data.getVaClaims(v) : Promise.resolve([]),
    v.role === "super_admin" ? listImportedFiles(v) : Promise.resolve([]),
    data.getHealthFiles(v, patient),
  ]);
  await data.logView(v, section);
  const name = WHO[patient];
  const parent = v.brief;
  const own = parent && v.isSubject === patient;
  const canEdit = canWrite(v, section);
  const myEvents = events.filter((e) => e.about === patient && e.kind === "appointment");
  const providerName = (id: string | null) => providers.find((p) => p.id === id)?.name ?? null;
  const byTest = new Map<string, typeof labs>();
  for (const l of labs) byTest.set(l.test_name, [...(byTest.get(l.test_name) ?? []), l]);
  const providerOpts = providers.map((p) => ({ id: p.id, name: p.name }));

  // --- Medical notes timeline: every dated record from every source, newest first ---
  const dateFromName = (n: string) => (/^(\d{4}-\d{2}-\d{2})/.exec(n)?.[1] ?? "");
  const parseNote = (note: string | null) => { const m = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(note ?? ""); return m ? { kind: m[1], text: m[2] } : { kind: "document", text: note ?? "" }; };
  const timeline: TimelineEntry[] = [
    ...healthFiles.map((f) => { const { kind, text } = parseNote(f.target_note); const on = f.taken_at ? f.taken_at.slice(0, 10) : dateFromName(f.name); const [head, ...rest] = text ? text.split(": ") : [""]; return { id: `f-${f.id}`, on, kind, title: text ? head : f.name.replace(/\.[a-z0-9]+$/i, ""), detail: text ? rest.join(": ") : null, source: `Scanned record · ${f.name}`, link: `/files/${f.id}`, pending: f.review_status !== "approved" }; }),
    ...visits.map((n) => ({ id: `v-${n.id}`, on: n.visit_on, kind: "visit", title: providerName(n.provider_id) ? `Visit: ${providerName(n.provider_id)}` : "Visit", detail: [n.summary, n.follow_up && `Follow-up: ${n.follow_up}`].filter(Boolean).join(" "), source: n.author_name ? `Logged by ${n.author_name}` : "Visit note" })),
    ...[...byTest.entries()].flatMap(([test, rows]) => rows.map((l) => ({ id: `l-${l.id}`, on: l.taken_on, kind: "lab", title: `${test}: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.flag && l.flag !== "normal" ? ` (${l.flag})` : ""}`, detail: l.ref_low !== null || l.ref_high !== null ? `Reference ${l.ref_low ?? "–"} to ${l.ref_high ?? "–"}` : null, source: "Lab result" }))),
    ...vaClaims.filter((c) => c.event_on || c.decided_on || c.filed_on).map((c) => ({ id: `c-${c.id}`, on: (c.event_on ?? c.decided_on ?? c.filed_on) as string, kind: "claim", title: c.title, detail: [c.summary, c.next_step && `Next: ${c.next_step}`].filter(Boolean).join(" "), source: `VA · ${c.status}` })),
    ...conditions.filter((c) => c.kind === "condition" && c.since).map((c) => ({ id: `d-${c.id}`, on: c.since as string, kind: "condition", title: `Diagnosed or first noted: ${c.name}`, detail: c.detail, source: c.source_document })),
    ...meds.filter((m) => m.started_on).map((m) => ({ id: `m-${m.id}`, on: m.started_on as string, kind: "medication", title: `Started ${m.name}${m.dose ? ` ${m.dose}` : ""}`, detail: m.purpose, source: m.source_document })),
  ].filter((e: TimelineEntry) => !parent || !e.pending).sort((a, b) => (b.on || "0000").localeCompare(a.on || "0000"));
  // Pharmacies get their own box at the top of Medications instead of the providers list.
  const pharmacies = providers.filter((p) => /pharmac/i.test(p.specialty ?? ""));
  const clinicians = providers.filter((p) => !pharmacies.includes(p) && p.is_current !== false);
  const former = providers.filter((p) => !pharmacies.includes(p) && p.is_current === false);
  const vaFiles = imported.filter((f) => f.target_section === "health_rich").map((f) => ({ id: f.id, name: f.name }));

  return (
    <>
      <PageHeader
        eyebrow={parent ? undefined : `Section ${patient === "diana" ? 4 : 5}`}
        title={own ? "My health" : `Health · ${name}`}
        intro={own ? "Your doctors, your medicines, and what's coming up. The kids keep this current; tell them if anything is wrong."
          : `Structured records for ${name}: every medication (daily or as needed), condition, allergy and sensitivity carries the document or visit it came from and the date.${patient === "rich" ? " The VA claim history is a timeline." : ""}`}
        actions={<><a href="#timeline" className="btn-primary">Medical Notes Timeline ↓</a>{!parent && <a href={HEALTH_RECORDS_INDEX_URL} target="_blank" rel="noreferrer" className="btn-secondary">Health records index ↗</a>}{canEdit && !parent && <HealthForms patient={patient} providers={providerOpts} />}</>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CollapsibleCard title="Coverage">
          <ConditionList patient={patient} items={conditions.filter((c) => c.kind === "coverage")} canEdit={canEdit && !parent} parent={parent} mode="coverage" />
        </CollapsibleCard>

        <CollapsibleCard title="Coming up">
          {myEvents.length === 0 ? <Empty>No appointments scheduled.</Empty> : (
            <ul className="flex flex-col gap-3">
              {myEvents.slice(0, 4).map((e) => { const { month, day } = monthDay(e.starts_at); return (
                <li key={e.id} className="flex items-center gap-4"><DateChip month={month} day={day} />
                  <div><div className="font-semibold">{e.title}</div><div className="text-[0.9rem] text-ink-soft">{e.all_day ? "All day" : fmtTime(e.starts_at)}{e.location && ` · ${e.location}`}{e.driver && ` · ${e.driver} driving`} · {relative(e.starts_at)}</div></div></li>); })}
            </ul>
          )}
        </CollapsibleCard>

        <CollapsibleCard title={own ? "My medicines" : "Medications"}>
          <div className="rounded-xl border border-rule-soft bg-paper-warm p-4">
            <div className="eyebrow">{own ? "Your pharmacy" : "Preferred pharmacy"}</div>
            {pharmacies.length === 0 ? <p className="mt-1 text-ink-soft">To find. Add the pharmacy as a provider with the specialty “Pharmacy” and it will show here.</p> : (
              <ul className="mt-1 flex flex-col gap-2">
                {pharmacies.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div><div className="font-semibold">{p.name}{p.is_va && <span className="pill ml-2 bg-slate-tint text-slate">VA</span>}</div><div className="text-[0.9rem] text-ink-soft">{[p.practice, p.portal_name && `Portal: ${p.portal_name}`].filter(Boolean).join(" · ")}{!parent && p.notes && ` · ${p.notes}`}</div></div>
                    {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="btn-secondary px-4 text-[0.95rem]"><Phone size={18} /> {p.phone}</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <MedicationList patient={patient} meds={meds} providerNames={Object.fromEntries(providers.map((p) => [p.id, p.name]))} providers={providerOpts} canEdit={canEdit && !parent} parent={parent} />
        </CollapsibleCard>

        <CollapsibleCard title="Allergies & sensitivities" className="border-ember/30">
          <ConditionList patient={patient} items={conditions.filter((c) => c.kind === "allergy" || c.kind === "sensitivity")} canEdit={canEdit && !parent} parent={parent} mode="reactions" />
        </CollapsibleCard>

        <CollapsibleCard title="Conditions">
          <ConditionList patient={patient} items={conditions.filter((c) => c.kind === "condition")} canEdit={canEdit && !parent} parent={parent} mode="conditions" />
        </CollapsibleCard>

        <CollapsibleCard title={own ? "My doctors" : "Providers"}>
          {clinicians.length === 0 ? <Empty>None recorded.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {clinicians.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div><div className="font-semibold">{p.name}{p.is_va && <span className="pill ml-2 bg-slate-tint text-slate">VA</span>}</div><div className="text-[0.9rem] text-ink-soft">{[p.specialty, p.practice].filter(Boolean).join(" · ")}{p.portal_name && ` · Portal: ${p.portal_name}`}</div>{!parent && p.notes && <div className="text-[0.85rem] text-ink-soft">{p.notes}</div>}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="btn-secondary px-4 text-[0.95rem]"><Phone size={18} /> {p.phone}</a>}
                    {canEdit && !parent && <ProviderRowActions patient={patient} item={p} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!parent && former.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-ink-soft">Former providers ({former.length})</summary>
              <ul className="mt-2 divide-y divide-rule-soft">
                {former.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div><div className="font-semibold text-ink-soft">{p.name}</div><div className="text-[0.9rem] text-ink-soft">{[p.specialty, p.practice].filter(Boolean).join(" · ")}{p.phone && ` · ${p.phone}`}{p.notes && ` · ${p.notes}`}</div></div>
                    {canEdit && <ProviderRowActions patient={patient} item={p} />}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CollapsibleCard>

        {patient === "rich" && (
          <CollapsibleCard title="VA disability claim · history" className="lg:col-span-2">
            <ClaimTimeline claims={vaClaims} canEdit={canEdit && !parent} parent={parent} files={vaFiles} isAdmin={v.role === "super_admin"} />
          </CollapsibleCard>
        )}

        {!parent && (
          <CollapsibleCard title="Labs over time" className="lg:col-span-2">
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
          </CollapsibleCard>
        )}

        {!parent && (
          <CollapsibleCard title="Visit notes" className="lg:col-span-2">
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
          </CollapsibleCard>
        )}
      </div>
      <CollapsibleCard id="timeline" title="Medical Notes Timeline" count={timeline.length} className="mt-6 scroll-mt-6">
        <p className="text-[0.95rem] text-ink-soft">{own ? "Everything from your records, newest first. Tap a card to open the scan." : `Every dated record for ${name} in one place: scanned documents from the health records index, logged visits, lab results, VA paperwork, diagnoses and medication starts. Newest first; filter by kind or search.`}</p>
        <MedicalTimeline entries={timeline} parent={parent} />
      </CollapsibleCard>
    </>
  );
}
