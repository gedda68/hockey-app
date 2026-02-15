// components/news/NewsModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, User, ExternalLink } from "lucide-react";
import { NewsItem } from "@/types/news";
import Image from "next/image";
import { useEffect } from "react";

interface NewsModalProps {
  newsItem: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsModal({
  newsItem,
  isOpen,
  onClose,
}: NewsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!newsItem) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur - HIGHEST z-index */}
          <motion.div
            className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-[#06054e]/95 to-black/95 backdrop-blur-md z-[99998]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal - HIGHEST z-index, always at top */}
          <div className="fixed inset-0 z-[99999] overflow-y-auto">
            <div className="min-h-screen px-4 py-8 flex items-start justify-center">
              <motion.div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden"
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.95 }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                }}
              >
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] p-8">
                  {/* Close button - top right */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:rotate-90 duration-300"
                    aria-label="Close"
                  >
                    <X className="text-white" size={24} />
                  </button>

                  {/* Title */}
                  <div className="pr-12">
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase leading-tight">
                      {newsItem.title}
                    </h2>

                    {/* Meta information */}
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
                        <Calendar size={16} className="text-white/90" />
                        <span className="text-sm font-bold text-white/90">
                          {new Date(newsItem.publishDate).toLocaleDateString(
                            "en-AU",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      {newsItem.author && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
                          <User size={16} className="text-white/90" />
                          <span className="text-sm font-bold text-white/90">
                            {newsItem.author}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content - Scrollable */}
                <div className="p-8 max-h-[60vh] overflow-y-auto">
                  {/* Image - LIMITED SIZE */}
                  {(newsItem.image || newsItem.imageUrl) && (
                    <div className="mb-8 rounded-2xl overflow-hidden shadow-xl border border-slate-200 max-w-2xl mx-auto">
                      <Image
                        src={newsItem.imageUrl || newsItem.image || ""}
                        alt={newsItem.title}
                        width={800}
                        height={400}
                        className="w-full h-auto object-contain max-h-[400px]"
                      />
                    </div>
                  )}

                  {/* Content with modern typography */}
                  <div className="prose prose-slate prose-lg max-w-none">
                    <div
                      className="text-slate-700 leading-relaxed [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-[#06054e] [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-slate-800 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>ul]:mb-4 [&>ol]:mb-4 [&>strong]:text-[#06054e] [&>strong]:font-black"
                      dangerouslySetInnerHTML={{ __html: newsItem.content }}
                    />
                  </div>
                </div>

                {/* Footer with action button */}
                <div className="border-t border-slate-200 p-6 bg-gradient-to-br from-slate-50 to-white">
                  <button
                    onClick={onClose}
                    className="w-full px-8 py-4 bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] text-white rounded-2xl font-black uppercase text-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
