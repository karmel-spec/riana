"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };
const Opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const Input = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  safe_name: z.string().trim().min(2, "Which safe?").max(80),
  category: z.enum(["document", "cash", "keys", "jewelry", "media", "other"]),
  name: z.string().trim().min(2, "What is it?").max(140),
  detail: Opt(600),
  confirmed_on: z.string().optional().or(z.literal("")),
});

async function writer() {
  const v = await getViewer();
  if (!canWrite(v, "accounts")) throw new Error("You don't have permission to change the safe list.");
  return v;
}

export async function saveSafeItem(_p: Result | null, form: FormData): Promise<Result> {
  try {
    const parsed = Input.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data; const v = await writer();
    if (/\d{5,}/.test(`${d.name} ${d.detail}`)) return { ok: false, error: "That looks like a combination or account number. Keep those in the vault and refer to them by item name." };
    const row = { safe_name: d.safe_name, category: d.category, name: d.name, detail: d.detail || null, confirmed_on: d.confirmed_on || null };
    if (v.demo) {
      const s = demoStore();
      if (id) { const x = s.safeItems.find((i) => i.id === id); if (!x) return { ok: false, error: "Not found." }; Object.assign(x, row); }
      else s.safeItems.push({ id: crypto.randomUUID(), ...row, added_by_name: v.name, source: "app", created_at: new Date().toISOString() });
    } else {
      const supabase = await createClient();
      const { error } = id ? await supabase.from("safe_items").update(row).eq("id", id) : await supabase.from("safe_items").insert({ ...row, added_by_name: v.name });
      if (error) return { ok: false, error: error.message.includes("safe_items") ? "The database is missing the safe migration." : `Could not save: ${error.message}` };
    }
    revalidatePath("/safe"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteSafeItem(id: string): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await writer();
    if (v.demo) { const s = demoStore(); s.safeItems = s.safeItems.filter((i) => i.id !== id); }
    else {
      const supabase = await createClient();
      const { error } = await supabase.from("safe_items").delete().eq("id", id);
      if (error) return { ok: false, error: "Could not remove the item." };
    }
    revalidatePath("/safe"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
