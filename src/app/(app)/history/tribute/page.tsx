import Link from "next/link";
import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { NewTributeButton } from "./tribute-client";

export const metadata = { title: "Tribute pages" };

export default async function TributeListPage() {
  const v = await requireSuperAdmin();
  const pages = await data.getTributePages(v);
  return (
    <>
      <PageHeader eyebrow="Family history · admin" title="Tribute pages"
        intro="A memorial page built from photos, songs, stories, the obituary and the service details. Private while you work on it; publishing creates a link you can send to chosen notification lists."
        actions={<><Link href="/history" className="btn-secondary">Back</Link><NewTributeButton /></>} />
      {pages.length === 0 ? <Empty>No pages yet.</Empty> : (
        <ul className="flex flex-col gap-3">
          {pages.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[1.2rem] font-semibold">{p.title}</div>
                <div className="text-[0.9rem] text-ink-soft">/tribute/{p.slug}{p.published_at && ` · published ${fmtDate(p.published_at)}`}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`pill ${p.status === "published" ? "bg-evergreen-tint text-evergreen" : "bg-rule-soft text-ink-soft"}`}>{p.status}</span>
                <Link href={`/history/tribute/${p.id}`} className="btn-primary px-4">Open</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
