import { NextResponse, type NextRequest } from "next/server";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import { driveClient } from "@/lib/drive/client";
import { fakeDriveClient } from "@/lib/drive/fake";
import { demoImportedFiles } from "@/lib/drive/service";

/**
 * Streams a media file for a PUBLISHED tribute page to anyone holding its
 * share token. Only files that appear on that page are allowed; Range
 * requests are forwarded so video and audio seek without a full download.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return new NextResponse("Not found", { status: 404 });

  let driveFileId: string | null = null; let mime: string | null = null; let name = "file";
  if (isDemo()) {
    const s = demoStore();
    const page = s.tributes.find((p) => p.status === "published" && p.share_token === token);
    const onPage = page && s.tributeBlocks.filter((b) => b.page_id === page.id).flatMap((b) => [b.media_item_id, ...b.media_item_ids]);
    const m = onPage && s.media.find((x) => onPage.includes(x.id) && (x.imported_file_id === id || x.poster_file_id === id));
    const row = m ? demoImportedFiles().find((x) => x.id === id) : undefined;
    if (!row) return new NextResponse("Not found", { status: 404 });
    driveFileId = row.drive_file_id; mime = row.mime_type; name = row.name;
  } else {
    const supabase = await createClient();
    const { data: allowed } = await supabase.rpc("tribute_file_allowed", { p_token: token, p_file_id: id });
    if (!allowed) return new NextResponse("Not found", { status: 404 });
    // The row itself is read with the service account's eyes: use the drive id stored on the pointer.
    const { data: row } = await supabase.rpc("tribute_file_pointer", { p_token: token, p_file_id: id }).maybeSingle<{ drive_file_id: string; mime_type: string | null; name: string }>();
    if (!row) return new NextResponse("Not found", { status: 404 });
    driveFileId = row.drive_file_id; mime = row.mime_type; name = row.name;
  }

  const drive = driveClient() ?? fakeDriveClient();
  const upstream = await drive.stream(driveFileId!, req.headers.get("range") ?? undefined);
  if (!upstream.ok && upstream.status !== 206) return new NextResponse("Unavailable", { status: 502 });
  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) { const v = upstream.headers.get(h); if (v) headers.set(h, v); }
  if (!headers.has("content-type")) headers.set("content-type", mime ?? "application/octet-stream");
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=3600");
  headers.set("content-disposition", `inline; filename="${name.replace(/"/g, "")}"`);
  headers.set("x-robots-tag", "noindex");
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
