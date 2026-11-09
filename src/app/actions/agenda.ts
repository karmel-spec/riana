"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
const missing = (m: string) => (m.includes("meeting_agenda") ? "The database is missing migration 24 (meeting agenda)." : m);

async function need() {
  const v = await getViewer();
  if (!canWrite(v, "legal") || v.demo) throw new Error("You don't have permission to change the agenda.");
  return v;
}
const touch = () => { revalidatePath("/executrix/agenda"); revalidatePath("/executrix"); };

const AddForm = z.object({
  kind: z.enum(["question", "document", "note"]),
  text: z.string().trim().min(2, "Write the item.").max(600),
  detail: z.string().trim().max(2000).optional().or(z.literal("")),
  file_id: z.string().uuid().optional().or(z.literal("")),
  question_id: z.string().uuid().optional().or(z.literal("")),
});

export async function addAgendaItem(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const v = await need();
    const parsed = AddForm.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const d = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.from("meeting_agenda").insert({ kind: d.kind, text: d.text, detail: d.detail || null, file_id: d.file_id || null, question_id: d.question_id || null, added_by_name: v.name });
    if (error) return { ok: false, error: missing(error.message) };
    touch(); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function setAgendaStatus(id: string, status: "open" | "discussed" | "resolved", outcome?: string): Promise<Result> {
  try {
    await need();
    const supabase = await createClient();
    const { error } = await supabase.from("meeting_agenda").update({ status, outcome: outcome?.trim() || null }).eq("id", id);
    if (error) return { ok: false, error: missing(error.message) };
    touch(); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeAgendaItem(id: string): Promise<Result> {
  try {
    await need();
    const supabase = await createClient();
    const { error } = await supabase.from("meeting_agenda").delete().eq("id", id);
    if (error) return { ok: false, error: missing(error.message) };
    touch(); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
