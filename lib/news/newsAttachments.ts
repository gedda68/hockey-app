import type { NewsAttachment } from "@/types/news";
import { parseVideoEmbed } from "@/lib/website/videoEmbeds";

export type AttachmentDraft = NewsAttachment & {
  /** Present only before upload completes on the server */
  _localFile?: File;
};

export const MAX_NEWS_ATTACHMENT_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_NEWS_ATTACHMENT_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_NEWS_ATTACHMENT_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function inferAttachmentKind(file: File): NewsAttachment["kind"] {
  const t = file.type || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t === "application/pdf") return "document";
  return "file";
}

export function assertAttachmentFileLimits(file: File, kind: NewsAttachment["kind"]): string | null {
  const size = file.size;
  if (kind === "image" && size > MAX_NEWS_ATTACHMENT_IMAGE_BYTES) {
    return "Images must be 8MB or smaller.";
  }
  if (kind === "video" && size > MAX_NEWS_ATTACHMENT_VIDEO_BYTES) {
    return "Videos must be 60MB or smaller.";
  }
  if ((kind === "document" || kind === "file") && size > MAX_NEWS_ATTACHMENT_DOCUMENT_BYTES) {
    return "Documents and other files must be 20MB or smaller.";
  }
  return null;
}

export function validatePersistedAttachmentUrl(
  kind: NewsAttachment["kind"],
  url: string,
): boolean {
  const u = url.trim();
  if (!u) return false;

  if (kind === "video_link") {
    return Boolean(parseVideoEmbed(u));
  }

  // Uploaded files must remain on our local news upload path.
  if (!u.startsWith("/uploads/news/")) return false;

  const lower = u.toLowerCase();
  if (kind === "document") return lower.endsWith(".pdf");
  if (kind === "video") {
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".m4v") ||
      lower.endsWith(".ogv")
    );
  }
  if (kind === "image") {
    return (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".avif") ||
      lower.endsWith(".svg")
    );
  }
  // "file" — anything stored under our uploads path is acceptable.
  return true;
}

export function normalizeAttachmentsFromDoc(
  doc: Record<string, unknown> | null | undefined,
): NewsAttachment[] {
  const raw = doc?.attachments;
  if (Array.isArray(raw)) {
    const out: NewsAttachment[] = [];
    for (const a of raw) {
      if (!a || typeof a !== "object") continue;
      const r = a as Record<string, unknown>;
      const kind = r.kind;
      if (kind !== "image" && kind !== "video" && kind !== "document" && kind !== "file" && kind !== "video_link") {
        continue;
      }
      const url = typeof r.url === "string" ? r.url.trim() : "";
      if (!url) continue;
      out.push({
        id:
          typeof r.id === "string" && r.id.trim()
            ? r.id.trim()
            : `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        kind,
        url,
        title: typeof r.title === "string" ? r.title : undefined,
        mime: typeof r.mime === "string" ? r.mime : undefined,
        filename: typeof r.filename === "string" ? r.filename : undefined,
        sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : undefined,
      });
    }
    if (out.length) return out.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  // Legacy migration (single image + optional video URL)
  const legacyImg =
    (typeof doc?.imageUrl === "string" && doc.imageUrl.trim()) ||
    (typeof doc?.image === "string" && doc.image.trim()) ||
    "";
  const legacyVideo = typeof doc?.videoUrl === "string" ? doc.videoUrl.trim() : "";

  const migrated: NewsAttachment[] = [];
  if (legacyImg) {
    migrated.push({
      id: "legacy-image",
      kind: "image",
      url: legacyImg,
      title: "Image",
    });
  }
  if (legacyVideo) {
    migrated.push({
      id: "legacy-video",
      kind: "video_link",
      url: legacyVideo,
      title: "Video",
    });
  }
  return migrated;
}

export function primaryImageFromAttachments(attachments: NewsAttachment[]): string | null {
  const first = attachments.find((a) => a.kind === "image");
  return first?.url ?? null;
}

export function legacyVideoUrlFromAttachments(attachments: NewsAttachment[]): string | null {
  const v = attachments.find((a) => a.kind === "video_link");
  return v?.url?.trim() ? v.url.trim() : null;
}

export function isSafePublicAttachmentUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("/uploads/news/")) return true;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (parseVideoEmbed(u)) return true;
    return false;
  } catch {
    return false;
  }
}
