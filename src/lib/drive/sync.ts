// The sync job: walk every manifest folder, match each file, and either report
// (dry run) or upsert pointer rows (apply). Never downloads file contents.
import { FOLDERS, matchFile, type ManifestFolder } from "./manifest.ts";
import { FOLDER_MIME, type DriveClient, type DriveFile } from "./types.ts";
import type { Section } from "../types.ts";

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

export async function planSync(drive: DriveClient, existing: Existing): Promise<SyncReport> {
  const { status, ids } = await resolveFolders(drive);
  const entries: PlanEntry[] = [];
  const seenByContent = new Map<string, string>();   // md5|size|lower(name) → first drive file id

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
  };
  if (m.sensitivity === "excluded") return { ...base, action: "exclude" };
  const prev = existing.get(file.id);
  if (prev) {
    const same = prev.md5 === file.md5Checksum && prev.modifiedTime === file.modifiedTime;
    return { ...base, action: same ? "unchanged" : "update" };
  }
  if (m.dedupe && file.md5Checksum) {
    const key = `${file.md5Checksum}|${file.size}|${file.name.toLowerCase()}`;
    const first = seen.get(key);
    if (first) return { ...base, action: "duplicate", duplicateOf: first };
    seen.set(key, file.id);
  }
  return { ...base, action: m.rule ? "create" : "unmatched" };
}
