"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  PublicNewsFlowSectionDTO,
  PublicNewsLineDTO,
} from "@/lib/data/newsFlowdown";
import { NewsAttachmentsBlocks } from "@/components/news/NewsAttachmentsBlocks";

function formatAuDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NewsFlowdownModal({
  sections,
  variant = "dark",
}: {
  sections: PublicNewsFlowSectionDTO[];
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState<PublicNewsLineDTO | null>(null);

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onKey]);

  const isDark = variant === "dark";
  const panel = isDark
    ? "border-white/15 bg-[#0b1220]/95 text-white"
    : "border-slate-200 bg-white text-slate-900";
  const line = isDark
    ? "border-white/10 bg-white/5 text-white hover:border-yellow-400/25"
    : "border-slate-200 bg-slate-50 text-slate-900 hover:border-[#06054e]/30";
  const muted = isDark ? "text-white/55" : "text-slate-500";
  const attachTone = isDark ? "flowdownDark" : "flowdownLight";

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  if (total === 0) {
    return (
      <p className={`text-sm ${muted}`}>
        No published news for this hub yet. Parent associations can publish items that flow down
        here.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-10">
        {sections.map((section) => (
          <div key={section.sectionKey}>
            <div
              className={`flex flex-col gap-0.5 border-b pb-2 sm:flex-row sm:items-end sm:justify-between ${
                isDark ? "border-white/10" : "border-slate-200"
              }`}
            >
              <h3
                className={`text-[10px] font-black uppercase tracking-[0.28em] ${
                  isDark ? "text-emerald-200" : "text-[#06054e]"
                }`}
              >
                {section.title}
              </h3>
              {section.subtitle ? (
                <p className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>
                  {section.subtitle}
                </p>
              ) : null}
            </div>
            {section.items.length === 0 ? (
              <p className={`mt-3 text-sm ${muted}`}>No items in this section.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li key={`${section.sectionKey}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => setOpen(item)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${line}`}
                    >
                      <div className={`text-xs font-semibold ${muted}`}>
                        {formatAuDate(item.publishDate)}
                        {item.author ? ` · ${item.author}` : ""}
                      </div>
                      <div className="mt-1 font-bold">{item.title}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-flow-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setOpen(null)}
          />
          <div
            className={`relative z-[81] max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl ${panel}`}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              className={`absolute right-4 top-4 rounded-full p-2 ${
                isDark ? "text-white/70 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"
              }`}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <p id="news-flow-title" className={`pr-10 text-xs font-bold uppercase tracking-widest ${muted}`}>
              {formatAuDate(open.publishDate)}
              {open.author ? ` · ${open.author}` : ""}
            </p>
            <h4 className="mt-2 text-xl font-black leading-snug">{open.title}</h4>
            {open.imageUrl || open.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- CMS URLs may be external
              <img
                src={open.imageUrl || open.image}
                alt=""
                className="mt-4 max-h-56 w-full rounded-xl object-cover"
              />
            ) : null}
            <div className="mt-4">
              <NewsAttachmentsBlocks
                tone={attachTone}
                newsItem={{
                  attachments: open.attachments,
                  videoUrl: open.videoUrl,
                  image: open.image,
                  imageUrl: open.imageUrl,
                }}
                heroImageUrl={open.imageUrl || open.image}
              />
            </div>
            {open.content ? (
              <div
                className={`mt-4 whitespace-pre-wrap text-sm leading-relaxed ${
                  isDark ? "text-white/85" : "text-slate-700"
                }`}
              >
                {open.content}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
