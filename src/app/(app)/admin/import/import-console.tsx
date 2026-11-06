"use client";

import { useState, useTransition } from "react";
import type { DriveSetup, ImportedFileRow, SyncRunRow } from "@/lib/drive/service";
import type { FolderStatus, SyncReport } from "@/lib/drive/sync";
import { reviewFile, runAccessCheck, runApply, runDryRun } from "@/app/actions/drive";
import { SECTION_LABELS } from "@/lib/permissions";
import { fmtDate, fmtTime } from "@/lib/format";
import { Alert, Check, Lock } from "@/components/icons";

type Manifest = { key: string; name: string; sensitivity: string; hasId: boolean; parent: string | null; notes: string | null };
type Props = { setup: DriveSetup; manifest: Manifest[]; folders: FolderStatus[] | null; files: ImportedFileRow[]; runs: SyncRunRow[] };

const ACTION: Record<string, [string, string]> = {
  create: ["New", "bg-evergreen-tint text-evergreen"], update: ["Changed", "bg-brass-tint text-brass-deep"], unchanged: ["Same", "bg-rule-soft text-ink-soft"],
  duplicate: ["Duplicate", "bg-slate-tint text-slate"], exclude: ["Excluded", "bg-ember-tint text-ember"], unmatched: ["Needs a rule", "bg-brass-tint text-brass-deep"],
};
const fmtSize = (n: number | null) => n === null ? "—" : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;

export function ImportConsole({ setup, manifest, folders: initialFolders, files, runs }: Props) {
  const [pending, start] = useTransition();
  const [folders, setFolders] = useState<FolderStatus[] | null>(initialFolders);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const act = (fn: () => Promise<{ ok: true; data?: unknown } | { ok: false; error: string }>, onData?: (d: unknown) => void) =>
    start(async () => { setError(""); const r = await fn(); if (!r.ok) setError(r.error); else onData?.(r.data); });

  const unreadable = folders?.filter((f) => !f.readable) ?? [];
  const pendingFiles = files.filter((f) => f.review_status === "pending");
  const shown = report?.entries.filter((e) => filter === "all" || e.action === filter) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Connection */}
      <section className={`rounded-2xl border px-5 py-4 ${setup.mode === "real" ? "border-evergreen-mid bg-evergreen-tint/50" : "border-brass-deep/40 bg-brass-tint"}`}>
        {setup.mode === "real" ? (
          <p><strong>Connected to Google Drive</strong> as <code className="rounded bg-paper px-1.5 py-0.5 text-[0.9rem]">{setup.serviceAccount}</code>. Share each folder below with that address (Viewer) and run the access check.</p>
        ) : (
          <p><strong>No Google service account yet.</strong> Everything below runs against a stand-in Drive with fake file names, so you can see how the import will behave. To connect the real folders, follow <code>docs/DRIVE_IMPORT.md</code>.</p>
        )}
      </section>

      {/* Folder access */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[1.3rem] font-semibold">Folders the app expects to read</h2>
            <p className="text-[0.95rem] text-ink-soft">{folders ? `Last checked: ${unreadable.length === 0 ? "all readable" : `${unreadable.length} not readable`}` : "Not checked yet."}</p>
          </div>
          <button type="button" disabled={pending} onClick={() => act(runAccessCheck, (d) => setFolders(d as FolderStatus[]))} className="btn-secondary">{pending ? "Checking…" : "Check access now"}</button>
        </div>
        {unreadable.length > 0 && (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-ember-tint px-4 py-3 text-ember">
            <Alert className="mt-0.5 shrink-0" />
            <div><strong>{unreadable.length} folder{unreadable.length > 1 ? "s" : ""} can’t be read.</strong> Share them with the service account (Viewer only) or fix the link, then check again. Files in them are skipped until then.</div>
          </div>
        )}
        <ul className="mt-4 divide-y divide-rule-soft">
          {manifest.map((m) => {
            const st = folders?.find((f) => f.key === m.key);
            return (
              <li key={m.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    {m.parent && <span className="text-ink-soft">↳</span>}{m.name}
                    {m.sensitivity === "admin_only" && <span className="pill bg-ember-tint text-ember"><Lock size={12} /> admin-only</span>}
                  </div>
                  <div className="text-[0.85rem] text-ink-soft">{m.notes ?? (m.parent ? `Subfolder of ${manifest.find((x) => x.key === m.parent)?.name}` : "")}{st?.error && <span className="text-ember"> · {st.error}</span>}</div>
                </div>
                {st ? (st.readable ? <span className="pill bg-evergreen-tint text-evergreen"><Check size={12} /> Readable</span> : <span className="pill bg-ember-tint text-ember">Not readable</span>)
                    : <span className="pill bg-rule-soft text-ink-soft">Unchecked</span>}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Sync */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[1.3rem] font-semibold">Sync</h2>
            <p className="text-[0.95rem] text-ink-soft">A dry run lists every file and where it would go, changing nothing. Apply records the pointers; re-running later only picks up new or changed files.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => act(runDryRun, (d) => setReport(d as SyncReport))} className="btn-secondary">{pending ? "Working…" : "Dry run"}</button>
            <button type="button" disabled={pending || !report} onClick={() => act(runApply, (d) => setReport(d as SyncReport))} className="btn-primary" title={report ? "" : "Run a dry run first"}>Apply</button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-xl bg-ember-tint px-4 py-3 text-ember">{error}</p>}

        {report && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "create", "update", "unchanged", "duplicate", "unmatched", "exclude"] as const).map((k) => {
                const n = k === "all" ? report.entries.length : report.counts[k];
                return <button key={k} type="button" onClick={() => setFilter(k)} className={`pill min-h-[36px] px-3 ${filter === k ? "bg-ink text-paper" : ACTION[k]?.[1] ?? "bg-rule-soft text-ink-soft"}`}>{k === "all" ? "All" : ACTION[k][0]} · {n}</button>;
              })}
            </div>
            <p className="mt-2 text-[0.9rem] text-ink-soft">{report.mode === "apply" ? "Applied." : "Dry run."} {report.counts.create} new, {report.counts.update} changed, {report.counts.unchanged} unchanged, {report.counts.duplicate} duplicates, {report.counts.unmatched} without a rule, {report.counts.exclude} excluded. Folders unreadable: {report.folders.filter((f) => !f.readable).length}.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-[0.9rem]">
                <thead className="text-left text-[0.75rem] uppercase tracking-wide text-ink-soft"><tr><th className="py-2 pr-3">File</th><th className="py-2 pr-3">Folder</th><th className="py-2 pr-3">Goes to</th><th className="py-2 pr-3">Size</th><th className="py-2 pr-3">Result</th></tr></thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.driveFileId} className="border-t border-rule-soft">
                      <td className="py-2 pr-3 font-semibold">{e.name}{e.sensitivity === "admin_only" && <Lock size={14} className="ml-1 inline text-ember" />}</td>
                      <td className="py-2 pr-3 text-ink-soft">{e.folderName}</td>
                      <td className="py-2 pr-3">{SECTION_LABELS[e.target]}<div className="text-[0.8rem] text-ink-soft">{e.note}</div></td>
                      <td className="whitespace-nowrap py-2 pr-3 text-ink-soft">{fmtSize(e.size)}</td>
                      <td className="py-2 pr-3"><span className={`pill ${ACTION[e.action][1]}`}>{ACTION[e.action][0]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Review queue */}
      <section className="card">
        <h2 className="text-[1.3rem] font-semibold">Waiting for review ({pendingFiles.length})</h2>
        <p className="mb-3 text-[0.95rem] text-ink-soft">Approving a normal file makes it visible to everyone who can see its section. Admin-only files (taxes, the Widow Book, contact lists) stay here for admins even when approved.</p>
        {pendingFiles.length === 0 ? <p className="text-ink-soft">Nothing waiting.</p> : (
          <ul className="divide-y divide-rule-soft">
            {pendingFiles.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="font-semibold">{f.name}{f.sensitivity === "admin_only" && <span className="pill ml-2 bg-ember-tint text-ember">admin-only</span>}{f.duplicate_of && <span className="pill ml-2 bg-slate-tint text-slate">duplicate</span>}</div>
                  <div className="text-[0.85rem] text-ink-soft">{SECTION_LABELS[f.target_section]}{f.target_note && ` · ${f.target_note}`} · {fmtSize(f.size_bytes)}{f.web_view_link && <> · <a href={f.web_view_link} target="_blank" rel="noreferrer">Open in Drive</a></>}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => act(() => reviewFile(f.id, "approved"))} className="btn-primary px-4 text-[0.9rem]">Approve</button>
                  <button type="button" disabled={pending} onClick={() => act(() => reviewFile(f.id, "rejected"))} className="btn-secondary px-4 text-[0.9rem]">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Runs */}
      {runs.length > 0 && (
        <section className="card">
          <h2 className="text-[1.2rem] font-semibold">Recent runs</h2>
          <ul className="mt-2 divide-y divide-rule-soft text-[0.9rem]">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span><strong>{r.mode === "dry_run" ? "Dry run" : r.mode === "apply" ? "Apply" : "Access check"}</strong> · {fmtDate(r.started_at)} {fmtTime(r.started_at)}</span>
                <span className={r.ok === false ? "text-ember" : "text-ink-soft"}>{r.error ?? Object.entries(r.summary).map(([k, n]) => `${n} ${k}`).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
