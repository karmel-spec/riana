"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Close, Pause, Play } from "@/components/icons";
import { photoGroups, type SlidePhoto } from "@/lib/files/slideshow";

const SECONDS = 6;

/** The "Play slideshow" card on the Photos page: pick all photos or one group, then play them full screen. */
export function Slideshow({ photos, big }: { photos: SlidePhoto[]; big: boolean }) {
  const groups = useMemo(() => photoGroups(photos), [photos]);
  const [group, setGroup] = useState("");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const list = useMemo(() => (group ? photos.filter((p) => p.group === group) : photos), [photos, group]);

  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setOpen(true)} className={`btn-primary ${big ? "min-h-[72px] px-8 text-[1.4rem]" : "min-h-[56px] px-6 text-[1.15rem]"}`}>
        <Play size={big ? 30 : 24} /> Play slideshow
      </button>
      {groups.length > 1 && (
        <label className="flex items-center gap-2"><span className="sr-only">Which photos</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={`field w-auto ${big ? "min-h-[56px] text-[1.15rem]" : ""}`}>
            <option value="">All photos ({photos.length})</option>
            {groups.map((g) => <option key={g.name} value={g.name}>{g.name} ({g.count})</option>)}
          </select>
        </label>
      )}
      {groups.length <= 1 && <span className="text-ink-soft">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>}
      {open && <Player photos={list} big={big} close={close} />}
    </div>
  );
}

/**
 * The full-screen player. It asks the browser for real full screen; where that is not allowed (iPhone Safari)
 * the fixed black overlay covers the page instead, so it behaves the same either way.
 */
function Player({ photos, big, close }: { photos: SlidePhoto[]; big: boolean; close: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const [at, setAt] = useState({ i: 0, prev: -1 });
  const [playing, setPlaying] = useState(true);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const n = photos.length;
  const photo = photos[at.i];
  const ready = loaded === photo.id;
  const allFailed = failed.length >= n;

  const go = useCallback((step: number) => setAt((a) => ({ i: (a.i + step + n) % n, prev: a.i })), [n]);
  const shut = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    close();
  }, [close]);

  // Real full screen where the browser has it; leaving it (Esc, or the browser's own button) closes the player.
  useEffect(() => {
    const el = frame.current;
    el?.requestFullscreen?.().catch(() => {});
    const onChange = () => { if (!document.fullscreenElement) close(); };
    document.addEventListener("fullscreenchange", onChange);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("fullscreenchange", onChange); document.body.style.overflow = scroll; };
  }, [close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "Escape") shut();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, shut]);

  // The clock for a photo starts once it is on screen, so a slow one still gets its full time.
  useEffect(() => {
    if (!playing || !ready || n < 2) return;
    const t = window.setTimeout(() => go(1), SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, [playing, ready, go, n, at.i]);

  const btn = `flex items-center justify-center gap-2 rounded-2xl bg-white/15 font-semibold text-white backdrop-blur hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${big ? "min-h-[84px] min-w-[84px] px-6 text-[1.4rem]" : "min-h-[64px] min-w-[64px] px-5 text-[1.1rem]"}`;
  const icon = big ? 40 : 30;
  const shown = [at.prev, at.i].filter((x, k, a) => x >= 0 && a.indexOf(x) === k).map((x) => photos[x]);
  const year = photo.taken_at ? new Date(photo.taken_at).getFullYear() : null;

  return createPortal(
    <div ref={frame} role="dialog" aria-modal="true" aria-label="Photo slideshow" className="fixed inset-0 z-[100] select-none bg-black text-white"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}>
      {allFailed ? (
        <div className="flex h-full items-center justify-center px-8 text-center text-[1.3rem]">These photos could not be opened. Close the slideshow and try again in a minute.</div>
      ) : shown.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element -- private signed links from /files/[id]; the image optimizer cannot fetch them
        <img key={p.id} src={`/files/${p.id}`} alt={p.caption ?? "Family photo"} draggable={false}
          onLoad={() => { if (p.id === photo.id) setLoaded(p.id); }}
          onError={() => { if (p.id === photo.id) { setFailed((f) => (f.includes(p.id) ? f : [...f, p.id])); if (failed.length + 1 < n) go(1); } }}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 ease-in-out ${(p.id === photo.id) === ready ? "opacity-100" : "opacity-0"}`} />
      ))}
      {!ready && !allFailed && at.prev < 0 && <div className="absolute inset-0 flex items-center justify-center text-[1.2rem] text-white/70" aria-live="polite">Loading photo…</div>}

      <button type="button" onClick={shut} className={`${btn} absolute right-4 top-4 bg-white/25`} style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <Close size={icon} /> Close
      </button>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {(photo.caption || year) && <div className={`max-w-[60ch] text-center ${big ? "text-[1.5rem]" : "text-[1.2rem]"}`}>{photo.caption}{photo.caption && year ? " · " : ""}{year}</div>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => go(-1)} disabled={n < 2} aria-label="Previous photo" className={`${btn} disabled:opacity-40`}><ChevronLeft size={icon} /></button>
          <button type="button" onClick={() => setPlaying((p) => !p)} disabled={n < 2} className={`${btn} disabled:opacity-40 ${big ? "min-w-[180px]" : "min-w-[140px]"}`}>
            {playing ? <><Pause size={icon} /> Pause</> : <><Play size={icon} /> Play</>}
          </button>
          <button type="button" onClick={() => go(1)} disabled={n < 2} aria-label="Next photo" className={`${btn} disabled:opacity-40`}><ChevronRight size={icon} /></button>
        </div>
        <div className="text-[0.95rem] text-white/75" aria-live="polite">{at.i + 1} of {n}</div>
      </div>
    </div>,
    document.body,
  );
}
