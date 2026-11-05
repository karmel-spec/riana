import Link from "next/link";
import { requireSection, canWrite, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SourceTag } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import { House, Mail, Phone } from "@/components/icons";
import { PropertyEditor } from "./property-client";

export const metadata = { title: "Properties" };

const KIND: Record<string, string> = { residence: "Home", rental: "Rental", land: "Land", other: "Other" };

export default async function PropertiesPage() {
  const v = await requireSection("properties");
  const [properties, mortgages, bills, people, policies] = await Promise.all([
    data.getProperties(v), data.getLoans(v, "owed_by_estate"), data.getBills(v), data.getPeople(v), data.getPolicies(v),
  ]);
  await data.logView(v, "properties");
  const parent = v.role === "parent";
  const canEdit = canWrite(v, "properties") && !parent;
  const person = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const managers = people.filter((p) => /manager|property/i.test(p.relationship ?? ""));

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 6"} title={parent ? "Your home and rentals" : "Properties"}
        intro={parent ? "The house and the Tumwater rentals, and who looks after them." : "The Lake Havasu home and the StarLar rentals: ownership, mortgages, HOA, property manager, and what happens to each one later."}
        actions={<><Link href="/properties/vehicles" className="btn-secondary">Vehicles</Link>{canEdit && <PropertyEditor managers={managers.map((p) => ({ id: p.id, name: p.full_name }))} />}</>} />

      {properties.length === 0 ? <Empty>No properties recorded yet.</Empty> : (
        <ul className="flex flex-col gap-5">
          {properties.map((p) => {
            const mortgage = mortgages.filter((m) => m.property_id === p.id);
            const related = bills.filter((b) => b.property_id === p.id);
            const manager = person(p.manager_person_id);
            const cover = policies.filter((pol) => (p.kind === "rental" && pol.kind === "landlord") || (p.kind === "residence" && pol.kind === "home"));
            return (
              <li key={p.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><House size={26} /></div>
                    <div>
                      <h2 className={`font-semibold leading-tight ${parent ? "text-[1.6rem]" : "text-[1.4rem]"}`}>{p.name}</h2>
                      <div className="text-ink-soft">{KIND[p.kind]}{p.address && ` · ${p.address}`}</div>
                      {!parent && <div className="mt-1 flex flex-wrap gap-2 text-[0.85rem]">{p.held_by && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">Held by {p.held_by}</span>}{p.hoa_name && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">HOA: {p.hoa_name}</span>}<SourceTag source={p.source} /></div>}
                    </div>
                  </div>
                  {canEdit && <PropertyEditor property={p} managers={managers.map((m) => ({ id: m.id, name: m.full_name }))} />}
                </div>

                <div className={`mt-4 grid gap-4 ${parent ? "" : "md:grid-cols-2"}`}>
                  {!parent && (
                    <div className="rounded-xl bg-brass-tint/60 p-4">
                      <div className="eyebrow">What happens to it later</div>
                      <p className="mt-1">{p.succession_plan ?? <span className="text-ember">Not decided yet — add to Urgent Questions.</span>}</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-rule-soft p-4">
                    <div className="eyebrow">{parent ? "Who looks after it" : "Property manager"}</div>
                    {manager ? (
                      <div className="mt-1">
                        <div className="font-semibold">{manager.full_name}</div>
                        <div className="flex flex-wrap gap-x-4 text-[0.95rem]">
                          {manager.phone && <a href={`tel:${manager.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 text-evergreen"><Phone size={16} /> {manager.phone}</a>}
                          {manager.email && !parent && <a href={`mailto:${manager.email}`} className="flex items-center gap-1 text-evergreen"><Mail size={16} /> {manager.email}</a>}
                        </div>
                      </div>
                    ) : <p className="mt-1 text-ink-soft">{p.kind === "rental" ? "None assigned." : "You do."}</p>}
                  </div>
                  {!parent && canRead(v, "accounts") && (
                    <div className="rounded-xl border border-rule-soft p-4">
                      <div className="eyebrow">Mortgage</div>
                      {mortgage.length === 0 ? <p className="mt-1 text-ink-soft">None — owned outright.</p> : mortgage.map((m) => (
                        <div key={m.id} className="mt-1">
                          <div className="font-semibold">{m.counterparty} · {fmtMoney(m.principal)}{m.rate_pct !== null && ` at ${m.rate_pct}%`}</div>
                          {m.balance_note && <div className="text-[0.95rem] text-ink-soft">{m.balance_note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!parent && canRead(v, "insurance") && (
                    <div className="rounded-xl border border-rule-soft p-4">
                      <div className="eyebrow">Insurance</div>
                      {cover.length === 0 ? <p className="mt-1 text-ember">No policy found for this property.</p> : cover.map((c) => (
                        <div key={c.id} className="mt-1"><span className="font-semibold">{c.carrier}</span> <span className="text-ink-soft">· {c.kind === "landlord" ? "Landlord policy" : "Homeowners"}{c.policy_last4 && ` ····${c.policy_last4}`}</span></div>
                      ))}
                    </div>
                  )}
                  {!parent && canRead(v, "bills") && related.length > 0 && (
                    <div className="rounded-xl border border-rule-soft p-4">
                      <div className="eyebrow">Bills tied to this property</div>
                      <ul className="mt-1">{related.map((b) => <li key={b.id} className="flex justify-between"><span>{b.payee}</span><span className="text-ink-soft">{fmtMoney(b.amount)}</span></li>)}</ul>
                    </div>
                  )}
                </div>
                {p.notes && <p className="mt-3 text-[0.95rem] text-ink-soft">{p.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {!parent && (
        <section className="card mt-6">
          <h2 className="text-[1.2rem] font-semibold">The StarLar plan</h2>
          <p className="mt-1 text-ink-soft">The rentals are intended to pass 50/50 to two of the children through transfer-on-death deeds, outside the will’s six-way split. The deeds are drafted but unsigned and unrecorded; their status lives on the <a href="/legal">Legal board</a>. Documents (deeds, easement amendment, operating agreement) attach to each property in phase 2.</p>
        </section>
      )}
    </>
  );
}
