import { test } from "node:test";
import assert from "node:assert/strict";
import { photoCaption, photoGroup, photoGroups } from "./slideshow.ts";

test("a photo's group comes from its note tag, then its folder", () => {
  assert.equal(photoGroup("[Photos · Christmas] Opening presents", "Web App Import"), "Christmas");
  assert.equal(photoGroup("Journals → Rich", "Rich Greene (journals)"), "Journals → Rich");
  assert.equal(photoGroup("Photos → timeline (EXIF date)", "Photos (Takeout)"), "Photos → timeline");
  assert.equal(photoGroup(null, "History & Keepsakes - Rich"), "History & Keepsakes - Rich");
  assert.equal(photoGroup("A plain description", null), "Other photos");
});

test("the caption is the note without its tag", () => {
  assert.equal(photoCaption("[Photos · Christmas] Opening presents"), "Opening presents");
  assert.equal(photoCaption("[Photos · Christmas]"), null);
  assert.equal(photoCaption("Photos → timeline (EXIF date)"), null);
  assert.equal(photoCaption("Grandpa at the lake"), "Grandpa at the lake");
  assert.equal(photoCaption(null), null);
});

test("groups are counted, biggest first", () => {
  const p = (group: string) => ({ id: group + Math.random(), group, caption: null, taken_at: null });
  assert.deepEqual(photoGroups([p("B"), p("A"), p("B")]), [{ name: "B", count: 2 }, { name: "A", count: 1 }]);
});
