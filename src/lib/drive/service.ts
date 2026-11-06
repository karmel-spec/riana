import "server-only";
import { createClient } from "../supabase/server";
import type { Viewer } from "../session";
import { driveClient, serviceAccountEmail } from "./client";
import { fakeDriveClient } from "./fake";
import { FOLDERS } from "./manifest";
import { planSync, resolveFolders, type Existing, type FolderStatus, type SyncReport } from "./sync";
import type { DriveClient } from "./types";
import type { Section } from "../types";

export type ImportedFileRow = {
  id: string; drive_file_id: string; drive_folder_key: string; name: string; mime_type: string | null; size_bytes: number | null;
  md5: string | null; drive_modified_at: string | null; web_view_link: string | null; target_section: Section; target_note: string | null;
  media_kind: string; sensitivity: "normal" | "admin_only" | "excluded"; manifest_rule: string | null; duplicate_of: string | null;
  review_status: "pending" | "approved" | "rejected"; first_imported_at: string; last_synced_at: string;
};
export type SyncRunRow = { id: string; mode: string; started_at: string; finished_at: string | null; ok: boolean | null; summary: Record<string, number>; error: string | null };

export type DriveSetup = { mode: "real" | "fake" | "none"; serviceAccount: string | null };

/** Which Drive we talk to. Demo mode and "no key yet" both use the fake Drive, but say so. */
export function driveSetup(v: Viewer): DriveSetup {
  const email = serviceAccountEmail();
  if (!v.demo && email) return { mode: "real", serviceAccount: email };
  return { mode: v.demo || !email ? "fake" : "none", serviceAccount: email };
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

async function existingMap(v: Viewer): Promise<Existing> {
  const rows = await listImportedFiles(v);
  return new Map(rows.map((r) => [r.drive_file_id, { md5: r.md5, modifiedTime: r.drive_modified_at }]));
}

export async function dryRun(v: Viewer): Promise<SyncReport> {
  const report = await planSync(clientFor(v), await existingMap(v));
  await recordRun(v, "dry_run", report, null);
  return report;
}

export async function applySync(v: Viewer): Promise<SyncReport> {
  const report = await planSync(clientFor(v), await existingMap(v));
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
          sensitivity: e.sensitivity, manifest_rule: e.rule, duplicate_of: dup, review_status: "pending", first_imported_at: now, last_synced_at: now,
        });
      }
    } else {
      const supabase = await createClient();
      await checkFolderAccess(v);   // make sure drive_folders rows exist for the FK
      for (const e of report.entries) {
        if (e.action === "exclude") continue;
        const { error: err } = await supabase.rpc("drive_upsert_file", {
          p_drive_file_id: e.driveFileId, p_folder_key: e.folderKey, p_name: e.name, p_mime: e.mimeType, p_size: e.size, p_md5: e.md5,
          p_modified: e.modifiedTime, p_link: e.webViewLink, p_target: e.target, p_media: e.media, p_sensitivity: e.sensitivity, p_rule: e.rule, p_note: e.note,
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
  const summary = { ...report.counts, unreadable_folders: report.folders.filter((f) => !f.readable).length };
  const slim = report.entries.map((e) => ({ name: e.name, folder: e.folderKey, target: e.target, note: e.note, action: e.action, sensitivity: e.sensitivity }));
  if (v.demo) {
    demo().runs.unshift({ id: crypto.randomUUID(), mode, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: !error, summary, error });
    demo().runs.length = Math.min(demo().runs.length, 20);
    return;
  }
  const supabase = await createClient();
  await supabase.from("drive_sync_runs").insert({ mode, started_by: v.id, finished_at: new Date().toISOString(), ok: !error, summary, report: slim, error });
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
