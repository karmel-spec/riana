import { requireSection, canWrite, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SourceTag } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import { House, Mail, Phone } from "@/components/icons";
import { PropertyEditor } from "./property-client";
import { HouseholdSection } from "../household/household-section";
import { AssetPhotos } from "@/components/asset-photos";

export const metadata = { title: "Home" };

const KIND: Record<string, string> = { residence: "Home", rental: "Rental", land: "Land", other: "Other" };
/** Zillow search for a street address (drops anything in parentheses). */
const zillow = (address: string) => `https://www.zillow.com/homes/${encodeURIComponent(address.replace(/\s*\([^)]*\)/g, "").trim())}_rb/`;

export default async function PropertiesPage() {
  const v = await requireSection("properties");
  const [properties, mortgages, bills, people, policies, photos] = await Promise.all([
    data.getProperties(v), data.getLoans(v, "owed_by_estate"), data.getBills(v), data.getPeople(v), data.getPolicies(v), data.getAssetPhotos(v, "property"),
  ]);
  await data.logView(v, "properties");
  const parent = v.brief;
  const canEdit = canWrite(v, "properties") && !parent;
  const person = (id: string | null) => people.find((p) => p.id === id) ?? null;
  const managers = people.filter((p) => /manager|property/i.test(p.relationship ?? ""));

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 6"} title={parent ? "Your home" : "Home"}
        intro={parent ? "The house on Aladdin Drive: who looks after it, and the rentals below." : "Everything about the house on Aladdin Drive in Lake Havasu City: ownership, mortgage, HOA, insurance, bills and who helps with it. The StarLar rentals follow below."}
        actions={<>{canEdit && <PropertyEditor managers={managers.map((p) => ({ id: p.id, name: p.full_name }))} />}</>} />

      {properties.length === 0 ? <Empty>No properties recorded yet.</Empty> : (
        <ul className="flex flex-col gap-5">
          {[...properties].sort((a, b) => Number(b.kind === "residence") - Number(a.kind === "residence")).map((p, n, all) => {
            const firstOther = p.kind !== "residence" && (n === 0 || all[n - 1].kind === "residence");
            const mortgage = mortgages.filter((m) => m.property_id === p.id);
            const related = bills.filter((b) => b.property_id === p.id);
            const manager = person(p.manager_person_id);
            const cover = policies.filter((pol) => (p.kind === "rental" && pol.kind === "landlord") || (p.kind === "residence" && pol.kind === "home"));
            return (
              <li key={p.id} className={firstOther ? "mt-4" : ""}>
                {firstOther && <h2 className="mb-3 text-[1.3rem] font-semibold">{parent ? "The rentals" : "Other properties: the StarLar rentals"}</h2>}
                <div className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><House size={26} /></div>
                    <div>
                      <h2 className={`font-semibold leading-tight ${parent ? "text-[1.6rem]" : "text-[1.4rem]"}`}>{p.name}</h2>
                      <div className="text-ink-soft">{KIND[p.kind]}{p.address && <> · <a href={zillow(p.address)} target="_blank" rel="noreferrer" className="text-evergreen" title="Open on Zillow">{p.address.replace(/\s*\([^)]*\)/g, "")} ↗</a></>}</div>
                      {!parent && <div className="mt-1 flex flex-wrap gap-2 text-[0.85rem]">{p.held_by && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">Held by {p.held_by}</span>}{p.hoa_name && <span className="rounded-md bg-parchment px-2 py-0.5 text-ink-soft">HOA: {p.hoa_name}</span>}<SourceTag source={p.source} /></div>}
                    </div>
                  </div>
                  {canEdit && <PropertyEditor property={p} managers={managers.map((m) => ({ id: m.id, name: m.full_name }))} />}
                </div>

                <div className={`mt-4 grid gap-4 ${parent ? "" : "md:grid-cols-2"}`}>
                  {!parent && (
                    <div className="rounded-xl bg-brass-tint/60 p-4">
                      <div className="eyebrow">What happens to it later</div>
                      <p className="mt-1">{p.succession_plan ?? <span className="text-ember">Not decided yet — add to Questions.</span>}</p>
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
                <AssetPhotos kind="property" assetId={p.id} photos={photos.filter((x) => x.asset_id === p.id)} canEdit={canEdit} parent={parent} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canRead(v, "household") && <HouseholdSection viewer={v} />}
    </>
  );
}
