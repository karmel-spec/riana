import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoImportedFiles } from "@/lib/drive/service";
import { BUCKET } from "@/lib/files/storage";

/**
 * Opens a binder file for the signed-in viewer: a short-lived link into private storage when the file has been
 * copied there, otherwise the Drive link. Row-level security on imported_files and on storage decides who may.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getViewer();
  if (v.demo) {
    const f = demoImportedFiles().find((x) => x.id === id);
    return f?.web_view_link ? NextResponse.redirect(f.web_view_link) : new NextResponse("Not found", { status: 404 });
  }
  const supabase = await createClient();
  const { data: f } = await supabase.from("imported_files").select("id, storage_path, web_view_link, review_status").eq("id", id).maybeSingle();
  if (!f) return new NextResponse("Not found", { status: 404 });
  if (f.storage_path && !f.storage_path.startsWith("drive-only")) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 120);
    if (!error && data?.signedUrl) return NextResponse.redirect(data.signedUrl);
  }
  if (f.web_view_link) return NextResponse.redirect(f.web_view_link);
  return new NextResponse("This file has no copy yet.", { status: 404 });
}
