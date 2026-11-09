"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const Input = z.object({
  asset_kind: z.enum(["property", "vehicle"]),
  asset_id: z.string().uuid(),
  url: z.string().trim().url("Paste the full https:// link.").max(600).refine((u) => u.startsWith("https://"), "The link must start with https://"),
  caption: z.string().trim().max(200).optional().or(z.literal("")),
  taken_on: z.string().optional().or(z.literal("")),
});

async function writer() {
  const v = await getViewer();
  if (!canWrite(v, "properties")) throw new Error("You don't have permission to add photos.");
  return v;
}

/** Save a photo link (Google Photos, Drive, iMemories). The app keeps the link only. */
export async function addAssetPhoto(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Input.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data; const v = await writer();
    const row = { asset_kind: d.asset_kind, asset_id: d.asset_id, url: d.url, caption: d.caption || null, taken_on: d.taken_on || null, added_by_name: v.name };
    if (v.demo) demoStore().assetPhotos.push({ id: crypto.randomUUID(), ...row, source: "app", created_at: new Date().toISOString() });
    else {
      const supabase = await createClient();
      const { error } = await supabase.from("asset_photos").insert(row);
      if (error) return { ok: false, error: error.message.includes("asset_photos") ? "The database is missing the photos migration (20261106000020_asset_photos)." : `Could not save: ${error.message}` };
    }
    revalidatePath("/properties"); revalidatePath("/vehicles"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteAssetPhoto(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await writer();
    if (v.demo) { const s = demoStore(); s.assetPhotos = s.assetPhotos.filter((p) => p.id !== id); }
    else { const supabase = await createClient(); const { error } = await supabase.from("asset_photos").delete().eq("id", id); if (error) return { ok: false, error: "Could not remove the photo." }; }
    revalidatePath("/properties"); revalidatePath("/vehicles"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
