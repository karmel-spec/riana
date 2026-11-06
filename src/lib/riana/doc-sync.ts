import "server-only";
import { createClient } from "../supabase/server";
import type { Viewer } from "../session";
import { demoStore } from "../data";
import { driveClient } from "../drive/client";
import { fakeDriveClient, FAKE_BINDER_DOC_ID } from "../drive/fake";
import { driveSetup } from "../drive/service";
import type { DriveClient } from "../drive/types";
import { parseDoc, type Proposal } from "./doc-parse";

/**
 * Riana Drive sync (Phase 1): read each registered Google Doc through the
 * read-only service account, split it into lines under headings, and drop
 * every line not seen before into the Riana inbox as a pending update.
 * Runs as the signed-in super admin, so RLS, change history and the audit
 * log all apply as usual. Nothing is approved here.
 */

export type DocSource = {
  id: string; name: string; drive_file_id: string; enabled: boolean;
  last_synced_at: string | null; last_modified_at: string | null; last_proposed: number; last_error: string | null; created_at: string;
};

export type DocSyncResult = {
  sources: { id: string; name: string; ok: boolean; error?: string; modified_at: string | null; headings: string[]; proposed: number; already: number; skipped: number; preview: { kind: string; summary: string }[] }[];
  proposed: number;
};

const MAX_SOURCES = 10;

type DemoDocs = { sources: DocSource[] };
const g = globalThis as unknown as { __greeneRianaDocs?: DemoDocs };
const demo = () => (g.__greeneRianaDocs ??= {
  sources: [{ id: "demo-doc-1", name: "Greene Family Binder (sample)", drive_file_id: FAKE_BINDER_DOC_ID, enabled: true, last_synced_at: null, last_modified_at: null, last_proposed: 0, last_error: null, created_at: new Date().toISOString() }],
});

function clientFor(v: Viewer): DriveClient {
  return driveSetup(v).mode === "real" ? driveClient()! : fakeDriveClient();
}

function requireAdmin(v: Viewer) {
  if (v.role !== "super_admin") throw new Error("Super admins only.");
}

export async function listDocSources(v: Viewer): Promise<DocSource[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return demo().sources;
  const supabase = await createClient();
  const { data, error } = await supabase.from("riana_doc_sources")
    .select("id, name, drive_file_id, enabled, last_synced_at, last_modified_at, last_proposed, last_error, created_at").order("created_at");
  if (error) throw new Error("Could not load the doc list.");
  return data as DocSource[];
}

export async function addDocSource(v: Viewer, name: string, driveFileId: string): Promise<DocSource> {
  requireAdmin(v);
  const existing = await listDocSources(v);
  if (existing.length >= MAX_SOURCES) throw new Error(`Up to ${MAX_SOURCES} docs can be registered.`);
  if (existing.some((s) => s.drive_file_id === driveFileId)) throw new Error("That doc is already in the list.");
  // Confirm the service account can read it before saving, so the list never holds a dead link.
  const file = await clientFor(v).getFile(driveFileId).catch((e: Error) => { throw new Error(/404/.test(e.message) ? "The app can't see that doc. Share it with the service account (Viewer) first." : e.message); });
  const row: DocSource = { id: crypto.randomUUID(), name: name || file.name, drive_file_id: driveFileId, enabled: true, last_synced_at: null, last_modified_at: null, last_proposed: 0, last_error: null, created_at: new Date().toISOString() };
  if (v.demo) { demo().sources.push(row); return row; }
  const supabase = await createClient();
  const { data, error } = await supabase.from("riana_doc_sources").insert({ name: row.name, drive_file_id: driveFileId })
    .select("id, name, drive_file_id, enabled, last_synced_at, last_modified_at, last_proposed, last_error, created_at").single();
  if (error) throw new Error("Could not save the doc.");
  return data as DocSource;
}

export async function removeDocSource(v: Viewer, id: string): Promise<void> {
  requireAdmin(v);
  if (v.demo) { demo().sources = demo().sources.filter((s) => s.id !== id); return; }
  const supabase = await createClient();
  const { error } = await supabase.from("riana_doc_sources").delete().eq("id", id);
  if (error) throw new Error("Could not remove the doc.");
}

export async function setDocSourceEnabled(v: Viewer, id: string, enabled: boolean): Promise<void> {
  requireAdmin(v);
  if (v.demo) { const s = demo().sources.find((x) => x.id === id); if (s) s.enabled = enabled; return; }
  const supabase = await createClient();
  const { error } = await supabase.from("riana_doc_sources").update({ enabled }).eq("id", id);
  if (error) throw new Error("Could not update the doc.");
}

/** Which refs are already in the inbox (any review status), so a re-sync proposes only new lines. */
async function knownRefs(v: Viewer, refs: string[]): Promise<Set<string>> {
  if (refs.length === 0) return new Set();
  if (v.demo) return new Set(demoStore().riana.map((r) => r.external_ref).filter((r): r is string => !!r && refs.includes(r)));
  const supabase = await createClient();
  const out = new Set<string>();
  for (let i = 0; i < refs.length; i += 200) {
    const { data } = await supabase.from("riana_updates").select("external_ref").in("external_ref", refs.slice(i, i + 200));
    for (const r of data ?? []) if (r.external_ref) out.add(r.external_ref);
  }
  return out;
}

async function insertProposals(v: Viewer, proposals: Proposal[]): Promise<void> {
  if (proposals.length === 0) return;
  if (v.demo) {
    const s = demoStore();
    const now = new Date().toISOString();
    for (const p of proposals) {
      s.riana.unshift({ id: `demo-r-${crypto.randomUUID().slice(0, 8)}`, kind: p.kind, summary: p.summary, received_at: now, review_status: "pending", external_ref: p.external_ref });
    }
    s.audit.unshift({ id: Date.now(), at: now, actor_name: "Riana", action: "create", section: "admin", entity: "riana_updates", via: "riana", summary: `Proposed ${proposals.length} update${proposals.length === 1 ? "" : "s"} from the Binder doc` });
    return;
  }
  const supabase = await createClient();
  const rows = proposals.map((p) => ({ kind: p.kind, summary: p.summary, payload: p.payload, external_ref: p.external_ref, source: "riana" }));
  const { error } = await supabase.from("riana_updates").insert(rows);
  if (error) throw new Error(`Could not add proposals: ${error.message}`);
}

/** Read every enabled doc and propose its new lines. `dryRun` reads and reports but writes nothing. */
export async function syncDocSources(v: Viewer, opts: { dryRun?: boolean } = {}): Promise<DocSyncResult> {
  requireAdmin(v);
  const drive = clientFor(v);
  const sources = (await listDocSources(v)).filter((s) => s.enabled);
  const result: DocSyncResult = { sources: [], proposed: 0 };
  const started = new Date().toISOString();

  for (const src of sources) {
    try {
      const file = await drive.getFile(src.drive_file_id);
      const text = await drive.exportText(src.drive_file_id);
      const parsed = parseDoc(text, { id: src.drive_file_id, name: file.name, modified_at: file.modifiedTime ?? null, link: file.webViewLink ?? null });
      const known = await knownRefs(v, parsed.proposals.map((p) => p.external_ref));
      const fresh = parsed.proposals.filter((p) => !known.has(p.external_ref));
      if (!opts.dryRun) {
        await insertProposals(v, fresh);
        await touchSource(v, src.id, { last_synced_at: started, last_modified_at: file.modifiedTime ?? null, last_proposed: fresh.length, last_error: null });
      }
      result.proposed += fresh.length;
      result.sources.push({
        id: src.id, name: src.name, ok: true, modified_at: file.modifiedTime ?? null, headings: parsed.headings,
        proposed: fresh.length, already: parsed.proposals.length - fresh.length, skipped: parsed.skipped,
        preview: fresh.slice(0, 25).map((p) => ({ kind: p.kind, summary: p.summary })),
      });
    } catch (e) {
      const error = (e as Error).message;
      if (!opts.dryRun) await touchSource(v, src.id, { last_synced_at: started, last_error: error });
      result.sources.push({ id: src.id, name: src.name, ok: false, error, modified_at: null, headings: [], proposed: 0, already: 0, skipped: 0, preview: [] });
    }
  }
  await recordRun(v, result, opts.dryRun ? "dry_run" : "riana_doc", started);
  return result;
}

async function touchSource(v: Viewer, id: string, patch: Partial<Pick<DocSource, "last_synced_at" | "last_modified_at" | "last_proposed" | "last_error">>) {
  if (v.demo) { const s = demo().sources.find((x) => x.id === id); if (s) Object.assign(s, patch); return; }
  const supabase = await createClient();
  await supabase.from("riana_doc_sources").update(patch).eq("id", id);
}

async function recordRun(v: Viewer, result: DocSyncResult, mode: "dry_run" | "riana_doc", started: string) {
  if (v.demo) return;
  const supabase = await createClient();
  const summary = { docs: result.sources.length, failed: result.sources.filter((s) => !s.ok).length, proposed: result.proposed, already: result.sources.reduce((n, s) => n + s.already, 0) };
  const report = result.sources.map((s) => ({ name: s.name, ok: s.ok, error: s.error ?? null, proposed: s.proposed, already: s.already, headings: s.headings }));
  await supabase.from("drive_sync_runs").insert({ mode, started_by: v.id, started_at: started, finished_at: new Date().toISOString(), ok: result.sources.every((s) => s.ok), summary, report, error: result.sources.find((s) => !s.ok)?.error ?? null });
}
