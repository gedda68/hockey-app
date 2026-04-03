// components/news/NewsModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, User } from "lucide-react";
import { NewsItem } from "@/types/news";
import Image from "next/image";
import { useEffect } from "react";
import { sanitizeHtml } from "@/lib/utils/sanitize";

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
          {/* Backdrop - Click to close */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            style={{ zIndex: 999998 }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal Container */}

          {/* Modal Container */}
          <div
            className="fixed inset-0 overflow-y-auto"
            style={{ zIndex: 999999 }}
            onClick={onClose} // ← Add this
          >
            <div className="min-h-screen px-4 py-8 flex items-start justify-center">
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                }}
                onClick={(e) => e.stopPropagation()} // ← Prevent closing when clicking inside modal
              >
                {/* Header */}
                <div className="bg-[#06054e] p-6 rounded-t-2xl relative">
                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="text-white" size={20} />
                  </button>

                  {/* Title */}
                  <h2 className="text-2xl font-black text-white uppercase pr-12">
                    {newsItem.title}
                  </h2>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-sm text-white/90">
                      <Calendar size={14} />
                      <span>
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
                      <div className="flex items-center gap-1.5 text-sm text-white/90">
                        <User size={14} />
                        <span>{newsItem.author}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {/* Image */}
                  {(newsItem.image || newsItem.imageUrl) && (
                    <div className="mb-6 rounded-xl overflow-hidden">
                      <Image
                        src={newsItem.imageUrl || newsItem.image || ""}
                        alt={newsItem.title}
                        width={800}
                        height={400}
                        className="w-full h-auto object-cover max-h-[400px]"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div
                    className="prose prose-slate max-w-none [&>p]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-2 [&>ul]:mb-3 [&>ol]:mb-3"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(newsItem.content) }}
                  />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200">
                  <button
                    onClick={onClose}
                    className="w-full px-6 py-3 bg-[#06054e] text-white rounded-lg font-bold hover:bg-[#06054e]/90 transition-colors"
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
