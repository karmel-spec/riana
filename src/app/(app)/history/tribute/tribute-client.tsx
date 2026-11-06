"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TributeBlock, TributePage } from "@/lib/types";
import { moveBlock, removeBlock, saveBlock, saveTribute, setTributeStatus, shareTributeWithLists } from "@/app/actions/media";
import { FormDialog, Field } from "@/components/dialog";

type MediaOpt = { id: string; kind: string; title: string; file: string | null };
type ListOpt = { id: string; name: string; count: number };
const KIND_LABEL: Record<TributeBlock["kind"], string> = { heading: "Heading", text: "Paragraph", media: "One video or song", gallery: "Photo gallery", story: "A story", service: "Service details" };

export function NewTributeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveTribute, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok && state.data) { setOpen(false); router.push(`/history/tribute/${state.data.id}`); } }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">+ New tribute page</button>;
  return <PageForm close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined} />;
}

function PageForm({ page, close, action, pending, error }: { page?: TributePage; close: () => void; action: (f: FormData) => void; pending: boolean; error?: string }) {
  return (
    <FormDialog title={page ? "Edit page details" : "New tribute page"} close={close} action={action} pending={pending} error={error}>
      {page && <input type="hidden" name="id" value={page.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tp-title" label="Title"><input id="tp-title" name="title" defaultValue={page?.title ?? ""} required className="field" placeholder="Celebrating Dad" /></Field>
        <Field id="tp-slug" label="Link name"><input id="tp-slug" name="slug" defaultValue={page?.slug ?? ""} required pattern="[a-z0-9-]{2,60}" className="field font-mono" placeholder="dad" /></Field>
        <Field id="tp-sub" label="Subtitle" span><input id="tp-sub" name="subtitle" defaultValue={page?.subtitle ?? ""} className="field" placeholder="1944 – 2026" /></Field>
        <Field id="tp-intro" label="Introduction" span><textarea id="tp-intro" name="intro" rows={3} defaultValue={page?.intro ?? ""} className="field" /></Field>
        <Field id="tp-obit" label="Obituary" span><textarea id="tp-obit" name="obituary" rows={6} defaultValue={page?.obituary ?? ""} className="field" /></Field>
        <Field id="tp-when" label="Service · when"><input id="tp-when" name="service_when" defaultValue={page?.service?.when ?? ""} className="field" /></Field>
        <Field id="tp-where" label="Service · where"><input id="tp-where" name="service_where" defaultValue={page?.service?.where ?? ""} className="field" /></Field>
        <Field id="tp-addr" label="Address" span><input id="tp-addr" name="service_address" defaultValue={page?.service?.address ?? ""} className="field" /></Field>
        <Field id="tp-notes" label="Service notes"><input id="tp-notes" name="service_notes" defaultValue={page?.service?.notes ?? ""} className="field" placeholder="Luncheon to follow" /></Field>
        <Field id="tp-live" label="Livestream link"><input id="tp-live" name="service_livestream_url" defaultValue={page?.service?.livestream_url ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}

export function TributeBuilder({ page, blocks, media, lists, origin }: { page: TributePage; blocks: TributeBlock[]; media: MediaOpt[]; lists: ListOpt[]; origin: string }) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<TributeBlock | "new" | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [pageState, pageAction, pagePending] = useActionState(saveTribute, null);
  const [lastPage, setLastPage] = useState(pageState);
  if (pageState !== lastPage) { setLastPage(pageState); if (pageState?.ok) setEditing(false); }
  const [blockState, blockAction, blockPending] = useActionState(saveBlock, null);
  const [lastBlock, setLastBlock] = useState(blockState);
  if (blockState !== lastBlock) { setLastBlock(blockState); if (blockState?.ok) setAdding(null); }
  const [selected, setSelected] = useState<string[]>(page.shared_list_ids);
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const link = page.share_token ? `${base}/tribute/${page.slug}?t=${page.share_token}` : null;
  const mediaTitle = (id: string | null) => media.find((m) => m.id === id)?.title ?? "(missing)";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-4">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[1.3rem] font-semibold">Page details</h2>
            <button type="button" onClick={() => setEditing(true)} className="btn-secondary px-4 text-[0.95rem]">Edit details</button>
          </div>
          <p className="mt-2 text-ink-soft">{page.intro ?? <span className="italic">No introduction yet.</span>}</p>
          {page.obituary && <p className="mt-2 whitespace-pre-line text-[0.95rem]">{page.obituary}</p>}
          {(page.service?.when || page.service?.where) && <p className="mt-2 text-[0.95rem]"><strong>Service:</strong> {[page.service.when, page.service.where, page.service.address].filter(Boolean).join(" · ")}{page.service.notes && ` — ${page.service.notes}`}</p>}
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[1.3rem] font-semibold">Page content ({blocks.length} blocks)</h2>
            <button type="button" onClick={() => setAdding("new")} className="btn-primary px-4 text-[0.95rem]">+ Add a block</button>
          </div>
          {blocks.length === 0 ? <p className="mt-2 text-ink-soft">Add headings, paragraphs, a video or song, a photo gallery, a story, or the service details. Drag isn’t needed: use the arrows.</p> : (
            <ol className="mt-3 divide-y divide-rule-soft">
              {blocks.map((b, i) => (
                <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="eyebrow">{KIND_LABEL[b.kind]}</div>
                    <div className="truncate">{b.kind === "media" ? mediaTitle(b.media_item_id) : b.kind === "gallery" ? `${b.media_item_ids.length} photos` : b.kind === "service" ? "From the page details" : (b.text ?? "")}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0 || pending} onClick={() => start(() => { moveBlock(page.id, b.id, -1); })} className="btn px-2 text-ink-soft">↑</button>
                    <button type="button" aria-label="Move down" disabled={i === blocks.length - 1 || pending} onClick={() => start(() => { moveBlock(page.id, b.id, 1); })} className="btn px-2 text-ink-soft">↓</button>
                    <button type="button" onClick={() => setAdding(b)} className="btn-secondary px-3 text-[0.9rem]">Edit</button>
                    <button type="button" aria-label="Remove block" onClick={() => start(() => { removeBlock(page.id, b.id); })} className="btn px-2 text-ember">×</button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="card">
          <h2 className="text-[1.2rem] font-semibold">Status</h2>
          <p className="mt-1"><span className={`pill ${page.status === "published" ? "bg-evergreen-tint text-evergreen" : "bg-rule-soft text-ink-soft"}`}>{page.status}</span></p>
          {link ? (
            <>
              <p className="mt-3 text-[0.9rem] text-ink-soft">Anyone with this link can view the page. Keep it to the people you choose.</p>
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="field mt-2 font-mono text-[0.8rem]" aria-label="Share link" />
              <div className="mt-2 flex gap-2">
                <a href={link} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Preview</a>
                <button type="button" disabled={pending} onClick={() => start(async () => { const r = await setTributeStatus(page.id, "unpublished"); setMsg(r.ok ? "Unpublished. The link no longer works." : r.error); })} className="btn px-3 text-[0.95rem] text-ember">Unpublish</button>
              </div>
            </>
          ) : (
            <button type="button" disabled={pending} onClick={() => start(async () => { const r = await setTributeStatus(page.id, "published"); setMsg(r.ok ? "Published. The share link is ready." : r.error); })} className="btn-primary mt-3 w-full">Publish privately</button>
          )}
          {msg && <p className="mt-2 text-[0.9rem] text-ink-soft">{msg}</p>}
        </div>

        <div className="card">
          <h2 className="text-[1.2rem] font-semibold">Share with</h2>
          <p className="mt-1 text-[0.9rem] text-ink-soft">Choose the notification lists. The link is included in the message when you send to them from Who to Notify.</p>
          <ul className="mt-2 flex flex-col gap-1">
            {lists.map((l) => (
              <li key={l.id}><label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={selected.includes(l.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, l.id] : selected.filter((x) => x !== l.id))} className="h-5 w-5 accent-evergreen" /> {l.name} <span className="text-[0.85rem] text-ink-soft">· {l.count}</span></label></li>
            ))}
          </ul>
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await shareTributeWithLists(page.id, selected); setMsg(r.ok ? "Saved who to share with." : r.error); })} className="btn-secondary mt-2 w-full">Save</button>
        </div>
      </aside>

      {editing && <PageForm page={page} close={() => setEditing(false)} action={pageAction} pending={pagePending} error={pageState && !pageState.ok ? pageState.error : undefined} />}
      {adding && (
        <BlockForm page={page} block={adding === "new" ? undefined : adding} media={media} close={() => setAdding(null)} action={blockAction} pending={blockPending} error={blockState && !blockState.ok ? blockState.error : undefined} />
      )}
    </div>
  );
}

function BlockForm({ page, block, media, close, action, pending, error }: { page: TributePage; block?: TributeBlock; media: MediaOpt[]; close: () => void; action: (f: FormData) => void; pending: boolean; error?: string }) {
  const [kind, setKind] = useState<TributeBlock["kind"]>(block?.kind ?? "text");
  const [gallery, setGallery] = useState<string[]>(block?.media_item_ids ?? []);
  const photos = media.filter((m) => m.kind === "photo");
  const av = media.filter((m) => m.kind !== "photo");
  return (
    <FormDialog title={block ? "Edit block" : "Add a block"} close={close} action={action} pending={pending} error={error}>
      <input type="hidden" name="page_id" value={page.id} />
      {block && <input type="hidden" name="id" value={block.id} />}
      <input type="hidden" name="media_item_ids" value={gallery.join(",")} />
      <Field id="bk-kind" label="Kind"><select id="bk-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as TributeBlock["kind"])} className="field">{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      {(kind === "heading" || kind === "text" || kind === "story") && <Field id="bk-text" label={kind === "heading" ? "Heading" : "Text"}><textarea id="bk-text" name="text" rows={kind === "heading" ? 1 : 5} defaultValue={block?.text ?? ""} className="field" /></Field>}
      {kind === "media" && <Field id="bk-media" label="Video or song"><select id="bk-media" name="media_item_id" defaultValue={block?.media_item_id ?? ""} className="field"><option value="">—</option>{av.map((m) => <option key={m.id} value={m.id}>{m.title} ({m.kind.replace("_story", "")})</option>)}</select></Field>}
      {kind === "media" && <Field id="bk-cap" label="Caption"><input id="bk-cap" name="text" defaultValue={block?.text ?? ""} className="field" /></Field>}
      {kind === "gallery" && (
        <div>
          <div className="label">Photos ({gallery.length} chosen)</div>
          {photos.length === 0 ? <p className="text-ink-soft">No approved photos yet.</p> : (
            <ul className="grid max-h-56 grid-cols-3 gap-2 overflow-auto">
              {photos.map((m) => (
                <li key={m.id}><label className={`block cursor-pointer overflow-hidden rounded-lg border-2 ${gallery.includes(m.id) ? "border-evergreen" : "border-transparent"}`}>
                  <input type="checkbox" className="sr-only" checked={gallery.includes(m.id)} onChange={(e) => setGallery(e.target.checked ? [...gallery, m.id] : gallery.filter((x) => x !== m.id))} />
                  <img src={`/api/files/${m.file}`} alt={m.title} className="aspect-square w-full object-cover" /></label></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {kind === "service" && <p className="text-ink-soft">Shows the service details from the page details (when, where, address, notes, livestream).</p>}
    </FormDialog>
  );
}
