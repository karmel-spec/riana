"use client";

import { useRef, useState } from "react";

/**
 * Video: the browser streams with Range requests on its own; we only give it
 * the URL, a poster, and preload="metadata" so nothing big loads up front.
 */
export function VideoPlayer({ src, poster, title, captionsSrc }: { src: string; poster?: string | null; title: string; captionsSrc?: string | null }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink">
      {!started && (
        <button type="button" onClick={() => { setStarted(true); ref.current?.play(); }} aria-label={`Play ${title}`}
          className="absolute inset-0 z-10 flex items-center justify-center bg-ink/40">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-paper text-evergreen shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}
      <video ref={ref} controls preload="metadata" playsInline poster={poster ?? undefined} className="aspect-video w-full" controlsList="nodownload" onPlay={() => setStarted(true)}>
        <source src={src} />
        {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="en" label="English" />}
        Your browser can’t play this video.
      </video>
    </div>
  );
}

export function AudioPlayer({ src, title }: { src: string; title: string }) {
  return <audio controls preload="metadata" src={src} aria-label={title} className="w-full" controlsList="nodownload" />;
}
