"use client";

import { useActionState, useState, useTransition } from "react";
import type { AssetPhoto } from "@/lib/types";
import { addAssetPhoto, deleteAssetPhoto } from "@/app/actions/photos";
import { FormDialog, Field } from "@/components/dialog";
import { fmtDate } from "@/lib/format";

/** Photo links for one property or vehicle, with add and remove. Links only; nothing is uploaded. */
export function AssetPhotos({ kind, assetId, photos, canEdit, parent }: { kind: "property" | "vehicle"; assetId: string; photos: AssetPhoto[]; canEdit: boolean; parent: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addAssetPhoto, null);
  const [last, setLast] = useState(state); if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  const [removing, start] = useTransition();
  const isImage = (u: string) => /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(u) || /googleusercontent\.com/.test(u);
  if (photos.length === 0 && !canEdit) return null;
  return (
    <div className="mt-4 rounded-xl border border-rule-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="eyebrow">Photos{photos.length > 0 && ` · ${photos.length}`}</div>
        {canEdit && <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 text-[0.9rem]">+ Add a photo link</button>}
      </div>
      {photos.length === 0 ? <p className="mt-1 text-[0.95rem] text-ink-soft">No photos linked yet. Paste a Google Photos, Drive or iMemories link.</p> : (
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-rule-soft bg-paper">
              <a href={p.url} target="_blank" rel="noreferrer" className="block no-underline">
                {isImage(p.url)
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.url} alt={p.caption ?? "Photo"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  : <div className="flex aspect-[4/3] w-full items-center justify-center bg-evergreen-tint text-center text-[0.9rem] font-semibold text-evergreen">Open album or file ↗</div>}
              </a>
              <div className="flex items-start justify-between gap-2 p-2 text-[0.85rem]">
                <div className="min-w-0"><div className={`font-semibold ${parent ? "text-[1rem]" : ""}`}>{p.caption ?? "Photo"}</div><div className="text-ink-soft">{p.taken_on ? fmtDate(p.taken_on, { year: "numeric" }) : ""}{p.added_by_name && ` · ${p.added_by_name}`}</div></div>
                {canEdit && <button type="button" disabled={removing} onClick={() => { if (window.confirm("Remove this photo link?")) start(() => { deleteAssetPhoto(p.id); }); }} className="btn min-h-0 px-1 text-[0.8rem] text-ember">Remove</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <FormDialog title="Add a photo link" close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
          <input type="hidden" name="asset_kind" value={kind} /><input type="hidden" name="asset_id" value={assetId} />
          <p className="mb-3 text-[0.95rem] text-ink-soft">A direct image link shows as a thumbnail; an album or folder link shows as a button. Nothing is uploaded; the photo stays where it is.</p>
          <div className="grid gap-4">
            <Field id="ph-url" label="Link"><input id="ph-url" name="url" type="url" required inputMode="url" className="field" placeholder="https://photos.app.goo.gl/…" /></Field>
            <Field id="ph-cap" label="Caption"><input id="ph-cap" name="caption" className="field" placeholder="Front of the house, spring 2024" /></Field>
            <Field id="ph-on" label="Taken"><input id="ph-on" type="date" name="taken_on" className="field" /></Field>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
