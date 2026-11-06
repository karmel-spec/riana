"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import { syncMediaFromImports } from "@/lib/media/service";
import type { TributeBlock } from "@/lib/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const nul = (s: string | undefined) => (s ? s : null);
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

async function historyWriter() {
  const v = await getViewer();
  if (!canWrite(v, "family_history")) throw new Error("You don't have permission to change the archive.");
  return v;
}
async function admin() {
  const v = await getViewer();
  if (v.role !== "super_admin") throw new Error("Super admins only.");
  return v;
}
const bump = (name: string, section: "family_history" | "admin", action: "create" | "update" | "delete" | "approve", summary: string, entity: string) =>
  demoStore().audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: name, action, section, entity, via: "app", summary });

export async function syncMedia(): Promise<Result<{ created: number; tracksAdded: number }>> {
  try { const v = await admin(); const data = await syncMediaFromImports(v); revalidatePath("/history"); revalidatePath("/history/singalong"); return { ok: true, data }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

const MediaForm = z.object({
  id: z.string().uuid(), title: Opt(200), caption: Opt(500), story: Opt(4000), taken_on: z.string().optional().or(z.literal("")),
  event_name: Opt(120), people_tags: Opt(500), category: z.enum(["memory", "church", "music", "event", "document", "other"]).optional().or(z.literal("")),
  recorded_by: Opt(80), transcript: Opt(20000),
});
export async function saveMediaItem(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await historyWriter();
    const parsed = MediaForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const row = { title: nul(d.title), caption: nul(d.caption), story: nul(d.story), taken_on: nul(d.taken_on), event_name: nul(d.event_name),
      people_tags: (d.people_tags ?? "").split(",").map((x) => x.trim()).filter(Boolean), category: nul(d.category) as never, recorded_by: nul(d.recorded_by), transcript: nul(d.transcript),
      decade: d.taken_on ? Math.floor(Number(d.taken_on.slice(0, 4)) / 10) * 10 : null };
    if (v.demo) { const m = demoStore().media.find((x) => x.id === id); if (!m) return { ok: false, error: "Not found." }; Object.assign(m, row); bump(v.name, "family_history", "update", `Edited ${row.title ?? "a media item"}`, "media_items"); }
    else { const supabase = await createClient(); const { error } = await supabase.from("media_items").update(row).eq("id", id); if (error) return { ok: false, error: "Could not save." }; }
    revalidatePath("/history"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function setPlaylistOrder(playlistId: string, orderedIds: string[]): Promise<Result> {
  try {
    const v = await historyWriter();
    if (!z.array(z.string().uuid()).safeParse(orderedIds).success) return { ok: false, error: "Bad ids." };
    if (v.demo) { const p = demoStore().playlists.find((x) => x.id === playlistId); if (p) p.track_ids = orderedIds; }
    else {
      const supabase = await createClient();
      await supabase.from("playlist_tracks").delete().eq("playlist_id", playlistId);
      const { error } = await supabase.from("playlist_tracks").insert(orderedIds.map((id, i) => ({ playlist_id: playlistId, media_item_id: id, position: i + 1 })));
      if (error) return { ok: false, error: "Could not save the order." };
    }
    revalidatePath("/history/singalong"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Tribute pages (super admin) ----------------------------------------------------------
const TributeForm = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2, "Give the page a title.").max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, "Link name: letters, numbers and dashes only."),
  subtitle: Opt(200), intro: Opt(4000), obituary: Opt(20000),
  service_when: Opt(200), service_where: Opt(200), service_address: Opt(300), service_notes: Opt(1000), service_livestream_url: Opt(300),
});
export async function saveTribute(_p: Result<{ id: string }> | null, form: FormData): Promise<Result<{ id: string }>> {
  try {
    const v = await admin();
    const parsed = TributeForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const service = { when: nul(d.service_when) ?? undefined, where: nul(d.service_where) ?? undefined, address: nul(d.service_address) ?? undefined, notes: nul(d.service_notes) ?? undefined, livestream_url: nul(d.service_livestream_url) ?? undefined };
    const row = { title: d.title, slug: d.slug, subtitle: nul(d.subtitle), intro: nul(d.intro), obituary: nul(d.obituary), service };
    let newId = id || "";
    if (v.demo) {
      const s = demoStore();
      if (id) { const t = s.tributes.find((x) => x.id === id); if (!t) return { ok: false, error: "Not found." }; Object.assign(t, row); }
      else { newId = crypto.randomUUID(); s.tributes.push({ id: newId, ...row, status: "draft", share_token: null, published_at: null, shared_list_ids: [] }); }
      bump(v.name, "admin", id ? "update" : "create", `${id ? "Edited" : "Created"} tribute page: ${d.title}`, "tribute_pages");
    } else {
      const supabase = await createClient();
      if (id) { const { error } = await supabase.from("tribute_pages").update(row).eq("id", id); if (error) return { ok: false, error: /unique/i.test(error.message) ? "That link name is taken." : "Could not save." }; }
      else { const { data, error } = await supabase.from("tribute_pages").insert(row).select("id").single(); if (error) return { ok: false, error: /unique/i.test(error.message) ? "That link name is taken." : "Could not save." }; newId = data.id; }
    }
    revalidatePath("/history/tribute"); revalidatePath(`/history/tribute/${newId}`);
    return { ok: true, data: { id: newId } };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const BlockForm = z.object({
  page_id: z.string().uuid(), id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(["heading", "text", "media", "gallery", "story", "service"]),
  text: Opt(20000), media_item_id: z.string().uuid().optional().or(z.literal("")), media_item_ids: Opt(2000),
});
export async function saveBlock(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await admin();
    const parsed = BlockForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { page_id, id, ...d } = parsed.data;
    const ids = (d.media_item_ids ?? "").split(",").map((x) => x.trim()).filter((x) => z.string().uuid().safeParse(x).success);
    const row = { kind: d.kind, text: nul(d.text), media_item_id: nul(d.media_item_id), media_item_ids: ids };
    if (v.demo) {
      const s = demoStore();
      if (id) { const b = s.tributeBlocks.find((x) => x.id === id); if (b) Object.assign(b, row); }
      else { const pos = s.tributeBlocks.filter((b) => b.page_id === page_id).length + 1; s.tributeBlocks.push({ id: crypto.randomUUID(), page_id, position: pos, ...row } as TributeBlock); }
    } else {
      const supabase = await createClient();
      if (id) { const { error } = await supabase.from("tribute_blocks").update(row).eq("id", id); if (error) return { ok: false, error: "Could not save." }; }
      else {
        const { data: last } = await supabase.from("tribute_blocks").select("position").eq("page_id", page_id).order("position", { ascending: false }).limit(1).maybeSingle();
        const { error } = await supabase.from("tribute_blocks").insert({ page_id, position: (last?.position ?? 0) + 1, ...row }); if (error) return { ok: false, error: "Could not save." };
      }
    }
    revalidatePath(`/history/tribute/${page_id}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeBlock(pageId: string, id: string): Promise<Result> {
  try {
    const v = await admin();
    if (v.demo) { const s = demoStore(); s.tributeBlocks = s.tributeBlocks.filter((b) => b.id !== id); }
    else { const supabase = await createClient(); await supabase.from("tribute_blocks").delete().eq("id", id); }
    revalidatePath(`/history/tribute/${pageId}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function moveBlock(pageId: string, id: string, dir: -1 | 1): Promise<Result> {
  try {
    const v = await admin();
    if (v.demo) {
      const s = demoStore(); const list = s.tributeBlocks.filter((b) => b.page_id === pageId).sort((a, b) => a.position - b.position);
      const i = list.findIndex((b) => b.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= list.length) return { ok: true };
      [list[i].position, list[j].position] = [list[j].position, list[i].position];
    } else {
      const supabase = await createClient();
      const { data: list } = await supabase.from("tribute_blocks").select("id, position").eq("page_id", pageId).order("position");
      const i = (list ?? []).findIndex((b) => b.id === id); const j = i + dir; if (!list || i < 0 || j < 0 || j >= list.length) return { ok: true };
      await supabase.from("tribute_blocks").update({ position: list[j].position }).eq("id", list[i].id);
      await supabase.from("tribute_blocks").update({ position: list[i].position }).eq("id", list[j].id);
    }
    revalidatePath(`/history/tribute/${pageId}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function setTributeStatus(pageId: string, status: "published" | "unpublished"): Promise<Result<{ token: string | null }>> {
  try {
    const v = await admin();
    let token: string | null = null;
    if (v.demo) {
      const t = demoStore().tributes.find((x) => x.id === pageId); if (!t) return { ok: false, error: "Not found." };
      if (status === "published") { token = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join(""); t.status = "published"; t.share_token = token; t.published_at = new Date().toISOString(); }
      else { t.status = "unpublished"; t.share_token = null; }
      bump(v.name, "admin", "update", `${status === "published" ? "Published" : "Unpublished"} tribute page`, "tribute_pages");
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("tribute_set_status", { p_id: pageId, p_status: status });
      if (error) return { ok: false, error: "Could not change the page status." };
      token = (data as string | null) ?? null;
    }
    revalidatePath(`/history/tribute/${pageId}`); revalidatePath("/history/tribute");
    return { ok: true, data: { token } };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function shareTributeWithLists(pageId: string, listIds: string[]): Promise<Result> {
  try {
    const v = await admin();
    if (!z.array(z.string().uuid()).safeParse(listIds).success) return { ok: false, error: "Bad ids." };
    if (v.demo) { const t = demoStore().tributes.find((x) => x.id === pageId); if (t) t.shared_list_ids = listIds; }
    else { const supabase = await createClient(); const { error } = await supabase.from("tribute_pages").update({ shared_list_ids: listIds }).eq("id", pageId); if (error) return { ok: false, error: "Could not save." }; }
    revalidatePath(`/history/tribute/${pageId}`); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const Album = z.object({ title: z.string().trim().min(2, "Give the album a name.").max(120), url: z.string().trim().url("Paste the full https:// link.").max(500).refine((u) => u.startsWith("https://"), "The link must start with https://"), note: Opt(300) });
/** Save a shared album link as a reference. The photos stay where they are; nothing is copied. */
export async function addSharedAlbum(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Album.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data; const v = await getViewer();
    if (!canWrite(v, "family_history") && v.role !== "super_admin") return { ok: false, error: "You can't add albums." };
    const provider = /photos\.app\.goo\.gl|photos\.google\.com/.test(d.url) ? "google_photos" : /icloud\.com/.test(d.url) ? "icloud" : "other";
    if (v.demo) {
      const s = demoStore();
      if (s.albums.some((a) => a.url === d.url)) return { ok: false, error: "That album is already saved." };
      s.albums.push({ id: crypto.randomUUID(), title: d.title, url: d.url, provider, note: d.note || null, added_by_name: v.name, source: "app", created_at: new Date().toISOString() });
      bump(v.name, "family_history", "create", `Saved shared album link: ${d.title}`, "shared_albums");
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("shared_albums").insert({ title: d.title, url: d.url, provider, note: d.note || null, added_by_name: v.name });
      if (error) return { ok: false, error: error.code === "23505" ? "That album is already saved." : "Could not save the album link." };
    }
    revalidatePath("/history"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
