import Link from "next/link";
import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { ensureDemoMedia } from "@/lib/media/service";
import { Empty, PageHeader, SectionCard } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { Mic } from "@/components/icons";
import { VideoPlayer } from "@/components/media/player";
import { AddAlbumButton, MediaEditor, SyncMediaButton } from "./media-client";

export const metadata = { title: "Family History" };

export default async function HistoryPage() {
  const v = await requireSection("family_history");
  await ensureDemoMedia(v);
  const [media, playlists, albums] = await Promise.all([data.getMediaItems(v), data.getPlaylists(v), data.getSharedAlbums(v)]);
  const byYear = new Map<string, typeof media>();
  for (const m of media.filter((x) => x.kind === "photo" && x.review_status === "approved")) { const y = m.taken_on ? m.taken_on.slice(0, 4) : "Undated"; byYear.set(y, [...(byYear.get(y) ?? []), m]); }
  const years = [...byYear.entries()].sort((a, b) => (a[0] === "Undated" ? 1 : b[0] === "Undated" ? -1 : a[0].localeCompare(b[0])));
  const parent = v.role === "parent";
  const canEdit = canWrite(v, "family_history");
  const videos = media.filter((m) => m.kind === "video_story" && m.review_status === "approved");
  const photos = media.filter((m) => m.kind === "photo" && m.review_status === "approved");
  const audio = media.filter((m) => m.kind === "audio_story" && m.review_status === "approved");
  const sing = playlists.find((p) => p.slug === "sing-along");

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 16 · Family history"} title={parent ? "Memories" : "Family history archive"}
        intro={parent ? "Videos, songs and photos from the family. Tap one to watch or listen." : "Videos, audio, photos and stories, streamed from the shared Drive folders. Journals, the timeline and record-a-memory arrive in the next phase."}
        actions={<>{sing && <Link href="/history/singalong" className="btn-primary">🎵 Rich’s Sing-Along</Link>}{v.role === "super_admin" && <><Link href="/history/tribute" className="btn-secondary">Tribute pages</Link><SyncMediaButton /></>}</>} />

      <section className="mb-6">
        <h2 className="mb-3 text-[1.4rem] font-semibold">Videos ({videos.length})</h2>
        {videos.length === 0 ? <Empty>No videos yet. Approve the imported videos under Admin → Drive Import, then “Sync media”.</Empty> : (
          <div className="grid gap-5 md:grid-cols-2">
            {videos.map((m) => (
              <div key={m.id} className="card flex flex-col gap-3">
                <VideoPlayer src={`/api/files/${m.imported_file_id}`} poster={m.poster_file_id ? `/api/files/${m.poster_file_id}` : null} title={m.title ?? "Video"} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`font-semibold ${parent ? "text-[1.3rem]" : "text-[1.1rem]"}`}>{m.title ?? "Untitled"}</div>
                    <div className="text-[0.9rem] text-ink-soft">{[m.category, m.taken_on ? fmtDate(m.taken_on, { year: "numeric" }) : null, m.event_name].filter(Boolean).join(" · ")}</div>
                    {m.caption && <p className="mt-1 text-[0.95rem]">{m.caption}</p>}
                  </div>
                  {canEdit && !parent && <MediaEditor item={m} />}
                </div>
                {m.story && <p className="rounded-xl bg-parchment px-4 py-3 text-[0.95rem] italic">{m.story}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={`Songs & recordings (${audio.length})`} link={sing ? { href: "/history/singalong", label: "Open the playlist" } : undefined}>
          {audio.length === 0 ? <Empty>No recordings yet.</Empty> : (
            <ul className="divide-y divide-rule-soft">
              {audio.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className={parent ? "text-[1.15rem]" : ""}>{m.title}</span>
                  <span className="text-[0.85rem] text-ink-soft">{m.category === "music" ? "Sing-Along" : "Recording"}</span>
                </li>
              ))}
              {audio.length > 8 && <li className="py-2 text-[0.9rem] text-ink-soft">and {audio.length - 8} more</li>}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={`Photos (${photos.length})`}>
          {photos.length === 0 ? <Empty>No photos yet. Photos arrive from the Photos (Takeout) folder in Drive; duplicates are skipped by content hash.</Empty> : (
            <div className="flex flex-col gap-4">
              {years.map(([year, items]) => (
                <div key={year}>
                  <h3 className="mb-2 font-sans text-[0.85rem] font-bold uppercase tracking-wide text-brass-deep">{year} · {items.length}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {items.slice(0, 6).map((m) => (
                      <a key={m.id} href={`/api/files/${m.imported_file_id}`} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-lg bg-parchment">
                        <img src={`/api/files/${m.imported_file_id}`} alt={m.caption ?? m.title ?? "Family photo"} loading="lazy" className="h-full w-full object-cover" />
                        {m.taken_on && <span className="absolute bottom-1 left-1 rounded bg-ink/60 px-1.5 py-0.5 text-[0.7rem] text-paper">{fmtDate(m.taken_on, { year: "numeric" })}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={`Shared albums (${albums.length})`}>
          <p className="mb-3 text-[0.95rem] text-ink-soft">{parent ? "Albums the family has shared. Tap one to open it." : "Links to albums that live in Google Photos. The app keeps the link as a reference; the photos stay where they are."}</p>
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
        </SectionCard>
      </div>

      <section className="on-dark mt-6 flex flex-wrap items-center gap-6 rounded-3xl bg-evergreen-mid p-7 text-paper">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border-[6px] border-mist bg-paper text-ember"><Mic size={40} /></div>
        <div className="min-w-[240px] flex-1">
          <h2 className="text-[1.5rem] font-semibold leading-tight text-paper">Record a memory</h2>
          <p className="mt-1 text-mist">Recording from the iPad, with transcripts, is the next phase of the archive. The library already has room for transcripts and captions on every item.</p>
        </div>
      </section>
    </>
  );
}
