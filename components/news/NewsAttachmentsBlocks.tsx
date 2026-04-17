"use client";

import Image from "next/image";
import { parseVideoEmbed } from "@/lib/website/videoEmbeds";
import { publicNewsAttachmentsForItem } from "@/lib/news/publicNewsAttachments";
import type { NewsItem } from "@/types/news";

function isLocalUpload(url: string) {
  return url.startsWith("/uploads/news/");
}

function HeroDedupeSet(hero?: string) {
  const h = String(hero ?? "").trim();
  const s = new Set<string>();
  if (h) s.add(h);
  return s;
}

export function NewsAttachmentsBlocks({
  newsItem,
  heroImageUrl,
  tone = "default",
}: {
  newsItem: Pick<NewsItem, "attachments" | "videoUrl" | "image" | "imageUrl">;
  heroImageUrl?: string | null;
  tone?: "default" | "flowdownDark" | "flowdownLight";
}) {
  const hero = String(heroImageUrl ?? newsItem.imageUrl ?? newsItem.image ?? "").trim();
  const attachments = publicNewsAttachmentsForItem(newsItem);
  const skipUrls = HeroDedupeSet(hero);

  const card =
    tone === "flowdownDark"
      ? "rounded-xl border border-white/10 bg-black/20"
      : tone === "flowdownLight"
        ? "rounded-xl border border-slate-200 bg-white"
        : "rounded-xl border border-slate-200 bg-slate-50";

  const muted =
    tone === "flowdownDark" ? "text-white/60" : tone === "flowdownLight" ? "text-slate-500" : "text-slate-500";

  return (
    <div className="space-y-4">
      {attachments.map((a) => {
        if (a.kind === "image") {
          if (skipUrls.has(a.url)) return null;
          skipUrls.add(a.url);
          if (!isLocalUpload(a.url)) {
            // eslint-disable-next-line @next/next/no-img-element -- may be legacy external CMS URLs
            return (
              <div key={`${a.id}:${a.url}`} className={`overflow-hidden ${card}`}>
                <img src={a.url} alt={a.title || ""} className="h-auto w-full max-h-[420px] object-cover" />
              </div>
            );
          }
          return (
            <div key={`${a.id}:${a.url}`} className={`overflow-hidden ${card}`}>
              <Image
                src={a.url}
                alt={a.title || newsItem.imageUrl || "News image"}
                width={1200}
                height={675}
                className="h-auto w-full max-h-[420px] object-cover"
              />
            </div>
          );
        }

        if (a.kind === "video_link") {
          const embed = parseVideoEmbed(a.url);
          if (!embed) return null;
          return (
            <div key={`${a.id}:${a.url}`} className={`overflow-hidden ${card}`}>
              <div className="relative w-full pt-[56.25%]">
                <iframe
                  title={a.title || "Video"}
                  src={embed.embedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        }

        if (a.kind === "video") {
          if (!isLocalUpload(a.url)) return null;
          return (
            <div key={`${a.id}:${a.url}`} className={`overflow-hidden ${card}`}>
              <video className="h-auto w-full" controls playsInline preload="metadata">
                <source src={a.url} type={a.mime || undefined} />
              </video>
            </div>
          );
        }

        if (a.kind === "document") {
          if (!isLocalUpload(a.url)) return null;
          return (
            <div key={`${a.id}:${a.url}`} className={`overflow-hidden ${card}`}>
              <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${
                tone === "flowdownDark" ? "border-white/10" : "border-slate-200"
              }`}>
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">{a.title || "PDF"}</div>
                  <div className={`text-xs ${muted}`}>PDF</div>
                </div>
                <a
                  className={`text-xs font-black uppercase tracking-wide underline shrink-0 ${
                    tone === "flowdownDark" ? "text-emerald-200" : "text-[#06054e]"
                  }`}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </div>
              <div className="h-[420px] w-full bg-white">
                <iframe title={a.title || "PDF"} src={a.url} className="h-full w-full" />
              </div>
            </div>
          );
        }

        // file (or unknown-safe)
        if (!isLocalUpload(a.url)) return null;
        return (
          <div key={`${a.id}:${a.url}`} className={`px-4 py-3 ${card}`}>
            <div className="text-sm font-black truncate">{a.title || a.filename || "Attachment"}</div>
            <div className={`text-xs ${muted} mt-1`}>{a.mime || "Download"}</div>
            <a
              className={`mt-3 inline-flex text-xs font-black uppercase tracking-wide underline ${
                tone === "flowdownDark" ? "text-emerald-200" : "text-[#06054e]"
              }`}
              href={a.url}
              download={a.filename}
            >
              Download
            </a>
          </div>
        );
      })}
    </div>
  );
}
