"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const Input = z.object({
  category: z.enum(["book", "photos", "imemories", "digital_history", "love_letter", "interview", "other"]),
  title: z.string().trim().min(2, "Give it a name.").max(140),
  owner: z.enum(["rich", "diana", "both"]),
  url: z.string().trim().max(500).optional().or(z.literal("")).refine((u) => !u || u.startsWith("https://"), "The link must start with https://"),
  location: Opt(140),
  period: Opt(60),
  note: Opt(400),
}).refine((d) => d.url || d.location, { message: "Add a link or say where it is kept.", path: ["url"] });

async function writer() {
  const v = await getViewer();
  if (!canWrite(v, "family_history")) throw new Error("You don't have permission to change the collections.");
  return v;
}

export async function addCollectionItem(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Input.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data; const v = await writer();
    const row = { category: d.category, title: d.title, owner: d.owner, url: d.url || null, location: d.location || null, period: d.period || null, note: d.note || null, added_by_name: v.name };
    if (v.demo) {
      demoStore().collections.push({ id: crypto.randomUUID(), ...row, source: "app", created_at: new Date().toISOString() });
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("collections").insert(row);
      if (error) return { ok: false, error: error.message.includes("collections") ? "The database is missing the collections migration." : "Could not save the item." };
    }
    revalidatePath("/collections"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteCollectionItem(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await writer();
    if (v.demo) { const s = demoStore(); s.collections = s.collections.filter((c) => c.id !== id); }
    else {
      const supabase = await createClient();
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) return { ok: false, error: "Could not remove the item." };
    }
    revalidatePath("/collections"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
