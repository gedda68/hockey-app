import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Shared skeleton primitives for route-level `loading.tsx` files.
 * Two tones match the two public page backgrounds: the dark navy gradient used
 * across /competitions, and the light slate used by clubs and news.
 */
export type SkeletonTone = "dark" | "light";

const BLOCK_TONE: Record<SkeletonTone, string> = {
  dark: "bg-white/10",
  light: "bg-slate-200",
};

const PAGE_TONE: Record<SkeletonTone, string> = {
  dark: "min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-16 pt-8 md:px-8",
  light: "min-h-screen bg-slate-50 p-4 md:p-12",
};

const CARD_TONE: Record<SkeletonTone, string> = {
  dark: "bg-[#06054e] border border-white/10",
  light: "bg-white border border-slate-200",
};

export function SkeletonBlock({
  tone = "dark",
  className,
}: {
  tone?: SkeletonTone;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded", BLOCK_TONE[tone], className)}
    />
  );
}

/**
 * Page-level wrapper. Announces a busy region to assistive tech, so skeleton
 * children can stay `aria-hidden`.
 */
export function PageSkeleton({
  tone = "dark",
  label = "Loading…",
  children,
}: {
  tone?: SkeletonTone;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={PAGE_TONE[tone]}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Back link stub + page title + optional subtitle line. */
export function HeaderSkeleton({
  tone = "dark",
  subtitle = true,
}: {
  tone?: SkeletonTone;
  subtitle?: boolean;
}) {
  return (
    <div className="mb-10">
      <SkeletonBlock tone={tone} className="mb-6 h-2.5 w-28" />
      <SkeletonBlock tone={tone} className="h-10 w-64 max-w-full" />
      {subtitle && <SkeletonBlock tone={tone} className="mt-3 h-3 w-80 max-w-full" />}
    </div>
  );
}

/** A row of pill-shaped filter chips (or a single select-sized pill). */
export function FilterChipsSkeleton({
  count = 3,
  tone = "dark",
  className,
}: {
  count?: number;
  tone?: SkeletonTone;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap gap-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock
          key={i}
          tone={tone}
          className={cn("h-8 rounded-full", i % 2 === 0 ? "w-24" : "w-32")}
        />
      ))}
    </div>
  );
}

/** Responsive grid of card placeholders (leagues, clubs, tournaments, awards). */
export function CardGridSkeleton({
  count = 6,
  tone = "dark",
  className,
}: {
  count?: number;
  tone?: SkeletonTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn("rounded-3xl p-6 shadow-lg", CARD_TONE[tone])}
        >
          <SkeletonBlock tone={tone} className="mb-4 h-2.5 w-20" />
          <SkeletonBlock tone={tone} className="mb-3 h-6 w-3/4" />
          <SkeletonBlock tone={tone} className="mb-2 h-3 w-full" />
          <SkeletonBlock tone={tone} className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Stacked list rows (fixtures, news items, search-style lists). */
export function ListRowsSkeleton({
  rows = 6,
  tone = "dark",
  className,
}: {
  rows?: number;
  tone?: SkeletonTone;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn("flex items-center gap-4 rounded-2xl p-4", CARD_TONE[tone])}
        >
          <SkeletonBlock tone={tone} className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock tone={tone} className="h-3.5 w-1/2" />
            <SkeletonBlock tone={tone} className="h-2.5 w-1/3" />
          </div>
          <SkeletonBlock tone={tone} className="h-6 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Table card with a header row and `rows` body rows (ladders, stat tables). */
export function TableSkeleton({
  rows = 10,
  columns = 4,
  tone = "dark",
  className,
}: {
  rows?: number;
  columns?: number;
  tone?: SkeletonTone;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-3xl p-6 shadow-2xl md:p-8", CARD_TONE[tone], className)}
    >
      <SkeletonBlock tone={tone} className="mb-2 h-7 w-64 max-w-full" />
      <SkeletonBlock tone={tone} className="mb-6 h-3 w-32" />
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4">
            <SkeletonBlock tone={tone} className="h-4 w-6 shrink-0" />
            <SkeletonBlock tone={tone} className="h-4 flex-1" />
            {Array.from({ length: Math.max(columns - 2, 0) }, (_, c) => (
              <SkeletonBlock key={c} tone={tone} className="h-4 w-10 shrink-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Page wrapper for the "paper" look (light gradient, centred column) used by
 * news and tournament pages. `widthClass` should match the real page's column.
 */
export function PaperPageSkeleton({
  label = "Loading…",
  widthClass = "max-w-3xl",
  children,
}: {
  label?: string;
  widthClass?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white"
    >
      <span className="sr-only">{label}</span>
      <div className={cn("mx-auto px-4 py-12", widthClass)}>{children}</div>
    </div>
  );
}

/** Generic detail view: back link, title, meta line, then body paragraphs or panels. */
export function DetailSkeleton({
  tone = "light",
  paragraphs = 6,
}: {
  tone?: SkeletonTone;
  paragraphs?: number;
}) {
  return (
    <div aria-hidden="true">
      <SkeletonBlock tone={tone} className="mb-6 h-2.5 w-24" />
      <SkeletonBlock tone={tone} className="mb-3 h-10 w-4/5" />
      <SkeletonBlock tone={tone} className="mb-8 h-3 w-48" />
      <div className="space-y-3">
        {Array.from({ length: paragraphs }, (_, i) => (
          <SkeletonBlock
            key={i}
            tone={tone}
            className={cn("h-3.5", i % 3 === 2 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}
