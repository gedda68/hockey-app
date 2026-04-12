"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeGallerySlide } from "@/lib/data/homeGallery";

export type GallerySlide = HomeGallerySlide;

type Props = {
  slides: GallerySlide[];
  /** ms between auto-advancing the main image */
  autoAdvanceMs?: number;
};

export default function HomeHeroGallery({
  slides,
  autoAdvanceMs = 6000,
}: Props) {
  const [active, setActive] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const n = slides.length;
  const safeIndex = n ? ((active % n) + n) % n : 0;
  const current = slides[safeIndex];

  const scrollThumbIntoView = useCallback((index: number) => {
    const el = thumbRefs.current[index];
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    scrollThumbIntoView(safeIndex);
  }, [safeIndex, scrollThumbIntoView]);

  useEffect(() => {
    if (n <= 1 || autoAdvanceMs <= 0) return;
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % n);
    }, autoAdvanceMs);
    return () => window.clearInterval(t);
  }, [n, autoAdvanceMs]);

  const select = (index: number) => {
    setActive(index);
    scrollThumbIntoView(index);
  };

  if (!n || !current) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div
        className="relative min-h-[280px] sm:min-h-[360px] md:min-h-[440px] lg:min-h-[460px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/80"
        role="region"
        aria-roledescription="carousel"
        aria-label="Photo gallery"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              i === safeIndex ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={i !== safeIndex}
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, min(896px, 75vw)"
                priority={i === 0}
              />
            ) : (
              <>
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
                />
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative h-full min-h-[280px] sm:min-h-[360px] md:min-h-[440px] lg:min-h-[460px] flex flex-col justify-end p-6 md:p-10">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-2">
                    {slide.subtitle ?? "From the grounds"}
                  </p>
                  <h3 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tight drop-shadow-lg max-w-2xl">
                    {slide.title}
                  </h3>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="relative w-full">
        <div
          className="grid w-full gap-1 sm:gap-1.5 md:gap-2"
          style={{
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          }}
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              onClick={() => select(i)}
              className={`relative w-full aspect-[4/3] min-w-0 rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 ${
                i === safeIndex
                  ? "ring-2 ring-yellow-400 ring-offset-1 sm:ring-offset-2 shadow-lg z-10"
                  : "ring-1 ring-slate-200 opacity-90 hover:opacity-100 hover:ring-slate-300"
              }`}
              aria-label={
                slide.imageUrl
                  ? `Photo ${i + 1}`
                  : `Show ${slide.title ?? "slide"}`
              }
              aria-selected={i === safeIndex}
            >
              {slide.imageUrl ? (
                <Image
                  src={slide.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 14vw, 120px"
                />
              ) : (
                <>
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
                  />
                  <div className="absolute inset-0 flex items-end p-0.5 sm:p-1 md:p-2 bg-black/15">
                    <span className="text-[6px] sm:text-[8px] md:text-[9px] font-black uppercase text-white leading-tight text-left line-clamp-2 drop-shadow">
                      {slide.title}
                    </span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
