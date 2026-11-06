// A stand-in Drive with FAKE files shaped like the manifest, so the sync job,
// the dry-run report and the admin screen can be exercised with no Google
// account at all. Names mirror the brief's manifest; contents don't exist.
import { FOLDERS } from "./manifest.ts";
import { FOLDER_MIME, GDOC_MIME, type DriveClient, type DriveFile } from "./types.ts";
import { rangeResponse, toneWav } from "../media/range.ts";

type Entry = { folder: string; name: string; mime: string; size: number; md5: string; modified?: string; link?: string; taken?: string; content?: string };

const h = (s: string) => Array.from(s).reduce((a, c) => ((a * 31 + c.charCodeAt(0)) >>> 0), 7).toString(16).padStart(8, "0").repeat(4);
const f = (folder: string, name: string, mime: string, size: number, opts: Partial<Entry> = {}): Entry => ({ folder, name, mime, size, md5: opts.md5 ?? h(name + size), ...opts });

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const FAKE_FILES: Entry[] = [
  // Rich's Drive (prior brief)
  f("rich_history", "He Hymn.docx", DOCX, 18_000), f("rich_history", "HE - Google Docs.pdf", "application/pdf", 42_000),
  f("rich_history", "SHE.docx", DOCX, 17_500), f("rich_history", "You are the only one.mp3", "audio/mpeg", 4_200_000, { md5: "song-you-are-the-only-one" }),
  f("rich_history", "IMG_2572.jpeg", "image/jpeg", 2_100_000),
  f("home_property", "Approved_AVM_Package.pdf", "application/pdf", 910_000), f("home_property", "Parker Garage Doors estimate.pdf", "application/pdf", 120_000),
  f("home_property", "estimate.pdf", "application/pdf", 88_000), f("home_property", "Garage Doors.docx", DOCX, 20_000), f("home_property", "Handyman Repairs.docx", DOCX, 15_000),
  f("home_property", "34 Vickie Improvements.docx", DOCX, 24_000), f("home_property", "Vickie Specs.docx", DOCX, 19_000),
  f("health", "Dentist.docx", DOCX, 12_000),
  // Diana's Drive
  f("diana_history", "RichGreenelife.mp4", "video/mp4", 30_500_000), f("diana_history", "Richard readscripture.mp4", "video/mp4", 12_000_000),
  f("diana_history", "Wedding.mp4", "video/mp4", 75_500_000), f("diana_history", "never let you go.webm", "video/webm", 9_000_000),
  f("diana_history", "Faith Hope & Charity.mp3", "audio/mpeg", 3_900_000), f("diana_history", "I'll never let you go.mp3", "audio/mpeg", 4_100_000),
  f("diana_history", "Oh Lord it's hard to be humble.mp3", "audio/mpeg", 3_700_000), f("diana_history", "Purple People Eater.mp3", "audio/mpeg", 2_900_000),
  f("diana_history", "Witch Doctor.mp3", "audio/mpeg", 2_800_000),
  f("diana_history", "You are the only one.mp3", "audio/mpeg", 4_200_000, { md5: "song-you-are-the-only-one" }),   // duplicate of Rich's copy
  f("diana_history", "Track part 07.mp3", "audio/mpeg", 3_000_000), f("diana_history", "Track part 11.mp3", "audio/mpeg", 3_100_000),
  f("diana_history", "Track part 16.mp3", "audio/mpeg", 3_200_000), f("diana_history", "Track part 20.mp3", "audio/mpeg", 3_300_000),
  f("diana_history", "IfoundtheLIGHT.pdf", "application/pdf", 400_000), f("diana_history", "Forgive for Good notes.docx", DOCX, 22_000),
  f("diana_history", "Family_Names_and_Addresses.pdf", "application/pdf", 300_000), f("diana_history", "Mike Tokos genealogy.docx", DOCX, 60_000),
  f("diana_history", "Harry M Tokos military history.docx", DOCX, 48_000), f("diana_history", "masterlist02-26.xlsx", XLSX, 70_000),
  f("diana_history", "Missionary_Letter_Tracker.csv", "text/csv", 9_000), f("diana_history", "CHAMPVA guidebook.pdf", "application/pdf", 1_800_000),
  f("diana_history", "Form 10-7959c.pdf", "application/pdf", 150_000), f("diana_history", "VBA-21-4138.pdf", "application/pdf", 140_000),
  f("diana_history", "VA claim letter 2023-08-22.pdf", "application/pdf", 210_000), f("diana_history", "VA claim letter 2026-03-03.pdf", "application/pdf", 230_000),
  f("diana_history", "VA claim letter 2026-07-23.pdf", "application/pdf", 220_000),
  f("diana_history", "Untitled scan.pdf", "application/pdf", 50_000),   // unmatched on purpose
  // Taxes (admin-only)
  ...[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => f("taxes", `${y} Greene Federal Tax Return.pdf`, "application/pdf", 1_200_000 + y)),
  // Legal
  f("legal", "2021 Will (draft, unsigned).pdf", "application/pdf", 500_000), f("legal", "TOD deed 2908 Solitude (draft).pdf", "application/pdf", 300_000),
  // Photos (Takeout) — a fake export: one photo with EXIF, one dated only by its sidecar, one undated, one renamed duplicate, one video
  f("photos_takeout", "IMG_0001.jpg", "image/jpeg", 3_100_000, { md5: "photo-0001", taken: "2019:07:04 15:20:00", modified: "2026-10-30T09:00:00Z" }),
  f("photos_takeout", "IMG_0001.jpg.json", "application/json", 900, { content: JSON.stringify({ title: "IMG_0001.jpg", photoTakenTime: { timestamp: "1562253600" } }) }),
  f("photos_takeout", "IMG_0002.jpg", "image/jpeg", 2_800_000, { md5: "photo-0002", modified: "2026-10-30T09:00:00Z" }),
  f("photos_takeout", "IMG_0002.jpg.supplemental-metadata.json", "application/json", 950, { content: JSON.stringify({ title: "IMG_0002.jpg", photoTakenTime: { timestamp: "1104580800" } }) }),
  f("photos_takeout", "IMG_0003.heic", "image/heic", 1_900_000, { md5: "photo-0003", modified: "2026-10-30T09:00:00Z" }),
  f("photos_takeout", "Copy of IMG_0001.jpg", "image/jpeg", 3_100_000, { md5: "photo-0001", modified: "2026-10-30T09:05:00Z" }),   // same bytes, new name
  f("photos_takeout", "MVI_0004.mp4", "video/mp4", 18_000_000, { md5: "clip-0004", taken: "2024:12:25 10:02:11", modified: "2026-10-30T09:00:00Z" }),
  // Widow book (admin-only)
  f("widow_book", "Widow Book chapter 1.docx", DOCX, 30_000), f("widow_book", "Widow Book sensitive A.pdf", "application/pdf", 80_000),
];

/** The stand-in "Greene Family Binder" Google Doc, in the shape Riana's notes tend to take. */
export const FAKE_BINDER_DOC_ID = "fake-doc-greene-family-binder";
export const FAKE_BINDER_DOC = `Greene Family Binder - Riana's working notes (SAMPLE)

APPOINTMENTS
- Dad cardiology follow-up Nov 12 at 10:30 with Dr. Sample; Karmel driving.
- Mom eye exam 11/20, Sample Vision, bring the old glasses.

Lab results
- Diana A1C 6.1 % on 2026-11-03 (was 6.4 in July).

Bills
- Sample Electric Co. autopay failed again, $142.18 due 11/15.

Questions for Mom and Dad
- Where is the original signed healthcare power of attorney kept?
- Do you still want the service at the chapel in town?

Notes
- Rich would like the hymn recording added to the family history page.
`;

export function fakeDriveClient(opts: { unreadable?: string[] } = {}): DriveClient {
  const unreadable = new Set(opts.unreadable ?? ["widow_book"]);  // one folder "not shared yet", to show the check working
  const idFor = (key: string) => FOLDERS.find((x) => x.key === key)?.driveFolderId ?? `fake-folder-${key}`;
  const keyFor = (id: string) => FOLDERS.find((x) => (x.driveFolderId ?? `fake-folder-${x.key}`) === id)?.key ?? null;
  return {
    async probeFolder(folderId) {
      const key = keyFor(folderId);
      if (!key) return { ok: false, error: "Not shared with the app's service account (or wrong link)" };
      if (unreadable.has(key)) return { ok: false, error: "Not shared with the app's service account (or wrong link)" };
      return { ok: true, name: FOLDERS.find((x) => x.key === key)!.name };
    },
    async list(folderId) {
      const key = keyFor(folderId);
      if (!key || unreadable.has(key)) throw new Error("Drive files: 404 Not Found");
      const sub: DriveFile[] = FOLDERS.filter((x) => x.parentKey === key).map((x) => ({
        id: idFor(x.key), name: x.name, mimeType: FOLDER_MIME, size: null, md5Checksum: null, modifiedTime: "2026-11-01T00:00:00Z", webViewLink: null, parents: [folderId],
      }));
      const files: DriveFile[] = FAKE_FILES.filter((e) => e.folder === key).map((e, i) => ({
        id: `fake-${key}-${i}`, name: e.name, mimeType: e.mime, size: e.size, md5Checksum: e.md5,
        modifiedTime: e.modified ?? "2026-10-15T12:00:00Z", webViewLink: `https://drive.google.com/file/d/fake-${key}-${i}/view`, parents: [folderId],
        takenTime: e.taken ?? null,
      }));
      return [...sub, ...files];
    },
    async getFile(fileId) {
      if (fileId === FAKE_BINDER_DOC_ID) {
        return { id: fileId, name: "Greene Family Binder (sample)", mimeType: GDOC_MIME, size: null, md5Checksum: null, modifiedTime: "2026-11-03T15:00:00Z", webViewLink: null, parents: [] };
      }
      throw new Error("Drive files: 404 Not Found");
    },
    async exportText(fileId) {
      if (fileId === FAKE_BINDER_DOC_ID) return FAKE_BINDER_DOC;
      throw new Error("Drive files: 404 Not Found");
    },
    async stream(fileId, range) {
      const key = fileId.replace(/^fake-/, "").replace(/-\d+$/, "");
      const idx = Number(fileId.split("-").pop());
      const entry = FAKE_FILES.filter((e) => e.folder === key)[idx];
      const name = entry?.name ?? "Sample file";
      if (entry?.content !== undefined) return new Response(entry.content, { status: 200, headers: { "content-type": entry.mime } });
      if (entry && /^audio\//.test(entry.mime)) {
        // Each fake song is a different short tone so the playlist audibly advances.
        const hz = 330 + ((name.length * 37) % 220);
        return rangeResponse(toneWav(3, hz), range, "audio/wav");
      }
      if (entry && /^image\//.test(entry.mime)) {
        const hue = (name.length * 47) % 360;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="hsl(${hue} 30% 88%)"/><text x="300" y="300" font-family="sans-serif" font-size="28" text-anchor="middle" fill="#2f5141">Sample photo</text><text x="300" y="340" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#2f5141">${name.replace(/[<>&]/g, "")}</text></svg>`;
        return new Response(svg, { status: 200, headers: { "content-type": "image/svg+xml", "accept-ranges": "bytes" } });
      }
      return new Response(tinyPdf(`SAMPLE DOCUMENT (fake) - ${name.replace(/[()\\]/g, "")}`), { status: 200, headers: { "content-type": "application/pdf", "accept-ranges": "bytes" } });
    },
  };
}

/** A minimal, valid one-page PDF showing one line of text. Used only by the fake Drive. */
export function tinyPdf(text: string): string {
  const safe = text.replace(/[^\x20-\x7e]/g, "?").slice(0, 80);
  const content = `BT /F1 18 Tf 40 740 Td (${safe}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n"; const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}
