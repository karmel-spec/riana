"use client";

import { useState } from "react";

/**
 * The first page of a Drive file (a PDF's cover, or the image itself) as a
 * thumbnail. Nothing is copied: Google renders it from the file. If the file
 * is not shared widely enough for the thumbnail to load, the box disappears.
 */
export function DriveCover({ fileId, alt, width = 112 }: { fileId: string; alt: string; width?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://drive.google.com/thumbnail?id=${fileId}&sz=w${width * 2}`}
      alt={alt}
      width={width}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-lg border border-rule bg-parchment object-cover shadow-sm"
      style={{ width, height: "auto" }}
    />
  );
}
