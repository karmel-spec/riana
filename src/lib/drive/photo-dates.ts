// When was a photo taken? Three sources, in order of trust:
//   1. EXIF DateTimeOriginal, which Drive exposes as imageMediaMetadata.time ("2019:07:04 15:20:00").
//   2. The Google Takeout sidecar JSON next to the file ("IMG_0001.jpg.json" or
//      "IMG_0001.jpg.supplemental-metadata.json") with photoTakenTime.timestamp.
//   3. The Drive modified time (last resort; it's the upload date, not the photo date).
// No server-only import, so unit tests can load this file.

/** "2019:07:04 15:20:00" (EXIF) or an ISO string → ISO 8601, or null if unreadable. */
export function exifToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s.trim());
  if (m) {
    if (m[1] === "0000") return null;
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;   // local time of the camera; no zone known
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Parse a Takeout sidecar. Returns ISO time or null. */
export function sidecarTakenAt(json: string): string | null {
  try {
    const o = JSON.parse(json) as { photoTakenTime?: { timestamp?: string }; creationTime?: { timestamp?: string } };
    const ts = o.photoTakenTime?.timestamp ?? o.creationTime?.timestamp;
    if (!ts || !/^\d+$/.test(ts)) return null;
    return new Date(Number(ts) * 1000).toISOString();
  } catch { return null; }
}

/** Is `candidate` the Takeout sidecar for `photoName`? */
export function isSidecarFor(photoName: string, candidate: string): boolean {
  const p = photoName.toLowerCase(), c = candidate.toLowerCase();
  if (!c.endsWith(".json")) return false;
  if (c === `${p}.json` || c === `${p}.supplemental-metadata.json`) return true;
  // Takeout truncates long names: "a-very-long-name.jpg.supplemental-metad.json"
  return c.startsWith(p + ".") && c.length <= p.length + 32;
}

/** Hash key used to spot the same photo under a different name. */
export const hashKey = (md5: string, size: number | null) => `${md5}|${size ?? ""}`;
