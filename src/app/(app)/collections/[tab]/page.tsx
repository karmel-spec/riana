import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { notFound } from "next/navigation";
import { CollapsibleCard, Empty, PageHeader } from "@/components/ui";
import { AddAlbumButton } from "../../history/media-client";
import { fmtDate, subjectName } from "@/lib/format";
import { Book, Heart, Mic, Tag } from "@/components/icons";
import type { CollectionCategory } from "@/lib/types";
import { AddCollectionButton, RemoveCollectionButton } from "../collections-client";
import { Slideshow } from "../slideshow";
import { UploadFile } from "@/components/upload-file";
import { PHOTO_TAG, photoGroups } from "@/lib/files/slideshow";

const TABS: Record<string, { title: string; parentTitle: string; intro: string; parentIntro: string; categories: CollectionCategory[]; defaultCategory: CollectionCategory }> = {
  books: { title: "Mom’s books", parentTitle: "Your books", intro: "The books Mom wrote, compiled or treasured, and where each one is kept.", parentIntro: "Your books, and where each one is.", categories: ["book"], defaultCategory: "book" },
  photos: { title: "Photos", parentTitle: "Photos", intro: "Albums, boxes and shared photo collections, physical or online, and where each one lives.", parentIntro: "The photo albums and where they are. Tap a link to open it.", categories: ["photos"], defaultCategory: "photos" },
  "love-letters": { title: "Love letters", parentTitle: "Your love letters", intro: "The letters Rich and Diana wrote each other, and the ones worth keeping from family and friends: where each is kept, and a link if it has been scanned.", parentIntro: "Your love letters, and where they are.", categories: ["love_letter"], defaultCategory: "love_letter" },
  interviews: { title: "Interviews", parentTitle: "Your interviews", intro: "Recorded conversations with Rich and Diana: life-story interviews, voice memos and videos, with a link to listen or watch and a note on what each one covers.", parentIntro: "Recordings of you telling your stories. Tap a link to listen.", categories: ["interview"], defaultCategory: "interview" },
  imemories: { title: "iMemories & digital history", parentTitle: "Home movies", intro: "Home movies and photos digitized through iMemories, plus the digital family history archive: scanned documents and genealogy files kept online.", parentIntro: "The home movies and the family archive. Tap a link to open it.", categories: ["imemories", "digital_history", "other"], defaultCategory: "imemories" },
};

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  return { title: TABS[tab]?.title ?? "Collections" };
}

const GROUPS: { key: CollectionCategory; title: string; blurb: string }[] = [
  { key: "book", title: "Mom’s books", blurb: "The books she wrote, compiled or treasured, and where each one is kept." },
  { key: "photos", title: "Photos", blurb: "Albums, boxes and shared collections, physical or online." },
  { key: "imemories", title: "iMemories", blurb: "Home movies and photos digitized through iMemories, with the links to watch them." },
  { key: "digital_history", title: "Digital family history", blurb: "Scanned documents, genealogy files and archives kept online." },
  { key: "love_letter", title: "Love letters", blurb: "Letters between Rich and Diana, and keepsake letters from family, with where the originals are kept." },
  { key: "interview", title: "Interviews", blurb: "Life-story interviews, voice memos and videos, and what each one covers." },
  { key: "other", title: "Other keepsakes", blurb: "Anything that doesn’t fit above." },
];

export default async function CollectionsPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const t = TABS[tab]; if (!t) notFound();
  const v = await requireSection("family_history");
  const items = (await data.getCollections(v)).filter((i) => t.categories.includes(i.category));
  const [albums, photos] = tab === "photos" ? await Promise.all([data.getSharedAlbums(v), data.getSlideshowPhotos(v)]) : [[], []];
  const photoTags = [...new Set(["Family", ...photoGroups(photos).map((g) => g.name).filter((n) => !n.includes("→") && n !== "Added in the app")])];
  await data.logView(v, "family_history", "collections");
  const parent = v.brief;
  const canEdit = canWrite(v, "family_history") && !parent;

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 16 · Collections"} title={parent ? t.parentTitle : t.title}
        intro={parent ? t.parentIntro : t.intro}
        actions={canEdit ? <AddCollectionButton defaultCategory={t.defaultCategory} /> : undefined} />

      {tab === "photos" && (
        <section aria-labelledby="slideshow" className="card mb-6 flex flex-col gap-3">
          <h2 id="slideshow" className={`font-semibold ${parent ? "text-[1.6rem]" : "text-[1.35rem]"}`}>Slideshow</h2>
          {photos.length === 0
            ? <Empty>{canEdit ? "No photos are stored in the binder yet. Add one below and the slideshow appears here." : "No photos are stored in the binder yet."}</Empty>
            : <><p className="text-ink-soft">{parent ? "Sit back and watch the family photos, one at a time. Tap Close when you are done." : "Plays the photos kept in the binder full screen, one every six seconds. Arrow keys or a swipe change the photo; Esc closes."}</p><Slideshow photos={photos} big={parent} /></>}
          {canEdit && <UploadFile section="family_history" label="Add a photo to the slideshow" back="/collections/photos"
            notes={photoTags.map((t) => ({ label: t, value: `${PHOTO_TAG.prefix}${t}${PHOTO_TAG.suffix}` }))} newTab={PHOTO_TAG} />}
        </section>
      )}

      {tab === "photos" && (
        <CollapsibleCard title={`Shared albums (${albums.length})`} className="mb-6">
            <p className="mb-3 text-[0.95rem] text-ink-soft">{parent ? "Albums the family has shared. Tap one to open it." : "Links to albums that live in Google Photos. The app keeps the link as a reference; the photos stay where they are."} Google Photos albums can’t play in the slideshow, so they open with their link.</p>
            {albums.length === 0 ? <Empty>No album links saved yet.</Empty> : (
              <ul className="divide-y divide-rule-soft">
                {albums.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div><div className={`font-semibold ${parent ? "text-[1.2rem]" : ""}`}>{a.title}</div>{a.note && <div className="text-[0.9rem] text-ink-soft">{a.note}</div>}{!parent && <div className="text-[0.8rem] text-ink-soft">{a.provider === "google_photos" ? "Google Photos" : a.provider === "icloud" ? "iCloud" : "Link"} · added {fmtDate(a.created_at, { year: "numeric" })}{a.added_by_name && ` by ${a.added_by_name}`}</div>}</div>
                    <a href={a.url} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Open album ↗</a>
                  </li>
                ))}
              </ul>
            )}
            {canEdit && !parent && <div className="mt-3"><AddAlbumButton /></div>}
          </CollapsibleCard>
      )}

      {items.length === 0 ? <Empty>Nothing recorded yet.</Empty> : (
        <div className="flex flex-col gap-6">
          {GROUPS.filter((g) => t.categories.includes(g.key)).map((g) => {
            const list = items.filter((i) => i.category === g.key);
            if (list.length === 0) return null;
            const Icon = g.key === "book" ? Book : g.key === "love_letter" ? Heart : g.key === "interview" ? Mic : Tag;
            return (
              <section key={g.key} className="card">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evergreen-tint text-evergreen"><Icon size={22} /></div>
                  <div>
                    <h2 className="text-[1.35rem] font-semibold leading-tight">{g.title}</h2>
                    {!parent && <div className="text-[0.9rem] text-ink-soft">{g.blurb}</div>}
                  </div>
                </div>
                <ul className="divide-y divide-rule-soft">
                  {list.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className={`font-semibold ${parent ? "text-[1.3rem]" : "text-[1.1rem]"}`}>{i.title}</div>
                        <div className="text-[0.95rem] text-ink-soft">{i.owner === "both" ? "Both" : subjectName(i.owner)}{i.period && ` · ${i.period}`}{i.location && ` · ${i.location}`}</div>
                        {i.note && <div className="text-[0.95rem] text-ink-soft">{i.note}</div>}
                        {!parent && <div className="text-[0.8rem] text-ink-soft">Added {fmtDate(i.created_at, { year: "numeric" })}{i.added_by_name && ` by ${i.added_by_name}`}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {i.url && <a href={i.url} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Open ↗</a>}
                        {canEdit && <RemoveCollectionButton id={i.id} title={i.title} />}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
