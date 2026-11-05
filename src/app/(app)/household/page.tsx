import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader, SourceTag } from "@/components/ui";
import { Paw, House, Tag, Phone, Key } from "@/components/icons";
import { HouseholdEditor, HouseholdRowActions } from "./household-client";

export const metadata = { title: "Pets & Household" };

const GROUPS = [
  { kind: "pet", title: "Pets", icon: Paw, blurb: "Who they are, how to care for them, and who takes them." },
  { kind: "vehicle", title: "Vehicles", icon: House, blurb: "Titles, keys, and who gets them." },
  { kind: "heirloom", title: "Heirlooms & keepsakes", icon: Tag, blurb: "The things with a story, and who they're meant for." },
  { kind: "service", title: "People who come to the house", icon: Phone, blurb: "Yard, pool, cleaning, deliveries, and who has a key." },
  { kind: "other", title: "Around the house", icon: Key, blurb: "The safe, spare keys, codes (by vault name), shut-offs." },
] as const;

export default async function HouseholdPage() {
  const v = await requireSection("household");
  const items = await data.getHouseholdItems(v);
  const parent = v.role === "parent";
  const canEdit = canWrite(v, "household");

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 14"} title={parent ? "Pets & around the house" : "Pets & household"}
        intro={parent ? "The dog, the cars, the keepsakes, and the people who help around the house. Add anything the kids should know." : "Everything a sibling would need to step in for a week: pet care, vehicles, keepsakes and who they're for, the people who come to the house, and where things are."}
        actions={canEdit ? <HouseholdEditor parent={parent} /> : undefined} />

      {items.length === 0 ? <Empty>Nothing recorded yet.</Empty> : (
        <div className="flex flex-col gap-6">
          {GROUPS.map((g) => {
            const list = items.filter((i) => i.kind === g.kind);
            if (list.length === 0) return null;
            const Icon = g.icon;
            return (
              <section key={g.kind} className="card">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><Icon size={22} /></div>
                  <div>
                    <h2 className="text-[1.35rem] font-semibold leading-tight">{g.title}</h2>
                    {!parent && <div className="text-[0.9rem] text-ink-soft">{g.blurb}</div>}
                  </div>
                </div>
                <ul className="divide-y divide-rule-soft">
                  {list.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className={`font-semibold ${parent ? "text-[1.25rem]" : "text-[1.05rem]"}`}>{i.name}</div>
                        {i.details && <p className={`whitespace-pre-line ${parent ? "" : "text-[0.95rem]"} text-ink-soft`}>{i.details}</p>}
                        {!parent && <SourceTag source={i.source} />}
                      </div>
                      {canEdit && <HouseholdRowActions item={i} parent={parent} />}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
