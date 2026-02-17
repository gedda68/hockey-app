// components/news/NewsSidebar.tsx
"use client";

import { useState } from "react";
import { NewsItem } from "@/types/news";
import NewsModal from "./NewsModal";

interface NewsSidebarProps {
  newsItems: NewsItem[];
}

export default function NewsSidebar({ newsItems }: NewsSidebarProps) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  if (!newsItems || newsItems.length === 0) return null;

  return (
    <>
      {/* 1. INCREASED WIDTH: Moved to 450px to make it a significant panel */}
      <aside className="mt-8 w-[450px] flex-none border-l border-white/10 p-8 overflow-y-auto h-[calc(100vh-73px)] bg-black/10">
        {/* Header - Left Aligned */}
        <div className="mb-10">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Latest News
          </h2>
          <div className="h-1.5 w-12 bg-yellow-400 mt-2 mb-3" />
          <p className="text-xs text-white/40 uppercase font-bold tracking-widest">
            {newsItems.length}{" "}
            {newsItems.length === 1 ? "Update Available" : "Total Updates"}
          </p>
        </div>

        {/* News Items */}
        <div className="space-y-4">
          {newsItems.map((item) => {
            const isNew =
              Date.now() - new Date(item.publishDate).getTime() <
              5 * 24 * 60 * 60 * 1000;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="w-full group block transition-transform active:scale-[0.98]"
              >
                {/* 2. JUSTIFICATION: items-start and text-left */}
                <div className="relative flex flex-col items-start bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-yellow-400/30 transition-all text-left">
                  {/* NEW Badge — Right Aligned */}
                  {isNew && (
                    <span className="absolute right-6 top-6 bg-yellow-400 text-[#06054e] text-[11px] font-black px-3 py-1 rounded-full uppercase shadow-lg shadow-yellow-400/20">
                      NEW
                    </span>
                  )}

                  {/* Date - Left Justified */}
                  <span className="text-xs font-bold text-yellow-400/60 uppercase mb-2">
                    {new Date(item.publishDate).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>

                  {/* Title - pr-20 to clear the badge space on the right */}
                  <h3 className="text-lg font-bold text-white pr-20 leading-snug group-hover:text-yellow-400 transition-colors">
                    {item.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <NewsModal
        newsItem={selectedNews}
        isOpen={!!selectedNews}
        onClose={() => setSelectedNews(null)}
      />
    </>
  );
}
