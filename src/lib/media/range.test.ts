import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRange, rangeResponse, toneWav } from "./range.ts";

test("parseRange handles the three common forms and rejects bad ones", () => {
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=500-", 1000), { start: 500, end: 999 });
  assert.deepEqual(parseRange("bytes=-100", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=0-5000", 1000), { start: 0, end: 999 });
  assert.equal(parseRange("bytes=1000-", 1000), null);
  assert.equal(parseRange("bytes=5-2", 1000), null);
  assert.equal(parseRange(undefined, 1000), null);
});

test("rangeResponse returns 206 with the right slice, 200 without a Range, 416 when unsatisfiable", async () => {
  const bytes = new Uint8Array(100).map((_, i) => i);
  const r206 = rangeResponse(bytes, "bytes=10-19", "audio/wav");
  assert.equal(r206.status, 206);
  assert.equal(r206.headers.get("content-range"), "bytes 10-19/100");
  assert.equal(r206.headers.get("content-length"), "10");
  assert.deepEqual([...new Uint8Array(await r206.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const r200 = rangeResponse(bytes, null, "audio/wav");
  assert.equal(r200.status, 200);
  assert.equal(r200.headers.get("accept-ranges"), "bytes");
  assert.equal(rangeResponse(bytes, "bytes=200-", "audio/wav").status, 416);
});

test("toneWav is a valid RIFF/WAVE with the expected length", () => {
  const w = toneWav(1, 440, 8000);
  assert.equal(String.fromCharCode(...w.slice(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...w.slice(8, 12)), "WAVE");
  assert.equal(w.byteLength, 44 + 8000 * 2);
});
