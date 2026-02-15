// components/news/NewsSidebar.tsx
"use client";

import { useState } from "react";
import { Calendar, ChevronRight, Sparkles } from "lucide-react";
import { NewsItem } from "@/types/news";
import NewsModal from "./NewsModal";

interface NewsSidebarProps {
  newsItems: NewsItem[];
}

export default function NewsSidebar({ newsItems }: NewsSidebarProps) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  if (!newsItems || newsItems.length === 0) {
    return null;
  }

  return (
    <>
      {/* Sidebar - 300px wide with modern styling */}
      <aside className="w-50 mt-12 bg-linear-to-br from-white via-slate-50 to-slate-100 border-r border-slate-200/50 shadow-xl overflow-y-auto">
        {/* Header Section */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] p-6 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Latest News
              </h2>
              <p className="text-sm text-white/90 font-medium mt-0.5">
                {newsItems.length}{" "}
                {newsItems.length === 1 ? "Update" : "Updates"}
              </p>
            </div>
          </div>
        </div>

        {/* News Items List */}
        <div className="p-4 space-y-3">
          {newsItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className="w-full text-left group"
            >
              <div className="relative bg-white rounded-2xl p-5 border-2 border-transparent hover:border-yellow-400 transition-all duration-300 shadow-sm hover:shadow-xl group-hover:-translate-y-1">
                {/* New badge for recent items */}
                {index === 0 && (
                  <div className="absolute -top-2 -right-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-yellow-400 text-white text-xs font-black uppercase rounded-full shadow-lg">
                      New
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-black text-slate-900 text-base line-clamp-2 group-hover:text-[#06054e] transition-colors mb-2">
                      {item.title}
                    </h3>

                    {/* Date and Author */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
                        <Calendar size={12} className="text-slate-500" />
                        <span className="text-slate-600 font-semibold">
                          {new Date(item.publishDate).toLocaleDateString(
                            "en-AU",
                            {
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </span>
                      </div>
                      {item.author && (
                        <span className="text-slate-500 font-medium">
                          by {item.author}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 mt-1">
                    <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl group-hover:from-green-500 group-hover:to-green-600 transition-all duration-300 group-hover:scale-110">
                      <ChevronRight size={18} className="text-white" />
                    </div>
                  </div>
                </div>

                {/* Hover effect line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </button>
          ))}
        </div>

        {/* Bottom gradient fade */}
        <div className="sticky bottom-0 h-20 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
      </aside>

      {/* News Modal */}
      <NewsModal
        newsItem={selectedNews}
        isOpen={!!selectedNews}
        onClose={() => setSelectedNews(null)}
      />
    </>
  );
}
