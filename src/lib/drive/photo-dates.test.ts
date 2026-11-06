// Run with: node --test src/lib/drive/photo-dates.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { exifToIso, hashKey, isSidecarFor, sidecarTakenAt } from "./photo-dates.ts";
import { fakeDriveClient } from "./fake.ts";
import { enrichTakenAt, planSync } from "./sync.ts";

test("EXIF time strings become ISO dates", () => {
  assert.equal(exifToIso("2019:07:04 15:20:00"), "2019-07-04T15:20:00");
  assert.equal(exifToIso("0000:00:00 00:00:00"), null);
  assert.equal(exifToIso("2024-12-25T10:02:11Z"), "2024-12-25T10:02:11.000Z");
  assert.equal(exifToIso(""), null); assert.equal(exifToIso(null), null); assert.equal(exifToIso("yesterday"), null);
});

test("Takeout sidecars give the photo-taken time", () => {
  assert.equal(sidecarTakenAt(JSON.stringify({ photoTakenTime: { timestamp: "1104580800" } })), "2005-01-01T12:00:00.000Z");
  assert.equal(sidecarTakenAt("not json"), null);
  assert.equal(sidecarTakenAt("{}"), null);
  assert.ok(isSidecarFor("IMG_0001.jpg", "IMG_0001.jpg.json"));
  assert.ok(isSidecarFor("IMG_0002.jpg", "IMG_0002.jpg.supplemental-metadata.json"));
  assert.ok(isSidecarFor("IMG_0002.jpg", "img_0002.jpg.supplemental-metad.json"), "truncated Takeout names still match");
  assert.ok(!isSidecarFor("IMG_0001.jpg", "IMG_0010.jpg.json"));
  assert.ok(!isSidecarFor("IMG_0001.jpg", "IMG_0001.jpg"));
});

test("photos dedupe by content hash even when renamed, and keep their dates", async () => {
  const drive = fakeDriveClient({ unreadable: [] });
  const report = await planSync(drive, new Map());
  const takeout = report.entries.filter((e) => e.folderKey === "photos_takeout");
  const copy = takeout.find((e) => e.name === "Copy of IMG_0001.jpg")!;
  assert.equal(copy.action, "duplicate", "renamed copy is a duplicate");
  assert.equal(copy.duplicateOf, takeout.find((e) => e.name === "IMG_0001.jpg")!.driveFileId);
  assert.equal(takeout.find((e) => e.name === "IMG_0001.jpg")!.takenAt, "2019-07-04T15:20:00", "EXIF wins");
  assert.equal(takeout.find((e) => e.name === "IMG_0001.jpg.json")!.action, "exclude", "sidecars are never imported");
  assert.equal(takeout.find((e) => e.name === "IMG_0002.jpg")!.takenAt, null, "no EXIF yet");
  const filled = await enrichTakenAt(drive, report);
  assert.equal(filled, 1);
  assert.equal(takeout.find((e) => e.name === "IMG_0002.jpg")!.takenAt, "2005-01-01T12:00:00.000Z", "sidecar fills the gap");
  assert.equal(takeout.find((e) => e.name === "IMG_0003.heic")!.takenAt, null, "undated stays undated (falls back to upload date later)");
});

test("a re-export in a later run is recognised by hash, not name", async () => {
  const drive = fakeDriveClient({ unreadable: [] });
  const first = await planSync(drive, new Map());
  const img = first.entries.find((e) => e.name === "IMG_0003.heic")!;
  const known = new Map([[hashKey(img.md5!, img.size), "older-drive-id"]]);
  const second = await planSync(drive, new Map(), known);
  const again = second.entries.find((e) => e.name === "IMG_0003.heic")!;
  assert.equal(again.action, "duplicate"); assert.equal(again.duplicateOf, "older-drive-id");
});
