import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { Binder, type BinderTab } from "./binder";
import { UploadFile } from "@/components/upload-file";
import { FOLDERS } from "@/lib/drive/manifest";

export const metadata = { title: "The Widow Book" };

const ALBUM_URL = "https://photos.app.goo.gl/Mi1ZEt6LQP9R61Fd8";
const driveFolder = (key: string) => { const id = FOLDERS.find((f) => f.key === key)?.driveFolderId; return id ? `https://drive.google.com/drive/folders/${id}` : null; };
/** The two paper binders this page is built from, and where each one's scans live. */
const BOOKS = [
  { key: "widow_book", year: "2022", title: "2022 Widow Book", about: "Diana’s “Important Papers & Documents” binder, photographed page by page in July 2022.", album: ALBUM_URL, drive: driveFolder("widow_book") },
  { key: "widow_book_2026", year: "2026", title: "2026 Widow Book", about: "Rich’s 2026 binder, being digitized folder by folder. Each Drive subfolder becomes a tab below.", album: null as string | null, drive: driveFolder("widow_book_2026") },
];
/** Binder tabs in the order the physical binder is organized, with a tab color each. */
const SECTIONS: { key: string; blurb: string; color: string }[] = [
  { key: "Album", blurb: "The July 19, 2022 photo album of every page, as photographed. Tap a photo to open it full size.", color: "#c9a35a" },
  { key: "Legal", blurb: "Wills, healthcare directives, powers of attorney, transfer-on-death deeds, the community property agreement and the Directive to Personal Representative.", color: "#2f5141" },
  { key: "Financial", blurb: "Bank statements, the annuity, mortgages, property tax, HOA and the family trust proposal.", color: "#4b5563" },
  { key: "Insurance", blurb: "Policies found in the binder.", color: "#7c9885" },
  { key: "Military & VA", blurb: "Rich’s DD-214, Navy service records and VA benefit guides.", color: "#1e372b" },
  { key: "Funeral & Burial", blurb: "The Odd Fellows paperwork (plots since sold), opening/closing and the headstone. Burial is now planned in Lake Havasu.", color: "#9a3412" },
  { key: "Guides", blurb: "Checklists kept in the binder for the family.", color: "#6e5323" },
  { key: "Family Photos & Notes", blurb: "The binder cover, family photos and notes.", color: "#8a9a90" },
  { key: "Vault", blurb: "Pages with passwords, account numbers, codes or SSNs. Listed here so you know they exist; the values live in 1Password.", color: "#b7c4bc" },
];

export default async function WidowBookPage() {
  const v = await requireSuperAdmin();
  const all = await data.getWidowBook(v);
  // A book's photo album is kept as an admin-only record, never in the code: the share link opens for anyone who has it.
  const SOURCE_ALBUM = /^\[Widow Book · Source album (\d{4})\]\s*/;
  const albums = new Map(all.flatMap((f) => { const m = SOURCE_ALBUM.exec(f.target_note ?? ""); return m && f.web_view_link ? [[m[1], { url: f.web_view_link, note: (f.target_note ?? "").replace(SOURCE_ALBUM, "") }] as const] : []; }));
  const files = all.filter((f) => !SOURCE_ALBUM.test(f.target_note ?? ""));
  await data.logView(v, "admin", "widow-book");
  const parse = (f: (typeof files)[number]) => {
    const tag = /Widow Book\s*[·:]\s*([^\]·]+)/.exec(f.target_note ?? "");
    const section = tag ? tag[1].trim() : "Other";
    const note = (f.target_note ?? "").replace(/^\[Widow Book[^\]]*\]\s*/, "").replace(/\s*·\s*Widow Book:[^·]*$/, "");
    // Vault = pages whose contents are secrets (logins, safe contents), not merely admin-only statements.
    // Vault = pages whose contents are secrets: the flagged scans, and anything uploaded with "Vault only" ticked.
    const vault = /SENSITIVE/i.test(f.name) || /^Super admins only/i.test(f.target_note ?? "") || (f.sensitivity === "admin_only" && (f.drive_file_id ?? "").startsWith("upload:"));
    return { id: f.id, name: f.name, web_view_link: f.web_view_link, note, section: vault ? "Vault" : section, taken_at: f.taken_at, vault, media_kind: f.media_kind };
  };
  const pages = files.map(parse);
  const body = pages.filter((p) => p.section !== "Cover");
  const extra = [...new Set(body.map((p) => p.section))].filter((s) => !SECTIONS.some((x) => x.key === s)).map((key) => ({ key, blurb: "", color: "#d9d0bd" }));
  const tabs: BinderTab[] = [...SECTIONS, ...extra].map((s) => ({ ...s, pages: body.filter((p) => p.section === s.key) })).filter((t) => t.pages.length > 0);
  const scanned = SECTIONS.filter((s) => s.key !== "Vault" && body.some((p) => p.section === s.key)).length;

  return (
    <>
      <PageHeader eyebrow="Sources · 2022 and 2026 Widow Books" title="The Widow Book"
        intro="Two binders of important papers: the 2022 book, photographed that July, and the 2026 book Rich is assembling now. Both are filed here by their tabs, exactly as labeled. Every page lives in Drive; this page is the digital copy." />

      <section aria-label="Sources" className="mb-6">
        <ul className="grid gap-3 md:grid-cols-2">
          {BOOKS.map((b) => {
            const album = b.album ?? albums.get(b.year)?.url ?? null;
            const albumNote = albums.get(b.year)?.note;
            const count = files.filter((f) => (b.key === "widow_book_2026") === (f.drive_folder_key === "widow_book_2026")).length;
            return (
              <li key={b.key} className="card flex flex-col gap-2 p-4">
                <div className="flex items-baseline justify-between gap-3"><h3 className="font-serif text-[1.25rem] font-semibold">{b.title}</h3><span className="text-[0.9rem] text-ink-soft">{count} {count === 1 ? "page" : "pages"} filed</span></div>
                <p className="text-ink-soft">{b.about}</p>
                {albumNote && <p className="text-[0.9rem] text-ink-soft">{albumNote}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {album && <a href={album} target="_blank" rel="noreferrer" className="btn-primary px-4">Photo album ↗</a>}
                  {b.drive ? <a href={b.drive} target="_blank" rel="noreferrer" className="btn-secondary px-4">Drive folder ↗</a> : <span className="text-[0.9rem] text-ink-soft">No Drive folder linked yet.</span>}
                  {!album && <span className="self-center text-[0.9rem] text-ink-soft">No photo album linked yet.</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mb-6">
          <div className="card p-4"><div className="eyebrow">Filed so far</div><div className="mt-1"><strong>{body.length} pages</strong> across {scanned} tabs. More folders are still being digitized; a new Drive folder becomes a new tab.</div></div>
      </div>

      <div className="mb-4">
        <UploadFile section="legal" label="Upload a page or document" allowVault back="/sources/widow-book" newTab={{ prefix: "[Widow Book · ", suffix: "]" }}
          notes={SECTIONS.filter((s) => s.key !== "Album" && s.key !== "Vault").map((s) => ({ label: s.key, value: `[Widow Book · ${s.key}]` }))} defaultNote="[Widow Book · Legal]" />
      </div>
      {tabs.length === 0 ? <Empty>No Widow Book pages are filed yet.</Empty> : <Binder tabs={tabs} albumUrl={ALBUM_URL} />}
    </>
  );
}
