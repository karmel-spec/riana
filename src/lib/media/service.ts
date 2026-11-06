import "server-only";
import { createClient } from "../supabase/server";
import type { Viewer } from "../session";
import { canRead, canWrite } from "../session";
import { demoStore } from "../data";
import { applySync, listImportedFiles, reviewImportedFile, type ImportedFileRow } from "../drive/service";
import type { MediaItem } from "../types";

const SINGALONG_RULES = new Set(["rich-song", "singalong-track", "singalong-untitled"]);

function kindFor(f: ImportedFileRow): MediaItem["kind"] | null {
  if (f.media_kind === "video") return "video_story";
  if (f.media_kind === "audio") return "audio_story";
  if (f.media_kind === "image") return "photo";
  return null;
}
const titleFor = (name: string) => name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();

/**
 * Create media_items for approved imported audio/video/image files that don't
 * have one yet, and put Sing-Along audio on the playlist. Idempotent.
 */
export async function syncMediaFromImports(v: Viewer): Promise<{ created: number; tracksAdded: number }> {
  if (!canWrite(v, "family_history") && v.role !== "super_admin") throw new Error("No permission.");
  const files = (await listImportedFiles(v)).filter((f) => f.review_status === "approved" && f.target_section === "family_history" && kindFor(f) && !f.duplicate_of);
  let created = 0, tracksAdded = 0;

  if (v.demo) {
    const s = demoStore();
    const playlist = s.playlists.find((p) => p.slug === "sing-along");
    for (const f of files) {
      let m = s.media.find((x) => x.imported_file_id === f.id);
      if (!m) {
        m = { id: crypto.randomUUID(), kind: kindFor(f)!, title: titleFor(f.name), caption: null, story: null, taken_on: (f.taken_at ?? f.drive_modified_at)?.slice(0, 10) ?? null, decade: null, event_name: null, people_tags: [],
              category: SINGALONG_RULES.has(f.manifest_rule ?? "") ? "music" : /church|scripture/i.test(f.target_note ?? "") ? "church" : "memory",
              imported_file_id: f.id, poster_file_id: null, duration_seconds: null, mime_type: f.mime_type, transcript: null, recorded_by: null, review_status: "approved", source: "import" };
        s.media.push(m); created++;
      }
      if (playlist && m.kind === "audio_story" && SINGALONG_RULES.has(f.manifest_rule ?? "") && !playlist.track_ids.includes(m.id)) { playlist.track_ids.push(m.id); tracksAdded++; }
    }
    return { created, tracksAdded };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("media_items").select("id, imported_file_id, kind").not("imported_file_id", "is", null);
  const { data: playlist } = await supabase.from("playlists").select("id, tracks:playlist_tracks(media_item_id, position)").eq("slug", "sing-along").maybeSingle();
  const tracks = ((playlist?.tracks ?? []) as { media_item_id: string; position: number }[]);
  let nextPos = tracks.reduce((m, t) => Math.max(m, t.position), 0) + 1;
  for (const f of files) {
    let mediaId = existing?.find((x) => x.imported_file_id === f.id)?.id;
    if (!mediaId) {
      const { data, error } = await supabase.from("media_items").insert({
        kind: kindFor(f)!, title: titleFor(f.name), taken_on: (f.taken_at ?? f.drive_modified_at)?.slice(0, 10) ?? null, imported_file_id: f.id, mime_type: f.mime_type,
        category: SINGALONG_RULES.has(f.manifest_rule ?? "") ? "music" : /church|scripture/i.test(f.target_note ?? "") ? "church" : "memory", review_status: "approved", source: "import",
      }).select("id").single();
      if (error) throw new Error(`${f.name}: ${error.message}`);
      mediaId = data.id; created++;
    }
    if (playlist && f.media_kind === "audio" && SINGALONG_RULES.has(f.manifest_rule ?? "") && !tracks.some((t) => t.media_item_id === mediaId)) {
      const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlist.id, media_item_id: mediaId, position: nextPos++ });
      if (!error) { tracksAdded++; tracks.push({ media_item_id: mediaId, position: nextPos - 1 }); }
    }
  }
  return { created, tracksAdded };
}

/** Demo only: make sure the fake Drive has been imported, approved and synced, so the library isn't empty. */
export async function ensureDemoMedia(v: Viewer) {
  if (!v.demo || !canRead(v, "family_history")) return;
  const s = demoStore();
  if (s.media.length > 0) return;
  const admin: Viewer = { ...v, role: "super_admin", access: { ...v.access, admin: "write", family_history: "write" } };
  if ((await listImportedFiles(admin)).length === 0) await applySync(admin);
  for (const f of await listImportedFiles(admin)) if (f.review_status === "pending" && f.target_section === "family_history" && f.sensitivity === "normal") await reviewImportedFile(admin, f.id, "approved");
  await syncMediaFromImports(admin);
}
