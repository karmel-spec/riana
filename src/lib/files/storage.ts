/** The private storage bucket and how object keys are built (the first segment is the section the policies check). */
export const BUCKET = "binder";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_MIME = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf", "audio/mpeg", "audio/mp4", "video/mp4", "video/quicktime", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

const safeName = (name: string) => name.normalize("NFKD").replace(/[^\w.() -]+/g, "_").replace(/_{2,}/g, "_").slice(0, 150) || "file";
export const objectKey = (section: string, id: string, name: string) => `${section}/${id}/${safeName(name)}`;
export const mediaKindFor = (mime: string): "image" | "pdf" | "audio" | "video" | "document" | "other" =>
  mime.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : /word|text/.test(mime) ? "document" : "other";

const EXT_MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", heif: "image/heif", webp: "image/webp",
  mp3: "audio/mpeg", m4a: "audio/mp4", mp4: "video/mp4", mov: "video/quicktime", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain", md: "text/plain" };
/** Best guess at a file's type: what we were told, else what Drive served, else the extension. */
export function resolveMime(name: string, ...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) { const m = (c ?? "").split(";")[0].trim().toLowerCase(); if (m && UPLOAD_MIME.includes(m)) return m; }
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return EXT_MIME[ext] ?? null;
}
