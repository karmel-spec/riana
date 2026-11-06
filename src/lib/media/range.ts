// HTTP Range helpers shared by the file routes and the fake Drive.
// Only the common single-range form ("bytes=start-end", "bytes=start-", "bytes=-suffix") is supported.

export type ByteRange = { start: number; end: number } | null;

/** Parse a Range header against a known total size. Returns null when absent or unsatisfiable. */
export function parseRange(header: string | null | undefined, size: number): ByteRange {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || size <= 0) return null;
  const [, a, b] = m;
  let start: number, end: number;
  if (a === "" && b === "") return null;
  if (a === "") { const suffix = Number(b); if (suffix <= 0) return null; start = Math.max(0, size - suffix); end = size - 1; }
  else { start = Number(a); end = b === "" ? size - 1 : Math.min(Number(b), size - 1); }
  if (start > end || start >= size) return null;
  return { start, end };
}

/** Headers for a 206 Partial Content response. */
export function partialHeaders(range: { start: number; end: number }, size: number, contentType: string): Record<string, string> {
  return {
    "content-type": contentType,
    "content-length": String(range.end - range.start + 1),
    "content-range": `bytes ${range.start}-${range.end}/${size}`,
    "accept-ranges": "bytes",
  };
}

/** Serve bytes with Range support; used by the fake Drive (real Drive handles Range itself). */
export function rangeResponse(bytes: Uint8Array, rangeHeader: string | null | undefined, contentType: string): Response {
  const range = parseRange(rangeHeader, bytes.byteLength);
  if (rangeHeader && !range) {
    return new Response(null, { status: 416, headers: { "content-range": `bytes */${bytes.byteLength}`, "accept-ranges": "bytes" } });
  }
  if (!range) {
    return new Response(bytes.slice().buffer as ArrayBuffer, { status: 200, headers: { "content-type": contentType, "content-length": String(bytes.byteLength), "accept-ranges": "bytes" } });
  }
  const chunk = bytes.slice(range.start, range.end + 1);
  return new Response(chunk.buffer as ArrayBuffer, { status: 206, headers: partialHeaders(range, bytes.byteLength, contentType) });
}

/** A short mono 16-bit PCM WAV tone, so the fake Drive can "play" audio. */
export function toneWav(seconds = 3, hz = 440, rate = 8000): Uint8Array {
  const n = Math.floor(seconds * rate);
  const buf = new ArrayBuffer(44 + n * 2); const dv = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt "); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 400, (n - i) / 400);           // soft attack/decay, no clicks
    dv.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 12000 * env), true);
  }
  return new Uint8Array(buf);
}
