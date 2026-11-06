import Link from "next/link";
import { requireSection } from "@/lib/session";
import * as data from "@/lib/data";
import { ensureDemoMedia } from "@/lib/media/service";
import { PageHeader } from "@/components/ui";
import { PlaylistPlayer } from "@/components/media/playlist-player";

export const metadata = { title: "Rich's Sing-Along" };

export default async function SingAlongPage() {
  const v = await requireSection("family_history");
  await ensureDemoMedia(v);
  const [media, playlists] = await Promise.all([data.getMediaItems(v), data.getPlaylists(v)]);
  const list = playlists.find((p) => p.slug === "sing-along");
  const tracks = (list?.track_ids ?? []).map((id) => media.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m && !!m.imported_file_id)
    .map((m) => ({ id: m.id, title: m.title ?? "Untitled", src: `/api/files/${m.imported_file_id}`, duration: m.duration_seconds }));
  const parent = v.role === "parent";

  return (
    <>
      <PageHeader title={list?.title ?? "Sing-Along"} intro={parent ? "Press the big button and sing along. It plays the next song by itself." : list?.description ?? undefined}
        actions={<Link href="/history" className="btn-secondary">Back to memories</Link>} />
      <PlaylistPlayer tracks={tracks} title={list?.title ?? "Sing-Along"} />
      {v.demo && <p className="mt-4 text-[0.9rem] text-ink-soft">In the sample preview each “song” is a short tone, so you can hear the player move from track to track.</p>}
    </>
  );
}
