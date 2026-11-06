import Link from "next/link";
import { requireSection, canWrite, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtMoney, subjectName } from "@/lib/format";
import { ImprovementButton, VehicleEditor } from "./vehicles-client";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const v = await requireSection("properties");
  const [vehicles, improvements, policies, versions, imported] = await Promise.all([
    data.getVehicles(v), data.getVehicleImprovements(v), data.getPolicies(v), data.getPlanVersions(v),
    v.role === "super_admin" ? listImportedFiles(v) : Promise.resolve([]),
  ]);
  const current = versions.find((x) => x.status === "current") ?? versions[0];
  const provisions = current ? await data.getProvisions(v, current.id) : [];
  await data.logView(v, "properties", "vehicles");
  const parent = v.brief;
  const canEdit = canWrite(v, "properties") && !parent;
  const policyOpts = policies.map((p) => ({ id: p.id, name: `${p.kind.replace("_", " ")} · ${p.carrier}` }));
  const provisionOpts = provisions.map((p) => ({ id: p.id, name: p.subject }));
  const fileOpts = imported.filter((f) => f.target_section === "properties").map((f) => ({ id: f.id, name: f.name }));
  const total = vehicles.reduce((s, x) => s + (x.estimated_value ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 6 · Vehicles"} title={parent ? "Your cars" : "Vehicles"}
        intro={parent ? "The cars, what they're worth, and where the titles are." : "Each vehicle with its estimated value (and when and how it was valued), the improvements put into it, the insurance that covers it, where the title is, and what the estate plan says happens to it."}
        actions={<>{canEdit && <VehicleEditor policies={policyOpts} provisions={provisionOpts} files={fileOpts} />}</>} />

      {!parent && vehicles.length > 0 && <p className="mb-5 text-ink-soft">Estimated value on file: <strong className="text-ink">{fmtMoney(total)}</strong> across {vehicles.length} vehicles.</p>}

      {vehicles.length === 0 ? <Empty>No vehicles recorded.</Empty> : (
        <ul className="flex flex-col gap-5">
          {vehicles.map((x) => {
            const imps = improvements.filter((i) => i.vehicle_id === x.id);
            const spent = imps.reduce((s, i) => s + (i.cost ?? 0), 0);
            const pol = policies.find((p) => p.id === x.insurance_policy_id) ?? null;
            const prov = provisions.find((p) => p.id === x.estate_provision_id) ?? null;
            const specs = imported.find((f) => f.id === x.specs_file_id) ?? null;
            const title = [x.year, x.make, x.model].filter(Boolean).join(" ");
            return (
              <li key={x.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className={`font-semibold leading-tight ${parent ? "text-[1.6rem]" : "text-[1.4rem]"}`}>{x.nickname ? <>{x.nickname} <span className="font-normal text-ink-soft">· {title}</span></> : title}</h2>
                    <div className="text-ink-soft">{x.engine && `${x.engine} · `}{subjectName(x.owner)}{x.vin_last4 && ` · VIN ····${x.vin_last4}`}</div>
                  </div>
                  {canEdit && <VehicleEditor vehicle={x} policies={policyOpts} provisions={provisionOpts} files={fileOpts} />}
                </div>

                <div className={`mt-4 grid gap-3 ${parent ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
                  <div className="rounded-xl bg-evergreen-tint p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Estimated value</div><div className="font-serif text-[1.6rem] font-semibold text-evergreen">{x.estimated_value !== null ? fmtMoney(x.estimated_value) : "—"}</div><div className="text-[0.8rem] text-ink-soft">{x.valuation_source ?? ""}{x.valuation_on && ` · ${fmtDate(x.valuation_on, { year: "numeric" })}`}</div></div>
                  <div className="rounded-xl bg-parchment p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Title</div><div className="font-semibold">{x.title_location ?? <span className="text-ember">Location unknown</span>}</div></div>
                  {!parent && canRead(v, "insurance") && <div className="rounded-xl bg-parchment p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Insurance</div>{pol ? <div className="font-semibold">{pol.carrier}<div className="text-[0.8rem] font-normal text-ink-soft">{pol.kind.replace("_", " ")}{pol.policy_last4 && ` ····${pol.policy_last4}`}{pol.renews_on && ` · renews ${fmtDate(pol.renews_on)}`}</div></div> : <div className="text-ember">No policy linked</div>}<Link href="/insurance" className="text-[0.85rem]">Insurance</Link></div>}
                  {!parent && canRead(v, "legal") && <div className="rounded-xl bg-brass-tint/60 p-3"><div className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Estate plan</div>{prov ? <div className="font-semibold">{prov.subject}<div className="text-[0.8rem] font-normal text-ink-soft">{prov.planned}</div></div> : <div className="text-ember">Not in the plan yet</div>}<Link href="/estate" className="text-[0.85rem]">Estate plan</Link></div>}
                </div>

                {!parent && (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-sans text-[1rem] font-bold">Improvements{imps.length > 0 && <span className="font-normal text-ink-soft"> · {imps.length} · {fmtMoney(spent)} put in</span>}</h3>
                      {canEdit && <ImprovementButton vehicleId={x.id} />}
                    </div>
                    {imps.length === 0 ? <p className="text-[0.95rem] text-ink-soft">None recorded.{x.nickname === "Vickie" && " The '34 Vickie Improvements' document will populate this list when imported and approved."}</p> : (
                      <table className="mt-2 w-full text-[0.9rem]">
                        <thead className="text-left text-[0.7rem] uppercase tracking-wide text-ink-soft"><tr><th className="py-1 pr-3">When</th><th className="py-1 pr-3">What</th><th className="py-1 pr-3">By</th><th className="py-1 text-right">Cost</th></tr></thead>
                        <tbody>{imps.map((i) => <tr key={i.id} className="border-t border-rule-soft"><td className="whitespace-nowrap py-1.5 pr-3 text-ink-soft">{i.done_on ? fmtDate(i.done_on, { year: "numeric" }) : i.done_on_approx ?? "—"}</td><td className="py-1.5 pr-3">{i.description}</td><td className="py-1.5 pr-3 text-ink-soft">{i.vendor ?? "—"}</td><td className="whitespace-nowrap py-1.5 text-right">{i.cost !== null ? fmtMoney(i.cost) : "—"}</td></tr>)}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {specs && <p className="mt-3 text-[0.9rem]">Specs: <a href={`/api/files/${specs.id}`} target="_blank" rel="noreferrer">{specs.name}</a></p>}
                {x.notes && <p className="mt-2 text-[0.95rem] text-ink-soft">{x.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
