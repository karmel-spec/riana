// The sync job: walk every manifest folder, match each file, and either report
// (dry run) or upsert pointer rows (apply). Never downloads file contents.
import { FOLDERS, matchFile, type ManifestFolder } from "./manifest.ts";
import { FOLDER_MIME, type DriveClient, type DriveFile } from "./types.ts";
import type { Section } from "../types.ts";
import { exifToIso, hashKey, isSidecarFor, sidecarTakenAt } from "./photo-dates.ts";

export type PlanEntry = {
  driveFileId: string;
  folderKey: string;
  folderName: string;
  name: string;
  mimeType: string;
  size: number | null;
  md5: string | null;
  modifiedTime: string;
  webViewLink: string | null;
  target: Section;
  note: string;
  media: string;
  sensitivity: "normal" | "admin_only" | "excluded";
  rule: string | null;
  /** When the photo was taken (EXIF, else Takeout sidecar, else null). */
  takenAt: string | null;
  action: "create" | "update" | "unchanged" | "duplicate" | "exclude" | "unmatched";
  duplicateOf?: string;
};

export type FolderStatus = { key: string; name: string; driveFolderId: string | null; readable: boolean; error?: string; resolvedFrom?: string };

export type SyncReport = {
  mode: "dry_run" | "apply";
  folders: FolderStatus[];
  entries: PlanEntry[];
  counts: Record<PlanEntry["action"], number>;
};

/** Existing rows, keyed by drive file id, for idempotency decisions. */
export type Existing = Map<string, { md5: string | null; modifiedTime: string | null }>;
/** Content already imported (md5|size → drive file id), so a re-export under a new name is a duplicate, not a new photo. */
export type KnownHashes = Map<string, string>;

/** Resolve folder ids: explicit ids from the manifest, subfolders by name under their parent. */
export async function resolveFolders(drive: DriveClient): Promise<{ status: FolderStatus[]; ids: Map<string, string> }> {
  const ids = new Map<string, string>();
  const status: FolderStatus[] = [];
  const children = new Map<string, DriveFile[]>();

  const listOnce = async (id: string) => {
    if (!children.has(id)) children.set(id, await drive.list(id));
    return children.get(id)!;
  };

  for (const f of FOLDERS) {
    let id = f.driveFolderId;
    let resolvedFrom: string | undefined;
    if (!id && f.parentKey) {
      const parentId = ids.get(f.parentKey);
      if (parentId) {
        try {
          const sub = (await listOnce(parentId)).find((c) => c.mimeType === FOLDER_MIME && c.name.trim().toLowerCase() === f.name.toLowerCase());
          if (sub) { id = sub.id; resolvedFrom = f.parentKey; }
        } catch { /* parent unreadable; reported below */ }
      }
    }
    if (!id) {
      status.push({ key: f.key, name: f.name, driveFolderId: null, readable: false, error: f.parentKey ? `Subfolder "${f.name}" not found under ${f.parentKey}` : "No folder id" });
      continue;
    }
    const probe = await drive.probeFolder(id);
    if (probe.ok) { ids.set(f.key, id); status.push({ key: f.key, name: f.name, driveFolderId: id, readable: true, resolvedFrom }); }
    else status.push({ key: f.key, name: f.name, driveFolderId: id, readable: false, error: probe.error });
  }
  return { status, ids };
}

export async function planSync(drive: DriveClient, existing: Existing, known: KnownHashes = new Map()): Promise<SyncReport> {
  const { status, ids } = await resolveFolders(drive);
  const entries: PlanEntry[] = [];
  const seenByContent = new Map<string, string>(known);   // md5|size[|lower(name)] → first drive file id

  for (const folder of FOLDERS) {
    const id = ids.get(folder.key);
    if (!id) continue;
    let files: DriveFile[];
    try { files = await drive.list(id); } catch (e) {
      const st = status.find((s) => s.key === folder.key); if (st) { st.readable = false; st.error = (e as Error).message; }
      continue;
    }
    for (const file of files) {
      if (file.mimeType === FOLDER_MIME) continue;   // subfolders are only followed when the manifest names them
      entries.push(classify(folder, file, existing, seenByContent));
    }
  }

  const counts = { create: 0, update: 0, unchanged: 0, duplicate: 0, exclude: 0, unmatched: 0 };
  for (const e of entries) counts[e.action]++;
  return { mode: "dry_run", folders: status, entries, counts };
}

function classify(folder: ManifestFolder, file: DriveFile, existing: Existing, seen: Map<string, string>): PlanEntry {
  const m = matchFile(folder.key, file.name, file.mimeType);
  const base: Omit<PlanEntry, "action"> = {
    driveFileId: file.id, folderKey: folder.key, folderName: folder.name, name: file.name, mimeType: file.mimeType,
    size: file.size, md5: file.md5Checksum, modifiedTime: file.modifiedTime, webViewLink: file.webViewLink,
    target: m.target, note: m.note, media: m.media, sensitivity: m.sensitivity, rule: m.rule?.id ?? null,
    takenAt: m.media === "image" || m.media === "video" ? exifToIso(file.takenTime) : null,
  };
  if (m.sensitivity === "excluded") return { ...base, action: "exclude" };
  const prev = existing.get(file.id);
  if (prev) {
    const same = prev.md5 === file.md5Checksum && prev.modifiedTime === file.modifiedTime;
    return { ...base, action: same ? "unchanged" : "update" };
  }
  if (m.dedupe && file.md5Checksum) {
    // Photos dedupe on content alone (Takeout re-exports and "Copy of" rename files); other files also need the same name.
    const key = m.media === "image" || m.media === "video" ? hashKey(file.md5Checksum, file.size) : `${hashKey(file.md5Checksum, file.size)}|${file.name.toLowerCase()}`;
    const first = seen.get(key);
    if (first) return { ...base, action: "duplicate", duplicateOf: first };
    seen.set(key, file.id);
  }
  return { ...base, action: m.rule ? "create" : "unmatched" };
}

/**
 * Fill in takenAt for photos that have no EXIF date, from their Takeout sidecar JSON.
 * Reads only the tiny .json files, and only for photos that are about to be created.
 */
export async function enrichTakenAt(drive: DriveClient, report: SyncReport): Promise<number> {
  const sidecars = report.entries.filter((e) => e.rule === "photo-sidecar");
  if (sidecars.length === 0) return 0;
  let filled = 0;
  for (const e of report.entries) {
    if ((e.media !== "image" && e.media !== "video") || e.takenAt || (e.action !== "create" && e.action !== "duplicate")) continue;
    const sc = sidecars.find((s) => s.folderKey === e.folderKey && isSidecarFor(e.name, s.name));
    if (!sc) continue;
    try {
      const res = await drive.stream(sc.driveFileId);
      const at = sidecarTakenAt(await res.text());
      if (at) { e.takenAt = at; filled++; }
    } catch { /* a missing sidecar just means no date */ }
  }
  return filled;
}
