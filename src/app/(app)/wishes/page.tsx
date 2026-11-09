import { requireSection, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { WishGroups } from "./wish-groups";

export const metadata = { title: "Final Wishes" };

export default async function WishesPage() {
  const v = await requireSection("final_wishes");
  const [wishes, people, files, legal, widow] = await Promise.all([data.getFinalWishes(v), data.getPeople(v), data.getFinalWishFiles(v), canRead(v, "legal") ? data.getLegalDocuments(v) : Promise.resolve([]), data.getWidowBook(v)]);
  const ctx = { files: [...files, ...widow], legal };
  await data.logView(v, "final_wishes");
  const parent = v.brief;
  const shown = wishes;  // Brief view is shared: both of your wishes, side by side

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 12"} title={parent ? "Our wishes" : "Final wishes & funeral requests"}
        intro={parent ? "What each of you would like, in your own words. Nothing here is final until you say so." : "Burial, service, music, speakers, obituary, organ donation, military honors and VA benefits, as Rich and Diana have expressed them."}
        actions={<><Link href="/funeral" className="btn-secondary">Funeral →</Link><Link href="/burial" className="btn-secondary">Burial →</Link></>} />
      <WishGroups wishes={shown} people={people} parent={parent} ctx={ctx} />
      <p className="mt-6 text-[0.9rem] text-ink-soft">Editing wishes and recording them by voice come in phase 2 and phase 6.</p>
    </>
  );
}
