"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const JournalInput = z.object({
  title: z.string().trim().min(2, "Give the journal a name.").max(140),
  url: z.string().trim().url("Paste the full https:// link.").max(500).refine((u) => u.startsWith("https://"), "The link must start with https://"),
  author: z.enum(["rich", "diana", "both"]),
  period: Opt(60),
  note: Opt(400),
});

function kindFor(url: string) {
  if (/docs\.google\.com\/document/.test(url)) return "google_doc" as const;
  if (/drive\.google\.com\/drive\/folders/.test(url)) return "drive_folder" as const;
  if (/blogspot\.com|blogger\.com|wordpress\.com/.test(url)) return "blog" as const;
  return "other" as const;
}

async function writer() {
  const v = await getViewer();
  if (!canWrite(v, "family_history")) throw new Error("You don't have permission to change the journals.");
  return v;
}

/** Save a link to a journal, blog or folder of scanned pages. The writing stays where it is. */
export async function addJournal(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = JournalInput.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data; const v = await writer();
    const row = { title: d.title, url: d.url, author: d.author, kind: kindFor(d.url), period: d.period || null, note: d.note || null, added_by_name: v.name };
    if (v.demo) {
      const s = demoStore();
      if (s.journals.some((j) => j.url === d.url)) return { ok: false, error: "That link is already saved." };
      s.journals.push({ id: crypto.randomUUID(), ...row, source: "app", created_at: new Date().toISOString() });
    } else {
      const supabase = await createClient();
      const { error } = await supabase.from("journals").insert(row);
      if (error) return { ok: false, error: error.code === "23505" ? "That link is already saved." : error.message.includes("journals") ? "The database is missing the journals migration." : "Could not save the journal." };
    }
    revalidatePath("/journals"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteJournal(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await writer();
    if (v.demo) { const s = demoStore(); s.journals = s.journals.filter((j) => j.id !== id); }
    else {
      const supabase = await createClient();
      const { error } = await supabase.from("journals").delete().eq("id", id);
      if (error) return { ok: false, error: "Could not remove the journal." };
    }
    revalidatePath("/journals"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
