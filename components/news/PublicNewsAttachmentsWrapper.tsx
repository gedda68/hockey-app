"use client";

import { NewsAttachmentsBlocks } from "@/components/news/NewsAttachmentsBlocks";
import type { PublicNewsItem } from "@/lib/data/publicNews";

export default function PublicNewsAttachmentsWrapper({
  item,
  heroImageUrl,
}: {
  item: Pick<
    PublicNewsItem,
    "attachments" | "videoUrl" | "image" | "imageUrl"
  >;
  /** When the hero is rendered above, pass the same URL so attachments skip duplicating it. */
  heroImageUrl?: string | null;
}) {
  return (
    <NewsAttachmentsBlocks newsItem={item} heroImageUrl={heroImageUrl} />
  );
}
