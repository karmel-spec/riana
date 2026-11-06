import { NextResponse, type NextRequest } from "next/server";
import { getViewer, canRead } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { driveClient } from "@/lib/drive/client";
import { fakeDriveClient } from "@/lib/drive/fake";
import { listImportedFiles } from "@/lib/drive/service";
import * as data from "@/lib/data";

/**
 * Streams an imported file to a signed-in viewer who may see its section.
 * Supports HTTP range requests (video/audio seeking) by forwarding the Range
 * header to Drive. Every request is written to the audit log as 'view'
 * (inline) or 'download' (?download=1). Bytes are never stored here.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getViewer();
  const files = await listImportedFiles(v);
  let file = files.find((f) => f.id === id);

  if (!file && !v.demo) {
    // Non-admins can't call listImportedFiles; RLS decides whether they may see this row.
    const supabase = await createClient();
    const { data: row } = await supabase.from("imported_files").select("*").eq("id", id).maybeSingle();
    file = row ?? undefined;
  }
  if (!file) return new NextResponse("Not found", { status: 404 });
  const section = file.review_status === "approved" && file.sensitivity === "normal" ? file.target_section : "admin";
  if (!canRead(v, section)) return new NextResponse("Not found", { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  await logFileAccess(v, download ? "download" : "view", file.target_section, file.id, file.name);

  const drive = driveClient() ?? fakeDriveClient();
  const range = req.headers.get("range") ?? undefined;
  const upstream = await drive.stream(file.drive_file_id, range);
  if (!upstream.ok && upstream.status !== 206) return new NextResponse("Unavailable", { status: 502 });

  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const val = upstream.headers.get(h); if (val) headers.set(h, val);
  }
  if (!headers.has("content-type")) headers.set("content-type", file.mime_type ?? "application/octet-stream");
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, no-store");
  headers.set("content-disposition", `${download ? "attachment" : "inline"}; filename="${file.name.replace(/"/g, "")}"`);
  headers.set("x-robots-tag", "noindex");
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

async function logFileAccess(v: Awaited<ReturnType<typeof getViewer>>, action: "view" | "download", section: string, id: string, name: string) {
  if (v.demo) {
    data.demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: v.name, action, section: section as never, entity: "imported_files", via: "app", summary: `${action === "download" ? "Downloaded" : "Viewed"} ${name}` });
    return;
  }
  const supabase = await createClient();
  await supabase.rpc("log_view", { p_section: section, p_entity: `imported_files:${action}:${name}`, p_entity_id: id });
}
