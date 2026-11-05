import { requireSection, canWrite, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SectionCard, SourceTag } from "@/components/ui";
import { daysUntil, fmtDate, fmtMoney, subjectName } from "@/lib/format";
import { PolicyEditor, TaxEditor } from "./insurance-client";

export const metadata = { title: "Insurance & Taxes" };

const POLICY_KIND: Record<string, string> = {
  auto: "Auto", home: "Homeowners", classic_car: "Classic car", umbrella: "Umbrella", medicare: "Medicare",
  supplemental: "Medicare supplement / Advantage", champva: "CHAMPVA", life: "Life", landlord: "Landlord (rentals)", other: "Other",
};
const TAX_KIND: Record<string, string> = { federal: "Federal return", state: "State return", property: "Property tax", exemption: "Exemption", other: "Other" };
const GROUPS: { title: string; kinds: string[] }[] = [
  { title: "Health coverage", kinds: ["medicare", "supplemental", "champva"] },
  { title: "Home, rentals & umbrella", kinds: ["home", "landlord", "umbrella"] },
  { title: "Vehicles", kinds: ["auto", "classic_car"] },
  { title: "Life", kinds: ["life", "other"] },
];

export default async function InsurancePage() {
  const v = await requireSection("insurance");
  const [policies, taxes, people] = await Promise.all([data.getPolicies(v), data.getTaxRecords(v), data.getPeople(v)]);
  await data.logView(v, "insurance");
  const parent = v.role === "parent";
  const canEditIns = canWrite(v, "insurance") && !parent;
  const canEditTax = canWrite(v, "taxes") && !parent;
  const agents = people.filter((p) => /agent|broker|cpa|accountant/i.test(p.relationship ?? "")).map((p) => ({ id: p.id, name: p.full_name }));
  const renewingSoon = policies.filter((p) => { const d = daysUntil(p.renews_on); return d !== null && d >= 0 && d <= 60; });
  const annual = policies.reduce((s, p) => s + (p.premium ?? 0), 0);
  const years = [...new Set(taxes.map((t) => t.tax_year))].sort((a, b) => b - a);

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Sections 9 & 10"} title={parent ? "Your insurance" : "Insurance & taxes"}
        intro={parent ? "Which company covers what, and when each one renews." : "Every policy with its renewal date and premium, then tax returns by year, property tax, and the disabled-veteran exemption."}
        actions={canEditIns ? <PolicyEditor agents={agents} /> : undefined} />

      {renewingSoon.length > 0 && !parent && (
        <div className="mb-6 rounded-2xl border border-brass-deep/40 bg-brass-tint px-5 py-4">
          <strong className="text-brass-deep">Renewing in the next 60 days:</strong>
          <ul className="mt-1 list-disc pl-5">{renewingSoon.map((p) => <li key={p.id}>{POLICY_KIND[p.kind]} · {p.carrier} · {fmtDate(p.renews_on)} ({daysUntil(p.renews_on)} days){p.premium !== null && ` · ${fmtMoney(p.premium)}`}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {GROUPS.map((g) => {
          const items = policies.filter((p) => g.kinds.includes(p.kind));
          if (items.length === 0) return null;
          return (
            <SectionCard key={g.title} title={g.title}>
              <ul className="divide-y divide-rule-soft">
                {items.map((p) => {
                  const d = daysUntil(p.renews_on);
                  return (
                    <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className={`font-semibold ${parent ? "text-[1.2rem]" : ""}`}>{POLICY_KIND[p.kind]} <span className="font-normal text-ink-soft">· {p.carrier}</span></div>
                        <div className="text-[0.95rem] text-ink-soft">
                          {subjectName(p.insured)}{p.policy_last4 && !parent && <> · policy ····<span className="font-mono">{p.policy_last4}</span></>}
                          {p.premium !== null && ` · ${fmtMoney(p.premium)}/yr`}
                          {p.renews_on && <> · renews {fmtDate(p.renews_on, { year: "numeric" })}{d !== null && d >= 0 && d <= 60 && <span className="ml-1 font-semibold text-brass-deep">(in {d} days)</span>}</>}
                        </div>
                        {p.notes && <div className="text-[0.9rem] text-ink-soft">{p.notes}</div>}
                        {!parent && <SourceTag source={p.source} />}
                      </div>
                      {canEditIns && <PolicyEditor policy={p} agents={agents} />}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          );
        })}
        {policies.length === 0 && <Empty>No policies recorded yet.</Empty>}
        {!parent && policies.length > 0 && <p className="text-[0.9rem] text-ink-soft">Premiums on file add up to about {fmtMoney(annual)} a year. Renewal dates also appear on the Calendar.</p>}

        {!parent && canRead(v, "taxes") && (
          <SectionCard title="Taxes">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink-soft">Returns by year, property tax, and exemptions. Preparer: {taxes.find((t) => t.preparer)?.preparer ?? "—"}.</p>
              {canEditTax && <TaxEditor />}
            </div>
            {taxes.length === 0 ? <Empty>No tax records yet.</Empty> : years.map((y) => (
              <div key={y}>
                <h3 className="mb-1 font-sans text-[1rem] font-bold text-brass-deep">{y}</h3>
                <ul className="divide-y divide-rule-soft rounded-xl border border-rule-soft">
                  {taxes.filter((t) => t.tax_year === y).map((t) => (
                    <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5">
                      <div>
                        <span className="font-semibold">{TAX_KIND[t.kind]}</span> <span className="text-ink-soft">· {t.status}{t.filed_on && ` · filed ${fmtDate(t.filed_on, { year: "numeric" })}`}{t.preparer && ` · ${t.preparer}`}</span>
                        {t.notes && <div className="text-[0.9rem] text-ink-soft">{t.notes}</div>}
                      </div>
                      {canEditTax && <TaxEditor record={t} />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SectionCard>
        )}
      </div>
    </>
  );
}
