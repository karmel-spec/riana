import type { Viewer } from "@/lib/session";
import { canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, SourceTag } from "@/components/ui";
import { House, Tag, Phone, Key } from "@/components/icons";
import { HouseholdEditor, HouseholdRowActions } from "./household-client";

const GROUPS = [
  { kind: "vehicle", title: "Vehicles", icon: House, blurb: "Titles, keys, and who gets them." },
  { kind: "heirloom", title: "Heirlooms & keepsakes", icon: Tag, blurb: "The things with a story, and who they're meant for." },
  { kind: "service", title: "People who come to the house", icon: Phone, blurb: "Yard, pool, cleaning, deliveries, and who has a key." },
  { kind: "other", title: "Around the house", icon: Key, blurb: "The safe, spare keys, codes (by vault name), shut-offs." },
] as const;

/** The household list (keepsakes, people who come to the house, where things are). Lives on the Home page. */
export async function HouseholdSection({ viewer: v }: { viewer: Viewer }) {
  const items = await data.getHouseholdItems(v);
  const parent = v.brief;
  const canEdit = canWrite(v, "household");

  return (
    <section id="household" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {!parent && <div className="eyebrow mb-1">Section 14</div>}
          <h2 className="text-[1.7rem] font-semibold leading-tight">{parent ? "Around the house" : "Household"}</h2>
          <p className="mt-1 max-w-[62ch] text-ink-soft">{parent ? "The keepsakes, and the people who help around the house. Add anything the kids should know." : "Everything a sibling would need to step in for a week: keepsakes and who they're for, the people who come to the house, and where things are."}</p>
        </div>
        {canEdit && <HouseholdEditor parent={parent} />}
      </div>
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
    </section>
  );
}
