import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import { UploadFile } from "@/components/upload-file";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { WishGroups, WishFiles, sideOf, fileSide } from "../wishes/wish-groups";

export const metadata = { title: "Burial" };

export default async function BurialPage() {
  const v = await requireSection("final_wishes");
  const [wishes, people, files, legal, widow] = await Promise.all([data.getFinalWishes(v), data.getPeople(v), data.getFinalWishFiles(v), canRead(v, "legal") ? data.getLegalDocuments(v) : Promise.resolve([]), data.getWidowBook(v)]);
  const ctx = { files: [...files, ...widow], legal };
  await data.logView(v, "final_wishes", "burial");
  const parent = v.brief;
  const mine = wishes.filter((w) => sideOf(w) === "burial");
  const docs = files.filter((f) => fileSide(f) === "burial");
  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 12 · Burial"} title={parent ? "The burial" : "Burial"}
        intro={parent ? "Where you will rest, and what is already taken care of." : "The resting place, now in Lake Havasu since the Odd Fellows plots in Tumwater were sold: the cemetery and plots, the headstone, what was prepaid, military honors at the graveside and VA burial benefits. The service itself is on the Funeral page."}
        actions={<Link href="/wishes" className="btn-secondary">All final wishes →</Link>} />
      <WishGroups wishes={mine} people={people} parent={parent} ctx={ctx} blurbs={{ both: "The cemetery, the plots, the headstone and what was prepaid.", rich: "His resting place and military honors.", diana: "Her resting place." }} />
      <WishFiles files={docs} title="Burial documents" parent={parent} upload={canWrite(v, "final_wishes") && !parent ? <UploadFile section="final_wishes" defaultNote="Final wishes → Burial" label="Upload a document" back="/burial" /> : undefined} />
    </>
  );
}
