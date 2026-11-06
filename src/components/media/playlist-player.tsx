"use client";

import { useEffect, useRef, useState } from "react";

export type Track = { id: string; title: string; src: string; duration: number | null };

/**
 * Big-button player for the iPad: one track at a time, continuous play,
 * previous / play-pause / next, and the list to tap any song. The browser
 * fetches audio with Range requests, so a track starts without downloading
 * the whole file.
 */
export function PlaylistPlayer({ tracks, title }: { tracks: Track[]; title: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const cur = tracks[i];

  useEffect(() => {
    const a = audio.current; if (!a || !cur) return;
    a.src = cur.src; a.load();
    if (playing) a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const go = (n: number) => { if (!tracks.length) return; setI(((n % tracks.length) + tracks.length) % tracks.length); setT(0); };
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}); } else { a.pause(); setPlaying(false); } };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  if (!tracks.length) return <p className="text-ink-soft">No songs yet. They arrive from the Sing-A-Long folder once imported and approved.</p>;

  return (
    <div className="flex flex-col gap-5">
      <audio ref={audio} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onEnded={() => { if (i < tracks.length - 1) { setI(i + 1); setT(0); } else setPlaying(false); }} />

      <div className="on-dark rounded-3xl bg-evergreen p-6 text-paper sm:p-8">
        <div className="eyebrow text-brass">{title} · {i + 1} of {tracks.length}</div>
        <div className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight sm:text-[2.2rem]">{cur.title}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-evergreen-deep"><div className="h-2 bg-brass" style={{ width: `${dur ? (t / dur) * 100 : 0}%` }} /></div>
        <div className="mt-1 flex justify-between text-[0.9rem] text-mist"><span>{fmt(t)}</span><span>{dur ? fmt(dur) : "—"}</span></div>
        <div className="mt-5 flex items-center justify-center gap-5">
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous song" className="flex h-16 w-16 items-center justify-center rounded-full bg-evergreen-deep text-paper">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="flex h-24 w-24 items-center justify-center rounded-full bg-paper text-evergreen shadow-lg">
            {playing ? <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
                     : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next song" className="flex h-16 w-16 items-center justify-center rounded-full bg-evergreen-deep text-paper">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" /></svg>
          </button>
        </div>
      </div>

      <ol className="divide-y divide-rule-soft rounded-2xl border border-rule bg-paper">
        {tracks.map((tr, n) => (
          <li key={tr.id}>
            <button type="button" onClick={() => { setI(n); setT(0); setPlaying(true); }} aria-current={n === i ? "true" : undefined}
              className={`flex min-h-[60px] w-full items-center gap-4 px-5 text-left ${n === i ? "bg-evergreen-tint font-bold text-evergreen" : ""}`}>
              <span className="w-7 text-right text-ink-soft">{n + 1}</span>
              <span className="flex-1 text-[1.15rem]">{tr.title}</span>
              {tr.duration ? <span className="text-ink-soft">{fmt(tr.duration)}</span> : null}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
