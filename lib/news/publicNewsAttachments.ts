import type { NewsAttachment, NewsItem } from "@/types/news";
import {
  isSafePublicAttachmentUrl,
  normalizeAttachmentsFromDoc,
} from "@/lib/news/newsAttachments";

function dedupeByIdOrUrl(items: NewsAttachment[]): NewsAttachment[] {
  const seen = new Set<string>();
  const out: NewsAttachment[] = [];
  for (const a of items) {
    const key = `${a.kind}:${a.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

export function publicNewsAttachmentsForItem(
  item: Pick<NewsItem, "attachments" | "videoUrl" | "image" | "imageUrl">,
): NewsAttachment[] {
  const doc = item as unknown as Record<string, unknown>;
  const hasExplicit = Array.isArray(item.attachments) && item.attachments.length > 0;
  const merged = dedupeByIdOrUrl(
    hasExplicit ? [...(item.attachments as NewsAttachment[])] : normalizeAttachmentsFromDoc(doc),
  );

  const hasVideoLink = merged.some((a) => a.kind === "video_link");
  const vu = String(item.videoUrl ?? "").trim();
  if (vu && !merged.some((a) => a.kind === "video_link" && a.url.trim() === vu)) {
    merged.push({
      id: "legacy-videoUrl",
      kind: "video_link",
      url: vu,
      title: "Video",
    });
  }

  merged.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return merged.filter((a) => isSafePublicAttachmentUrl(a.url));
}
