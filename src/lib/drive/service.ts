import "server-only";
import { createClient } from "../supabase/server";
import type { Viewer } from "../session";
import { driveClient, serviceAccountEmail, oauthClientFromEnv } from "./client";
import { fakeDriveClient } from "./fake";
import { FOLDERS } from "./manifest";
import { enrichTakenAt, planSync, resolveFolders, type Existing, type FolderStatus, type KnownHashes, type SyncReport } from "./sync";
import { hashKey } from "./photo-dates";
import type { DriveClient } from "./types";
import type { Section } from "../types";
import { BUCKET, objectKey, resolveMime } from "../files/storage";

export type ImportedFileRow = {
  id: string; drive_file_id: string; drive_folder_key: string; name: string; mime_type: string | null; size_bytes: number | null;
  md5: string | null; drive_modified_at: string | null; web_view_link: string | null; target_section: Section; target_note: string | null;
  media_kind: string; sensitivity: "normal" | "admin_only" | "excluded"; manifest_rule: string | null; duplicate_of: string | null;
  review_status: "pending" | "approved" | "rejected"; first_imported_at: string; last_synced_at: string;
  taken_at?: string | null;
  storage_path?: string | null;
};
export type SyncRunRow = { id: string; mode: string; started_at: string; finished_at: string | null; ok: boolean | null; summary: Record<string, number>; error: string | null };

export type DriveSetup = { mode: "real" | "fake" | "none"; serviceAccount: string | null; canConnect: boolean };

/** Which Drive we talk to. Demo mode and "no key yet" both use the fake Drive, but say so. */
export function driveSetup(v: Viewer): DriveSetup {
  const email = serviceAccountEmail();
  const canConnect = !v.demo && !email && !!oauthClientFromEnv();
  if (!v.demo && email) return { mode: "real", serviceAccount: email, canConnect: false };
  return { mode: v.demo || !email ? "fake" : "none", serviceAccount: email, canConnect };
}

function clientFor(v: Viewer): DriveClient {
  const setup = driveSetup(v);
  return setup.mode === "real" ? driveClient()! : fakeDriveClient();
}

// --- Demo store for pointer rows ----------------------------------------------------
type DemoDrive = { files: ImportedFileRow[]; runs: SyncRunRow[]; folders: FolderStatus[] | null };
const g = globalThis as unknown as { __greeneDrive?: DemoDrive };
const demo = () => (g.__greeneDrive ??= { files: [], runs: [], folders: null });

export async function checkFolderAccess(v: Viewer): Promise<FolderStatus[]> {
  const { status } = await resolveFolders(clientFor(v));
  if (v.demo) { demo().folders = status; return status; }
  const supabase = await createClient();
  for (const s of status) {
    await supabase.from("drive_folders").upsert({
      key: s.key, drive_folder_id: s.driveFolderId ?? "", name: s.name,
      sensitivity: FOLDERS.find((f) => f.key === s.key)?.sensitivity ?? "normal",
      readable: s.readable, last_checked_at: new Date().toISOString(), last_error: s.error ?? null,
    }, { onConflict: "key" });
  }
  return status;
}

export async function lastFolderStatus(v: Viewer): Promise<FolderStatus[] | null> {
  if (v.demo) return demo().folders;
  const supabase = await createClient();
  const { data } = await supabase.from("drive_folders").select("key, name, drive_folder_id, readable, last_error");
  if (!data?.length) return null;
  return data.map((d) => ({ key: d.key, name: d.name, driveFolderId: d.drive_folder_id || null, readable: !!d.readable, error: d.last_error ?? undefined }));
}

async function existingMap(v: Viewer): Promise<{ existing: Existing; known: KnownHashes }> {
  const rows = await listImportedFiles(v);
  const existing: Existing = new Map(rows.map((r) => [r.drive_file_id, { md5: r.md5, modifiedTime: r.drive_modified_at }]));
  // Photos already imported, by content, so a Takeout re-export under a new name is flagged as a duplicate.
  const known: KnownHashes = new Map();
  for (const r of rows) if ((r.media_kind === "image" || r.media_kind === "video") && r.md5 && !r.duplicate_of && !known.has(hashKey(r.md5, r.size_bytes))) known.set(hashKey(r.md5, r.size_bytes), r.drive_file_id);
  return { existing, known };
}

export async function dryRun(v: Viewer): Promise<SyncReport> {
  const { existing, known } = await existingMap(v);
  const report = await planSync(clientFor(v), existing, known);
  await recordRun(v, "dry_run", report, null);
  return report;
}

export async function applySync(v: Viewer): Promise<SyncReport> {
  const drive = clientFor(v);
  const { existing, known } = await existingMap(v);
  const report = await planSync(drive, existing, known);
  await enrichTakenAt(drive, report);
  report.mode = "apply";
  let error: string | null = null;
  try {
    if (v.demo) {
      const s = demo();
      for (const e of report.entries) {
        if (e.action === "exclude") continue;
        const i = s.files.findIndex((f) => f.drive_file_id === e.driveFileId);
        const now = new Date().toISOString();
        if (i >= 0) { Object.assign(s.files[i], { name: e.name, md5: e.md5, drive_modified_at: e.modifiedTime, last_synced_at: now }); continue; }
        const dup = e.duplicateOf ? s.files.find((f) => f.drive_file_id === e.duplicateOf)?.id ?? null : null;
        s.files.push({
          id: crypto.randomUUID(), drive_file_id: e.driveFileId, drive_folder_key: e.folderKey, name: e.name, mime_type: e.mimeType, size_bytes: e.size,
          md5: e.md5, drive_modified_at: e.modifiedTime, web_view_link: e.webViewLink, target_section: e.target, target_note: e.note, media_kind: e.media,
          sensitivity: e.sensitivity, manifest_rule: e.rule, duplicate_of: dup, review_status: "pending", first_imported_at: now, last_synced_at: now, taken_at: e.takenAt,
        });
      }
    } else {
      const supabase = await createClient();
      await checkFolderAccess(v);   // make sure drive_folders rows exist for the FK
      for (const e of report.entries) {
        if (e.action === "exclude") continue;
        const { error: err } = await supabase.rpc("drive_upsert_file", {
          p_drive_file_id: e.driveFileId, p_folder_key: e.folderKey, p_name: e.name, p_mime: e.mimeType, p_size: e.size, p_md5: e.md5,
          p_modified: e.modifiedTime, p_link: e.webViewLink, p_target: e.target, p_media: e.media, p_sensitivity: e.sensitivity, p_rule: e.rule, p_note: e.note, p_taken_at: e.takenAt,
        });
        if (err) throw new Error(`${e.name}: ${err.message}`);
      }
    }
  } catch (e) { error = (e as Error).message; }
  await recordRun(v, "apply", report, error);
  if (error) throw new Error(error);
  return report;
}

async function recordRun(v: Viewer, mode: "dry_run" | "apply", report: SyncReport, error: string | null) {
  const summary = { ...report.counts, unreadable_folders: report.folders.filter((f) => !f.readable && !f.optional).length };
  const slim = report.entries.map((e) => ({ name: e.name, folder: e.folderKey, target: e.target, note: e.note, action: e.action, sensitivity: e.sensitivity }));
  if (v.demo) {
    demo().runs.unshift({ id: crypto.randomUUID(), mode, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: !error, summary, error });
    demo().runs.length = Math.min(demo().runs.length, 20);
    return;
  }
  const supabase = await createClient();
  await supabase.from("drive_sync_runs").insert({ mode, started_by: v.id, finished_at: new Date().toISOString(), ok: !error, summary, report: slim, error });
}

/** Demo only: the fake pointer rows, with no viewer check (used by the public tribute route). */
export function demoImportedFiles(): ImportedFileRow[] {
  return demo().files;
}

export async function listImportedFiles(v: Viewer): Promise<ImportedFileRow[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return demo().files;
  const supabase = await createClient();
  const { data, error } = await supabase.from("imported_files").select("*").order("drive_folder_key").order("name");
  if (error) throw new Error("Could not load imported files.");
  return data as ImportedFileRow[];
}

export async function listRuns(v: Viewer): Promise<SyncRunRow[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return demo().runs;
  const supabase = await createClient();
  const { data } = await supabase.from("drive_sync_runs").select("id, mode, started_at, finished_at, ok, summary, error").order("started_at", { ascending: false }).limit(10);
  return (data ?? []) as SyncRunRow[];
}

/** Approves every file still waiting for review. Returns how many were approved. */
export async function approveAllPending(v: Viewer): Promise<number> {
  if (v.demo) {
    const rows = demo().files.filter((x) => x.review_status === "pending" && x.sensitivity !== "excluded");
    for (const f of rows) f.review_status = "approved";
    return rows.length;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("imported_files").update({ review_status: "approved" }).eq("review_status", "pending").select("id");
  if (error) throw new Error("Could not approve the waiting files.");
  return data?.length ?? 0;
}

export async function reviewImportedFile(v: Viewer, id: string, decision: "approved" | "rejected") {
  if (v.demo) {
    const f = demo().files.find((x) => x.id === id);
    if (f) f.review_status = f.sensitivity === "excluded" ? "rejected" : decision;
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("imported_files").update({ review_status: decision }).eq("id", id);
  if (error) throw new Error("Could not save the decision.");
}

/**
 * Copy approved Drive files into the private storage bucket so the app can serve them without a Google login.
 * Runs as the signed-in super admin; takes the next `limit` files without a copy. Synthetic rows (album
 * links, Riana uploads) and anything over 25 MB are skipped.
 */
export async function copyDriveFilesToStorage(v: Viewer, limit = 25): Promise<{ copied: number; remaining: number; errors: string[] }> {
  if (v.demo) return { copied: 0, remaining: 0, errors: ["Not in the demo."] };
  const drive = clientFor(v);
  const supabase = await createClient();
  const { data: rows, error } = await supabase.from("imported_files")
    .select("id, drive_file_id, name, mime_type, size_bytes, section, review_status, storage_path")
    .is("storage_path", null).eq("review_status", "approved")
    .not("drive_file_id", "like", "gphoto%").not("drive_file_id", "like", "riana%").not("drive_file_id", "like", "local%").not("drive_file_id", "like", "upload%")
    .order("first_imported_at", { ascending: true }).limit(limit + 1);
  if (error) throw new Error(error.message);
  const batch = (rows ?? []).slice(0, limit);
  const errors: string[] = []; let copied = 0;
  for (const r of batch) {
    // Files that can never be copied (Google Docs, spreadsheets, types the bucket refuses, oversize) are marked
    // "drive-only" so the Open button keeps using Drive and the copy step stops retrying them.
    const driveOnly = async (why: string) => { await supabase.from("imported_files").update({ storage_path: `drive-only: ${why}` }).eq("id", r.id); errors.push(`${r.name}: ${why}`); };
    if ((r.size_bytes ?? 0) > 25 * 1024 * 1024) { await driveOnly("over 25 MB, left in Drive"); continue; }
    if ((r.mime_type ?? "").startsWith("application/vnd.google-apps")) { await driveOnly("a Google Doc/Sheet, opens in Drive"); continue; }
    try {
      const res = await drive.stream(r.drive_file_id);
      if (res.status === 403 || res.status === 404) { await driveOnly(`Drive ${res.status}, opens in Drive`); continue; }
      if (!res.ok) throw new Error(`Drive ${res.status}`);
      const mime = resolveMime(r.name, r.mime_type, res.headers.get("content-type"));
      if (!mime) { await driveOnly("file type not accepted by the binder bucket, left in Drive"); continue; }
      const bytes = Buffer.from(await res.arrayBuffer());
      const key = objectKey(r.section, r.id, r.name);
      const up = await supabase.storage.from(BUCKET).upload(key, bytes, { contentType: mime, upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { error: e2 } = await supabase.from("imported_files").update({ storage_path: key, mime_type: r.mime_type ?? mime }).eq("id", r.id);
      if (e2) throw new Error(e2.message);
      copied++;
    } catch (e) { errors.push(`${r.name}: ${(e as Error).message}`); }
  }
  const { count } = await supabase.from("imported_files").select("id", { count: "exact", head: true })
    .is("storage_path", null).eq("review_status", "approved")
    .not("drive_file_id", "like", "gphoto%").not("drive_file_id", "like", "riana%").not("drive_file_id", "like", "local%").not("drive_file_id", "like", "upload%");
  return { copied, remaining: count ?? 0, errors };
}
