import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import { UploadFile } from "@/components/upload-file";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { WishGroups, WishFiles, sideOf, fileSide } from "../wishes/wish-groups";

export const metadata = { title: "Funeral" };

export default async function FuneralPage() {
  const v = await requireSection("final_wishes");
  const [wishes, people, files, legal, widow] = await Promise.all([data.getFinalWishes(v), data.getPeople(v), data.getFinalWishFiles(v), canRead(v, "legal") ? data.getLegalDocuments(v) : Promise.resolve([]), data.getWidowBook(v)]);
  const ctx = { files: [...files, ...widow], legal };
  await data.logView(v, "final_wishes", "funeral");
  const parent = v.brief;
  const mine = wishes.filter((w) => sideOf(w) === "funeral");
  const docs = files.filter((f) => fileSide(f) === "funeral");
  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 12 · Funeral"} title={parent ? "The funeral" : "Funeral"}
        intro={parent ? "What you would like at the service: the church, the music, who speaks." : "The service itself: the funeral home, the church, who speaks, the music, the obituary, and what to read. Everything about the grave is on the Burial page."}
        actions={<Link href="/wishes" className="btn-secondary">All final wishes →</Link>} />
      <WishGroups wishes={mine} people={people} parent={parent} ctx={ctx} blurbs={{ both: "The funeral home, the church and the program, shared.", rich: "What Rich would like at his service.", diana: "What Diana would like at her service." }} />
      <WishFiles files={docs} title="Funeral documents" parent={parent} upload={canWrite(v, "final_wishes") && !parent ? <UploadFile section="final_wishes" defaultNote="Final wishes → Funeral" label="Upload a document" back="/funeral" /> : undefined} />
    </>
  );
}
