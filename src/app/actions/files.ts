"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { copyDriveFilesToStorage } from "@/lib/drive/service";
import { BUCKET, MAX_UPLOAD_BYTES, UPLOAD_MIME, mediaKindFor, objectKey } from "@/lib/files/storage";
import type { Section } from "@/lib/types";
import { DESTINATIONS, untag } from "@/lib/files/destinations";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const Form = z.object({
  section: z.string().min(1),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  vault: z.string().optional(),
  taken_on: z.string().optional().or(z.literal("")),
  back: z.string().optional().or(z.literal("")),
});

/** Upload a document straight into the binder: a row in imported_files plus the bytes in private storage. */
export async function uploadFile(_p: Result<string> | null, form: FormData): Promise<Result<string>> {
  try {
    const v = await getViewer();
    const parsed = Form.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "file")));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const section = d.section as Section;
    if (!canWrite(v, section)) return { ok: false, error: "You can't add files to this section." };
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file first." };
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is over 25 MB. Photograph pages one at a time, or shrink the PDF." };
    const mime = file.type || "application/octet-stream";
    if (!UPLOAD_MIME.includes(mime)) return { ok: false, error: `Files of type ${mime} are not accepted. Use a photo, PDF, Word file or audio/video.` };
    if (v.demo) return { ok: false, error: "Uploads are off in the demo." };

    const supabase = await createClient();
    const sensitivity = d.vault === "on" ? "admin_only" : "normal";
    const { data: id, error } = await supabase.rpc("file_upload_row", {
      p_name: file.name, p_mime: mime, p_size: file.size, p_target: section, p_media: mediaKindFor(mime),
      p_sensitivity: sensitivity, p_note: d.note || null, p_taken_at: d.taken_on ? `${d.taken_on}T12:00:00Z` : null,
    });
    if (error || !id) return { ok: false, error: error?.message.includes("file_upload_row") ? "The database is missing migration 23 (file storage)." : `Could not record the file: ${error?.message}` };
    // Admin-only files live under "admin" so only super admins can read the bytes; the trigger set the row's section the same way.
    const key = objectKey(sensitivity === "admin_only" ? "admin" : section, String(id), file.name);
    const up = await supabase.storage.from(BUCKET).upload(key, Buffer.from(await file.arrayBuffer()), { contentType: mime, upsert: false });
    if (up.error) {
      await supabase.from("imported_files").delete().eq("id", id);
      return { ok: false, error: `Could not store the file: ${up.error.message}` };
    }
    await supabase.from("imported_files").update({ storage_path: key }).eq("id", id);
    for (const p of ["/sources/widow-book", "/burial", "/funeral", "/wishes", "/starlar", "/admin/import", "/health/rich", "/health/diana"]) revalidatePath(p);
    if (d.back) revalidatePath(d.back);
    return { ok: true, data: String(id) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Super admin: copy the next batch of approved Drive files into private storage. */
export async function copyFilesToStorage(): Promise<Result<{ copied: number; remaining: number; errors: string[] }>> {
  try {
    const v = await getViewer();
    if (v.role !== "super_admin") return { ok: false, error: "Super admins only." };
    // Netlify functions have a short time limit, so the live site copies 25 at a time; a local run can take more.
    const data = await copyDriveFilesToStorage(v, process.env.NODE_ENV === "development" ? 100 : 25);
    revalidatePath("/admin/import");
    return { ok: true, data };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Send a reviewed file to a page: sets its section and tag, approves it, and for Mom's Books, Photos, iMemories and Journals also adds the shelf entry that page lists. */
export async function sendFileTo(id: string, destKey: string): Promise<Result<string>> {
  try {
    const v = await getViewer();
    if (v.role !== "super_admin") return { ok: false, error: "Super admins only." };
    const dest = DESTINATIONS.find((d) => d.key === destKey);
    if (!dest) return { ok: false, error: "Pick where it should go." };
    if (v.demo) return { ok: false, error: "Not in the demo." };
    const supabase = await createClient();
    const { data: f } = await supabase.from("imported_files").select("id, name, target_note, web_view_link, sensitivity").eq("id", id).maybeSingle();
    if (!f) return { ok: false, error: "File not found." };
    const rest = untag(f.target_note);
    const note = [dest.tag, rest].filter(Boolean).join(" ") || null;
    const { error } = await supabase.from("imported_files").update({ target_section: dest.section, target_note: note, review_status: "approved", manifest_rule: `sent:${dest.key}`, ...(dest.key === "vital" ? { sensitivity: "admin_only" } : {}) }).eq("id", id);
    if (error) return { ok: false, error: `Could not move the file: ${error.message}` };
    const title = f.name.replace(/\.[a-z0-9]+$/i, "");
    const link = f.web_view_link && /^https:\/\//.test(f.web_view_link) ? f.web_view_link : null;
    if (dest.collection) {
      const { data: dup } = await supabase.from("collections").select("id").eq("title", title).eq("category", dest.collection).maybeSingle();
      if (!dup) {
        const { error: e2 } = await supabase.from("collections").insert({ category: dest.collection, title, owner: "both", url: link, note: rest || "Filed from the Drive import.", added_by_name: v.name });
        if (e2) return { ok: false, error: `Filed, but could not add it to the shelf: ${e2.message}` };
      }
    }
    if (dest.journal) {
      if (!link) return { ok: false, error: "Filed, but a journal entry needs a link and this file has none." };
      const { data: dup } = await supabase.from("journals").select("id").eq("url", link).maybeSingle();
      if (!dup) {
        const { error: e3 } = await supabase.from("journals").insert({ title, url: link, author: dest.journal, kind: /pdf|docx?$/i.test(f.name) ? "scan" : "other", note: rest || "Filed from the Drive import.", added_by_name: v.name });
        if (e3) return { ok: false, error: `Filed, but could not add the journal entry: ${e3.message}` };
      }
    }
    for (const p of ["/admin/import", "/sources/widow-book", "/burial", "/funeral", "/starlar", "/properties", "/vehicles", "/health/rich", "/health/diana", "/journals", "/collections/books", "/collections/photos", "/collections/imemories", "/history"]) revalidatePath(p);
    return { ok: true, data: dest.label };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
