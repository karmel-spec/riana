import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { ensureDemoMedia } from "@/lib/media/service";
import { PageHeader } from "@/components/ui";
import { TributeBuilder } from "../tribute-client";

export default async function TributeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireSuperAdmin();
  const { id } = await params;
  await ensureDemoMedia(v);
  const [pages, blocks, media, lists] = await Promise.all([data.getTributePages(v), data.getTributeBlocks(v, id), data.getMediaItems(v), data.getNotificationLists(v)]);
  const page = pages.find((p) => p.id === id);
  if (!page) notFound();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <PageHeader eyebrow="Tribute page" title={page.title} intro={page.subtitle ?? undefined}
        actions={<Link href="/history/tribute" className="btn-secondary">All pages</Link>} />
      <TributeBuilder page={page} blocks={blocks} media={media.filter((m) => m.review_status === "approved").map((m) => ({ id: m.id, kind: m.kind, title: m.title ?? "Untitled", file: m.imported_file_id }))}
        lists={lists.map((l) => ({ id: l.id, name: l.name, count: l.members.length }))} origin={origin} />
    </>
  );
}
