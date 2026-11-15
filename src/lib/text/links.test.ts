import { test } from "node:test";
import assert from "node:assert/strict";
import { linkify, linkLabel } from "./links.ts";

test("a written-out address becomes a short named link and its label is dropped", () => {
  assert.deepEqual(linkify("Established visit (15 min). Drive file: https://drive.google.com/file/d/abc123/view?usp=drivesdk"), [
    { text: "Established visit (15 min). " },
    { href: "https://drive.google.com/file/d/abc123/view?usp=drivesdk", label: "Open the Drive file" },
  ]);
});

test("text around and after a link is kept, and the full stop is not part of the link", () => {
  assert.deepEqual(linkify("See https://example.org/page. Bring ID."), [{ text: "See " }, { href: "https://example.org/page", label: "example.org" }, { text: ". Bring ID." }]);
  assert.deepEqual(linkify("No links here."), [{ text: "No links here." }]);
});

test("links are named for what they open", () => {
  assert.equal(linkLabel("https://docs.google.com/spreadsheets/d/x/edit"), "Open the Google doc");
  assert.equal(linkLabel("https://drive.google.com/drive/folders/x"), "Open the Drive folder");
  assert.equal(linkLabel("https://photos.app.goo.gl/x"), "Open the photo album");
  assert.equal(linkLabel("https://www.havasu.example/visit"), "havasu.example");
});
