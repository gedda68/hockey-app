"use client";

import { useEffect, useRef } from "react";

interface LoadMoreProps {
  shown: number;
  total: number;
  onLoadMore: () => void;
  /** Noun for the status line, e.g. "clubs". */
  noun?: string;
  className?: string;
}

/**
 * Infinite scroll with a real button: the sentinel auto-loads the next page as it
 * nears the viewport, and the button does the same for keyboard users, screen readers
 * and browsers without IntersectionObserver. Renders only the status once all is shown.
 */
export default function LoadMore({ shown, total, onLoadMore, noun = "items", className }: LoadMoreProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = shown < total;

  useEffect(() => {
    const el = sentinel.current;
    if (!hasMore || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // `shown` re-arms the observer: if the sentinel is still on screen after a page
    // loads, the fresh observer fires again and keeps filling the viewport.
  }, [hasMore, shown, onLoadMore]);

  if (total === 0) return null;

  return (
    <div className={className ?? "mt-8 flex flex-col items-center gap-3"}>
      <p role="status" aria-live="polite" className="text-xs font-bold uppercase tracking-widest text-slate-500">
        Showing {shown} of {total} {noun}
      </p>
      {hasMore && (
        <>
          <div ref={sentinel} aria-hidden="true" className="h-px w-full" />
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-full bg-[#06054e] px-6 py-2 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            Show more {noun}
          </button>
        </>
      )}
    </div>
  );
}
