// Grouping and captions for the Photos slideshow. Pure helpers so they can be tested.

export type SlidePhoto = { id: string; group: string; caption: string | null; taken_at: string | null };

/** Uploads from the Photos page carry this tag: "[Photos · Christmas] Opening presents, 1985". */
export const PHOTO_TAG = { prefix: "[Photos · ", suffix: "]" };

/**
 * Which slideshow group a photo belongs to: its note tag when it has one ("[Photos · Christmas]" → "Christmas",
 * "Journals → Rich" → "Journals → Rich"), otherwise the Drive folder it came from.
 */
export function photoGroup(note: string | null, folderName: string | null): string {
  const n = (note ?? "").trim();
  const bracket = n.match(/^\[([^\]]+)\]/);
  if (bracket) return bracket[1].replace(/^Photos\s*·\s*/i, "").trim() || "Photos";
  const arrow = n.match(/^([^→·(]+→[^·(]+)/);
  if (arrow) return arrow[1].replace(/\s+/g, " ").trim();
  return folderName?.trim() || "Other photos";
}

/** The words under a photo: the note without its tag. Empty when the note was only a tag. */
export function photoCaption(note: string | null): string | null {
  const rest = (note ?? "").replace(/^\[[^\]]*\]\s*/, "").replace(/^[^→·(]+→[^·(]+(\([^)]*\))?\s*·?\s*/, "").trim();
  return rest || null;
}

/** Group names with how many photos each holds, biggest first. */
export function photoGroups(photos: SlidePhoto[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of photos) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
