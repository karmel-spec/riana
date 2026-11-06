"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { applySync, checkFolderAccess, dryRun, approveAllPending, reviewImportedFile } from "@/lib/drive/service";
import type { SyncReport } from "@/lib/drive/sync";
import type { FolderStatus } from "@/lib/drive/sync";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function admin() {
  const v = await getViewer();
  if (v.role !== "super_admin") throw new Error("Super admins only.");
  return v;
}

export async function runAccessCheck(): Promise<Result<FolderStatus[]>> {
  try { const v = await admin(); const data = await checkFolderAccess(v); revalidatePath("/admin/import"); return { ok: true, data }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function runDryRun(): Promise<Result<SyncReport>> {
  try { const v = await admin(); const data = await dryRun(v); revalidatePath("/admin/import"); return { ok: true, data }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function runApply(): Promise<Result<SyncReport>> {
  try { const v = await admin(); const data = await applySync(v); revalidatePath("/admin/import"); revalidatePath("/"); return { ok: true, data }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function approveAllFiles(): Promise<Result<number>> {
  try {
    const v = await admin(); const n = await approveAllPending(v); revalidatePath("/admin/import"); return { ok: true, data: n };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function reviewFile(id: string, decision: "approved" | "rejected"): Promise<Result> {
  try {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
    const v = await admin(); await reviewImportedFile(v, id, decision); revalidatePath("/admin/import"); return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
