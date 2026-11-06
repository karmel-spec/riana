"use client";

import { useState, useTransition } from "react";
import type { DocSource, DocSyncResult } from "@/lib/riana/doc-sync";
import type { DriveSetup } from "@/lib/drive/service";
import { addRianaDoc, removeRianaDoc, syncRianaDocs, toggleRianaDoc } from "@/app/actions/riana";
import { fmtDate, fmtTime } from "@/lib/format";
import { Alert } from "@/components/icons";

type Props = { setup: DriveSetup; sources: DocSource[] };

export function DocSyncPanel({ setup, sources }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<DocSyncResult | null>(null);
  const [wasDryRun, setWasDryRun] = useState(false);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  const act = (fn: () => Promise<{ ok: true; data?: unknown } | { ok: false; error: string }>, onData?: (d: unknown) => void) =>
    start(async () => { setError(""); const r = await fn(); if (!r.ok) setError(r.error); else onData?.(r.data); });

  const sync = (dryRun: boolean) => act(() => syncRianaDocs(dryRun), (d) => { setResult(d as DocSyncResult); setWasDryRun(dryRun); });
  const enabledCount = sources.filter((s) => s.enabled).length;

  return (
    <section className="card mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.2rem] font-semibold">Binder doc sync</h2>
          <p className="mt-1 text-ink-soft">
            Riana keeps her running notes in a Google Doc. The app reads it through the same read-only service account as the Drive import,
            and every new line under a heading becomes a pending update above. A line is proposed once; re-running only picks up what changed.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={pending || enabledCount === 0} onClick={() => sync(true)} className="btn-secondary">{pending ? "Reading…" : "Preview"}</button>
          <button type="button" disabled={pending || enabledCount === 0} onClick={() => sync(false)} className="btn-primary">{pending ? "Reading…" : "Sync now"}</button>
        </div>
      </div>

      {setup.mode !== "real" && (
        <p className="mt-3 rounded-xl bg-brass-tint px-4 py-2 text-[0.95rem]">
          <strong>No Google service account yet.</strong> The sync reads a stand-in sample doc so you can see how it behaves. To connect the real doc, follow <code>docs/RIANA_DRIVE_SYNC.md</code>.
        </p>
      )}

      {error && <div className="mt-3 flex items-start gap-2 rounded-xl bg-ember-tint px-4 py-3 text-ember"><Alert className="mt-0.5 shrink-0" /><div>{error}</div></div>}

      <ul className="mt-4 divide-y divide-line">
        {sources.length === 0 && <li className="py-2 text-ink-soft">No docs yet. Add the Greene Family Binder doc below.</li>}
        {sources.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
            <div>
              <span className={`font-semibold ${s.enabled ? "" : "text-ink-soft line-through"}`}>{s.name}</span>
              {s.last_error && <span className="pill ml-2 bg-ember-tint text-ember">can’t read</span>}
              <div className="text-[0.9rem] text-ink-soft">
                {s.last_synced_at ? `Last read ${fmtDate(s.last_synced_at)} ${fmtTime(s.last_synced_at)}, proposed ${s.last_proposed}` : "Never read"}
                {s.last_error ? ` · ${s.last_error}` : ""}
              </div>
            </div>
            <div className="flex gap-2 text-[0.9rem]">
              <button type="button" disabled={pending} onClick={() => act(() => toggleRianaDoc(s.id, !s.enabled))} className="btn-secondary px-3 py-1">{s.enabled ? "Pause" : "Resume"}</button>
              <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove “${s.name}” from the sync list? Updates already proposed stay in the inbox.`)) act(() => removeRianaDoc(s.id)); }} className="btn-secondary px-3 py-1">Remove</button>
            </div>
          </li>
        ))}
      </ul>

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); act(() => addRianaDoc({ name, link }), () => { setName(""); setLink(""); }); }}>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span>Name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Greene Family Binder" maxLength={120} />
        </label>
        <label className="flex min-w-[18rem] flex-1 flex-col gap-1 text-[0.9rem]">
          <span>Google Docs link (shared with the service account as Viewer)</span>
          <input className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/document/d/…/edit" required />
        </label>
        <button type="submit" disabled={pending} className="btn-secondary">Add doc</button>
      </form>

      {result && (
        <div className="mt-5 rounded-2xl border border-line px-5 py-4">
          <h3 className="font-semibold">{wasDryRun ? "Preview" : "Synced"}: {result.proposed} new update{result.proposed === 1 ? "" : "s"}{wasDryRun ? " would be proposed" : " proposed"}</h3>
          {result.sources.map((s) => (
            <div key={s.id} className="mt-3">
              <div className="text-[0.95rem]">
                <strong>{s.name}</strong>{s.ok ? (
                  <span className="text-ink-soft"> · {s.headings.length} heading{s.headings.length === 1 ? "" : "s"} · {s.proposed} new · {s.already} already in the inbox · {s.skipped} skipped{s.modified_at ? ` · doc last edited ${fmtDate(s.modified_at)}` : ""}</span>
                ) : <span className="text-ember"> · {s.error}</span>}
              </div>
              {s.ok && s.headings.length > 0 && <div className="text-[0.85rem] text-ink-soft">Headings: {s.headings.join(" · ")}</div>}
              {s.preview.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {s.preview.map((p, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[0.95rem]"><span className="pill bg-plum-tint text-plum shrink-0">{p.kind.replace("_", " ")}</span><span>{p.summary}</span></li>
                  ))}
                  {s.proposed > s.preview.length && <li className="text-[0.85rem] text-ink-soft">…and {s.proposed - s.preview.length} more</li>}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
