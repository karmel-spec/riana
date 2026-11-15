"use client";

import { useActionState, useState } from "react";
import { uploadFile } from "@/app/actions/files";

type Note = { label: string; value: string };

/**
 * "Upload" for a binder page: a photo or file goes straight into private storage under the given section.
 * `notes` are the tabs or labels the page files under; the chosen one becomes the file's note prefix.
 */
export function UploadFile({ section, notes, defaultNote, allowVault = false, label = "Upload a document", back, newTab, forceVault = false }: {
  section: string; notes?: Note[]; defaultNote?: string; allowVault?: boolean; label?: string; back?: string;
  /** Lets the uploader name a tab that does not exist yet; the note becomes prefix + name + suffix and the page grows a tab for it. */
  newTab?: { prefix: string; suffix: string };
  /** Every upload from this button is vault-only (identity documents, anything with numbers that must not spread). */
  forceVault?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(uploadFile, null);
  const [noteTag, setNoteTag] = useState(defaultNote ?? notes?.[0]?.value ?? "");
  const [extra, setExtra] = useState("");
  const [newName, setNewName] = useState("");
  const isNew = noteTag === "__new__";
  const tag = isNew && newTab ? (newName.trim() ? `${newTab.prefix}${newName.trim()}${newTab.suffix}` : "") : noteTag;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-secondary">{label}</button>;
  return (
    <form action={action} className="card mt-3 flex w-full flex-col gap-3" onSubmit={() => setTimeout(() => { if (!pending) setOpen(true); }, 0)}>
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="back" value={back ?? ""} />
      {forceVault && <input type="hidden" name="vault" value="on" />}
      <input type="hidden" name="note" value={[tag, extra.trim()].filter(Boolean).join(" ")} />
      <div className="font-semibold">{label}</div>
      <label className="label">Photo or file (a phone photo of the page is fine)
        <input type="file" name="file" required accept="image/*,application/pdf,.doc,.docx,audio/*,video/*" capture="environment" className="field mt-1" />
      </label>
      {notes && notes.length > 0 && (
        <label className="label">Files under
          <select value={noteTag} onChange={(e) => setNoteTag(e.target.value)} className="field mt-1">{notes.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}{newTab && <option value="__new__">New tab…</option>}</select>
        </label>
      )}
      {isNew && newTab && (
        <label className="label">Name of the new tab
          <input value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={40} placeholder="e.g. Property Tax" className="field mt-1" />
        </label>
      )}
      <label className="label">What it is (one line)
        <input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={200} placeholder="e.g. Navy Federal statement, July 2026" className="field mt-1" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="label">Date on the document <input type="date" name="taken_on" className="field mt-1" /></label>
        {forceVault ? <span className="text-[0.9rem] text-ink-soft">Vault only: super admins can open it; nobody else sees it exists.</span> : allowVault && <label className="flex items-center gap-2 text-[0.95rem]"><input type="checkbox" name="vault" /> Vault only (contains passwords, account numbers or codes)</label>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || (isNew && !newName.trim())} className="btn-primary">{pending ? "Uploading…" : "Upload"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Close</button>
        {state && (state.ok ? <span className="text-[0.9rem] text-evergreen">Filed. It is on the page now.</span> : <span className="text-[0.9rem] text-ember">{state.error}</span>)}
      </div>
    </form>
  );
}
