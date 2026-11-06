import { notFound } from "next/navigation";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { VideoPlayer, AudioPlayer } from "@/components/media/player";

export const dynamic = "force-dynamic";

type Pub = {
  id: string; title: string; subtitle: string | null; intro: string | null; obituary: string | null;
  service: { when?: string; where?: string; address?: string; notes?: string; livestream_url?: string };
  published_at: string | null;
  blocks: { id: string; position: number; kind: string; text: string | null; media_item_id: string | null; media_item_ids: string[] }[];
  media: { id: string; kind: string; title: string | null; caption: string | null; story: string | null; imported_file_id: string | null; poster_file_id: string | null }[];
};

async function load(slug: string, token: string): Promise<Pub | null> {
  if (isDemo()) {
    const s = demoStore();
    const page = s.tributes.find((p) => p.slug === slug && p.status === "published" && p.share_token === token);
    if (!page) return null;
    const blocks = s.tributeBlocks.filter((b) => b.page_id === page.id).sort((a, b) => a.position - b.position);
    const ids = new Set(blocks.flatMap((b) => [b.media_item_id, ...b.media_item_ids]).filter(Boolean) as string[]);
    return { ...page, blocks, media: s.media.filter((m) => ids.has(m.id)) };
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("tribute_public", { p_slug: slug, p_token: token });
  return (data as Pub | null) ?? null;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params; const { t } = await searchParams;
  const page = t ? await load(slug, t) : null;
  return { title: page ? page.title : "Not found", robots: { index: false, follow: false } };
}

export default async function TributePublicPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params; const { t } = await searchParams;
  const page = t ? await load(slug, t) : null;
  if (!page) notFound();
  const file = (id: string | null) => (id ? `/api/tribute/${t}/file/${id}` : "");
  const media = (id: string | null) => page.media.find((m) => m.id === id) ?? null;

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-10 sm:px-8 sm:py-14">
      <header className="mb-8 text-center">
        <div className="eyebrow">In loving memory</div>
        <h1 className="mt-1 text-[2.4rem] font-semibold leading-tight sm:text-[3rem]">{page.title}</h1>
        {page.subtitle && <p className="mt-1 text-[1.3rem] text-ink-soft">{page.subtitle}</p>}
        {page.intro && <p className="mx-auto mt-4 max-w-[60ch] text-[1.1rem]">{page.intro}</p>}
      </header>

      <div className="flex flex-col gap-8">
        {page.blocks.map((b) => {
          if (b.kind === "heading") return <h2 key={b.id} className="text-[1.8rem] font-semibold">{b.text}</h2>;
          if (b.kind === "text") return <p key={b.id} className="whitespace-pre-line text-[1.1rem]">{b.text}</p>;
          if (b.kind === "story") return <blockquote key={b.id} className="rounded-2xl border-l-4 border-brass bg-paper px-6 py-5 text-[1.1rem] italic">{b.text}</blockquote>;
          if (b.kind === "service") return (
            <section key={b.id} className="on-dark rounded-3xl bg-evergreen p-7 text-paper">
              <div className="eyebrow text-brass">The service</div>
              {page.service.when && <div className="mt-1 text-[1.4rem] font-semibold">{page.service.when}</div>}
              {page.service.where && <div className="text-[1.1rem]">{page.service.where}</div>}
              {page.service.address && <div className="text-mist">{page.service.address}</div>}
              {page.service.notes && <div className="mt-2 text-mist">{page.service.notes}</div>}
              {page.service.livestream_url && <a href={page.service.livestream_url} className="btn-brass mt-4">Watch the livestream</a>}
            </section>
          );
          if (b.kind === "media") {
            const m = media(b.media_item_id); if (!m?.imported_file_id) return null;
            return (
              <figure key={b.id} className="m-0">
                {m.kind === "audio_story" ? <AudioPlayer src={file(m.imported_file_id)} title={m.title ?? "Recording"} /> : <VideoPlayer src={file(m.imported_file_id)} poster={m.poster_file_id ? file(m.poster_file_id) : null} title={m.title ?? "Video"} />}
                <figcaption className="mt-2 text-center text-ink-soft">{b.text ?? m.caption ?? m.title}</figcaption>
              </figure>
            );
          }
          if (b.kind === "gallery") return (
            <div key={b.id} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {b.media_item_ids.map((id) => { const m = media(id); return m?.imported_file_id ? <img key={id} src={file(m.imported_file_id)} alt={m.caption ?? m.title ?? ""} loading="lazy" className="aspect-square w-full rounded-xl object-cover" /> : null; })}
            </div>
          );
          return null;
        })}
        {page.obituary && <section><h2 className="text-[1.8rem] font-semibold">Obituary</h2><p className="mt-2 whitespace-pre-line text-[1.1rem]">{page.obituary}</p></section>}
      </div>
      <footer className="mt-12 text-center text-[0.85rem] text-ink-soft">Shared privately by the family{page.published_at && ` · ${fmtDate(page.published_at, { year: "numeric" })}`}. Please don’t repost this link publicly.</footer>
    </main>
  );
}
