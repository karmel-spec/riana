"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { addDocSource, removeDocSource, setDocSourceEnabled, syncDocSources, type DocSource, type DocSyncResult } from "@/lib/riana/doc-sync";
import { driveIdFromLink } from "@/lib/riana/doc-parse";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function admin() {
  const v = await getViewer();
  if (v.role !== "super_admin") throw new Error("Super admins only.");
  return v;
}

export async function addRianaDoc(input: { name: string; link: string }): Promise<Result<DocSource>> {
  try {
    const parsed = z.object({ name: z.string().trim().max(120), link: z.string().trim().min(10).max(500) }).safeParse(input);
    if (!parsed.success) return { ok: false, error: "Give the doc a name and paste its link." };
    const id = driveIdFromLink(parsed.data.link);
    if (!id) return { ok: false, error: "That doesn't look like a Google Docs link or file id." };
    const v = await admin();
    const data = await addDocSource(v, parsed.data.name, id);
    revalidatePath("/admin/riana");
    return { ok: true, data };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeRianaDoc(id: string): Promise<Result> {
  try {
    const v = await admin();
    await removeDocSource(v, id);
    revalidatePath("/admin/riana");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function toggleRianaDoc(id: string, enabled: boolean): Promise<Result> {
  try {
    const v = await admin();
    await setDocSourceEnabled(v, id, enabled);
    revalidatePath("/admin/riana");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function syncRianaDocs(dryRun: boolean): Promise<Result<DocSyncResult>> {
  try {
    const v = await admin();
    const data = await syncDocSources(v, { dryRun });
    revalidatePath("/admin/riana"); revalidatePath("/");
    return { ok: true, data };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
