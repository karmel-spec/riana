import Link from "next/link";
import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { Binder, type BinderTab } from "./binder";
import { UploadFile } from "@/components/upload-file";

export const metadata = { title: "The Widow Book" };

const ALBUM_URL = "https://photos.app.goo.gl/Mi1ZEt6LQP9R61Fd8";
const DRIVE_URL = "https://drive.google.com/drive/folders/19vZ3XcQhF2e1WjzuAJRf-Ghh6nQdOEEq";
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
  const files = await data.getWidowBook(v);
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
  const cover = pages.find((p) => p.section === "Cover");
  const body = pages.filter((p) => p.section !== "Cover");
  const extra = [...new Set(body.map((p) => p.section))].filter((s) => !SECTIONS.some((x) => x.key === s)).map((key) => ({ key, blurb: "", color: "#d9d0bd" }));
  const tabs: BinderTab[] = [...SECTIONS, ...extra].map((s) => ({ ...s, pages: body.filter((p) => p.section === s.key) })).filter((t) => t.pages.length > 0);
  const scanned = SECTIONS.filter((s) => s.key !== "Vault" && body.some((p) => p.section === s.key)).length;

  return (
    <>
      <PageHeader eyebrow="Sources · 2022 Widow Book" title="The Widow Book"
        intro="Diana’s “Important Papers & Documents” binder, photographed in July 2022 and filed by its tabs, exactly as Rich labeled them. Every page lives in Drive; this page is the digital copy. For what to do with it, see the Executrix checklist."
        actions={<><a href={ALBUM_URL} target="_blank" rel="noreferrer" className="btn-primary">Open the photo album ↗</a><a href={DRIVE_URL} target="_blank" rel="noreferrer" className="btn-secondary">Drive folder ↗</a><Link href="/executrix" className="btn-secondary">Executrix checklist →</Link></>} />

      <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
        {cover?.web_view_link ? (
          <figure className="overflow-hidden rounded-2xl border border-rule-soft bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.web_view_link} alt="Rich and Diana holding the Widow Book binder" className="aspect-[4/3] w-full object-cover" />
            <figcaption className="px-3 py-2 text-[0.85rem] text-ink-soft">{cover.note || cover.name}</figcaption>
          </figure>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-rule bg-paper-warm p-4 text-center text-[0.9rem] text-ink-soft">Hero photo of Rich and Diana with the book: send it again to place it here.</div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4"><div className="eyebrow">The paper binder</div><div className="mt-1"><strong>2431 Tyndell Cir SW</strong>, Tumwater. The will is also kept in the safe, per the 2021 Directive.</div></div>
          <div className="card p-4"><div className="eyebrow">Who has copies</div><div className="mt-1"><strong>Heather</strong> (executrix) and <strong>Karmel</strong> (backup). The estate attorney on the Contacts page holds the 2021 wills.</div></div>
          <div className="card p-4"><div className="eyebrow">Filed so far</div><div className="mt-1"><strong>{body.length} pages</strong> across {scanned} tabs. More folders are still being digitized; a new Drive folder becomes a new tab.</div></div>
        </div>
      </div>

      <div className="mb-4">
        <UploadFile section="legal" label="Upload a page or document" allowVault back="/sources/widow-book" newTab={{ prefix: "[Widow Book · ", suffix: "]" }}
          notes={SECTIONS.filter((s) => s.key !== "Album" && s.key !== "Vault").map((s) => ({ label: s.key, value: `[Widow Book · ${s.key}]` }))} defaultNote="[Widow Book · Legal]" />
      </div>
      {tabs.length === 0 ? <Empty>No Widow Book pages are filed yet.</Empty> : <Binder tabs={tabs} albumUrl={ALBUM_URL} />}
    </>
  );
}
