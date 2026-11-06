"use client";

import { useActionState, useState, useTransition } from "react";
import type { MediaItem } from "@/lib/types";
import { saveMediaItem, syncMedia } from "@/app/actions/media";
import { FormDialog, Field } from "@/components/dialog";

export function SyncMediaButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await syncMedia(); setMsg(r.ok ? `${r.data!.created} added, ${r.data!.tracksAdded} songs on the playlist` : r.error); })} className="btn-secondary">{pending ? "Syncing…" : "Sync media"}</button>
      {msg && <span className="text-[0.85rem] text-ink-soft">{msg}</span>}
    </span>
  );
}

export function MediaEditor({ item }: { item: MediaItem }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveMediaItem, null);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setOpen(false); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 text-[0.9rem]">Edit</button>;
  return (
    <FormDialog title={`Edit: ${item.title ?? "media"}`} close={() => setOpen(false)} action={action} pending={pending} error={state && !state.ok ? state.error : undefined}>
      <input type="hidden" name="id" value={item.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="me-title" label="Title" span><input id="me-title" name="title" defaultValue={item.title ?? ""} className="field" /></Field>
        <Field id="me-caption" label="Caption" span><input id="me-caption" name="caption" defaultValue={item.caption ?? ""} className="field" /></Field>
        <Field id="me-date" label="Date"><input id="me-date" type="date" name="taken_on" defaultValue={item.taken_on ?? ""} className="field" /></Field>
        <Field id="me-cat" label="Category"><select id="me-cat" name="category" defaultValue={item.category ?? "memory"} className="field"><option value="memory">Memory</option><option value="church">Church</option><option value="music">Music</option><option value="event">Event</option><option value="document">Document</option><option value="other">Other</option></select></Field>
        <Field id="me-event" label="Event"><input id="me-event" name="event_name" defaultValue={item.event_name ?? ""} className="field" placeholder="Wedding, 50th anniversary…" /></Field>
        <Field id="me-people" label="People (comma-separated)"><input id="me-people" name="people_tags" defaultValue={item.people_tags.join(", ")} className="field" /></Field>
        <Field id="me-by" label="Recorded by"><input id="me-by" name="recorded_by" defaultValue={item.recorded_by ?? ""} className="field" /></Field>
        <Field id="me-story" label="The story behind it" span><textarea id="me-story" name="story" rows={3} defaultValue={item.story ?? ""} className="field" /></Field>
        <Field id="me-tr" label="Transcript (optional, for later)" span><textarea id="me-tr" name="transcript" rows={3} defaultValue={item.transcript ?? ""} className="field" /></Field>
      </div>
    </FormDialog>
  );
}
