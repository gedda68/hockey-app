"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { PickerSeason } from "@/lib/competitions/competitionPickerOptions";

interface CompetitionPickerProps {
  seasons: PickerSeason[];
  selectedId: string;
}

/**
 * Compact season + competition selector. Stays one line high however many
 * competitions exist (pills wrapped onto many lines and pushed content off-screen).
 */
export default function CompetitionPicker({ seasons, selectedId }: CompetitionPickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const current =
    seasons.find((s) => s.groups.some((g) => g.options.some((o) => o.id === selectedId))) ?? seasons[0];
  if (!current) return null;

  const all = current.groups.flatMap((g) => g.options);
  const idx = all.findIndex((o) => o.id === selectedId);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const go = (href: string) => href && startTransition(() => router.push(href));

  const selectCls =
    "h-12 appearance-none rounded-xl border border-white/15 bg-white/10 pl-4 pr-10 text-base font-semibold text-white shadow-sm outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-sky-400 [&_optgroup]:bg-white [&_optgroup]:text-slate-500 [&_option]:bg-white [&_option]:text-slate-900";
  const arrowBtn =
    "flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lg text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending}>
      {seasons.length > 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Season</span>
          <span className="relative">
            <select
              className={`${selectCls} min-w-[7.5rem]`}
              value={current.season}
              onChange={(e) => go(seasons.find((s) => s.season === e.target.value)?.firstHref ?? "")}
            >
              {seasons.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.season}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>
      )}

      <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Competition</span>
        <span className="relative">
          <select
            className={`${selectCls} w-full sm:min-w-[18rem]`}
            value={idx >= 0 ? selectedId : ""}
            onChange={(e) => go(all.find((o) => o.id === e.target.value)?.href ?? "")}
          >
            {idx < 0 && <option value="">Choose a competition…</option>}
            {current.groups.map((g) =>
              current.groups.length > 1 ? (
                <optgroup key={g.league} label={g.league}>
                  {g.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              ),
            )}
          </select>
          <Chevron />
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          className={arrowBtn}
          disabled={!prev || pending}
          onClick={() => prev && go(prev.href)}
          aria-label={prev ? `Previous: ${prev.label}` : "Previous competition"}
          title={prev?.label}
        >
          ‹
        </button>
        <button
          type="button"
          className={arrowBtn}
          disabled={!next || pending}
          onClick={() => next && go(next.href)}
          aria-label={next ? `Next: ${next.label}` : "Next competition"}
          title={next?.label}
        >
          ›
        </button>
      </div>

      {pending && <span className="pb-3 text-sm text-slate-400">Loading…</span>}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/70"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
    </svg>
  );
}
