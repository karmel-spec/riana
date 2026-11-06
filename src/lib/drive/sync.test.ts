// Run with: node --test src/lib/drive/sync.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDriveClient, FAKE_FILES } from "./fake.ts";
import { planSync, resolveFolders } from "./sync.ts";
import { matchFile, FOLDERS } from "./manifest.ts";

test("every manifest file gets a target section", async () => {
  const report = await planSync(fakeDriveClient({ unreadable: [] }), new Map());
  assert.equal(report.entries.length, FAKE_FILES.length, "one plan entry per file");
  for (const e of report.entries) assert.ok(e.target, `${e.name} has a target`);
  const unmatched = report.entries.filter((e) => e.action === "unmatched").map((e) => e.name);
  assert.deepEqual(unmatched, ["Untitled scan.pdf"], "only the deliberately unknown file is unmatched");
});

test("unreadable folders are flagged, and their files are skipped", async () => {
  const { status } = await resolveFolders(fakeDriveClient({ unreadable: ["widow_book", "taxes"] }));
  const bad = status.filter((s) => !s.readable).map((s) => s.key).sort();
  assert.deepEqual(bad, ["taxes", "widow_book"]);
  assert.match(status.find((s) => s.key === "taxes")!.error!, /not shared/i);
  const report = await planSync(fakeDriveClient({ unreadable: ["taxes"] }), new Map());
  assert.equal(report.entries.filter((e) => e.folderKey === "taxes").length, 0);
});

test("subfolders of the root are found by name", async () => {
  const { status } = await resolveFolders(fakeDriveClient({ unreadable: [] }));
  for (const key of ["rich_history", "home_property", "health"]) {
    const s = status.find((x) => x.key === key)!;
    assert.equal(s.readable, true, key);
    assert.equal(s.resolvedFrom, "root");
  }
});

test("re-running creates no duplicates", async () => {
  const drive = fakeDriveClient({ unreadable: [] });
  const first = await planSync(drive, new Map());
  const existing = new Map(first.entries.filter((e) => e.action !== "exclude").map((e) => [e.driveFileId, { md5: e.md5, modifiedTime: e.modifiedTime }]));
  const second = await planSync(drive, existing);
  assert.equal(second.counts.create, 0);
  assert.equal(second.counts.duplicate, 0);
  assert.equal(second.counts.unchanged, first.entries.length - first.counts.exclude);
  // A changed file shows as "update", not a new row.
  const touched = new Map(existing);
  const id = first.entries[0].driveFileId;
  touched.set(id, { md5: "different", modifiedTime: "2026-12-01T00:00:00Z" });
  const third = await planSync(drive, touched);
  assert.equal(third.counts.update, 1);
  assert.equal(third.counts.create, 0);
});

test("the song that exists in both Drives is deduplicated by name + size + hash", async () => {
  const report = await planSync(fakeDriveClient({ unreadable: [] }), new Map());
  const copies = report.entries.filter((e) => e.name === "You are the only one.mp3");
  assert.equal(copies.length, 2);
  assert.deepEqual(copies.map((c) => c.action).sort(), ["create", "duplicate"]);
  assert.equal(copies.find((c) => c.action === "duplicate")!.duplicateOf, copies.find((c) => c.action === "create")!.driveFileId);
});

test("taxes and the Widow Book are admin-only no matter what the rule says", () => {
  assert.equal(matchFile("taxes", "2024 Greene Federal Tax Return.pdf").sensitivity, "admin_only");
  assert.equal(matchFile("widow_book", "anything.docx").sensitivity, "admin_only");
  assert.equal(matchFile("legal", "2021 Will.pdf").sensitivity, "normal");
  assert.equal(matchFile("diana_history", "masterlist02-26.xlsx").sensitivity, "admin_only", "bulk contact lists wait for admin review");
});

test("Diana's manifest maps to the sections in the brief", () => {
  const t = (n: string) => matchFile("diana_history", n);
  assert.equal(t("Wedding.mp4").media, "video");
  assert.equal(t("Richard readscripture.mp4").note, "History archive → Media / Church");
  assert.equal(t("Purple People Eater.mp3").note, "Media → Rich's Sing-Along");
  assert.match(t("Track part 11.mp3").note, /title to identify/);
  assert.equal(t("Mike Tokos genealogy.docx").note, "Family tree / Genealogy");
  assert.equal(t("Harry M Tokos military history.docx").note, "Family tree / Genealogy");
  assert.equal(t("Family_Names_and_Addresses.pdf").target, "contacts");
  assert.equal(t("Missionary_Letter_Tracker.csv").note, "Church");
  assert.equal(t("CHAMPVA guidebook.pdf").target, "health_rich");
  assert.equal(t("VBA-21-4138.pdf").media, "form");
  assert.match(t("VA claim letter 2026-07-23.pdf").note, /timeline/);
});

test("Rich's manifest maps to the sections in the prior brief", () => {
  assert.equal(matchFile("home_property", "34 Vickie Improvements.docx").note, "Properties → Vehicles (Vickie)");
  assert.equal(matchFile("home_property", "Approved_AVM_Package.pdf").target, "properties");
  assert.equal(matchFile("health", "Dentist.docx").target, "health_diana");
  assert.equal(matchFile("rich_history", "He Hymn.docx").target, "family_history");
  assert.equal(matchFile("rich_history", "IMG_2572.jpeg").media, "image");
});

test("no folder id in the manifest is duplicated", () => {
  const ids = FOLDERS.map((f) => f.driveFolderId).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
});
