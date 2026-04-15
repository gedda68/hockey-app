"use client";

export type TickerLine = { key: string; text: string };

export default function HomeResultsTicker({ lines }: { lines: TickerLine[] }) {
  return (
    <div
      className="relative mx-auto w-3/4 overflow-hidden rounded-2xl border border-white/90 bg-white/95 text-slate-800 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/10 backdrop-blur-md"
      style={{
        // Prevent scroll anchoring from "helpfully" adjusting scroll position when the ticker updates.
        // This is a common source of small scroll jumps on refresh.
        overflowAnchor: "none",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

      {/* Fixed height prevents scroll jump if lines temporarily change */}
      <div className="h-10 flex items-center">
        {lines.length === 0 ? (
          <div className="px-4 text-xs font-black uppercase tracking-widest text-slate-400" aria-hidden>
            {/* keep height stable even while loading */}
          </div>
        ) : (
          <div
            className="home-marquee-track gap-16 items-center"
            suppressHydrationWarning
          >
            {[0, 1].map((dup) =>
              lines.map((line, i) => (
                <span
                  key={`${dup}-${line.key}-${i}`}
                  className="text-xs md:text-sm font-bold tracking-wide text-slate-800 whitespace-nowrap"
                >
                  <span className="text-[#06054e] mr-2" aria-hidden>
                    ●
                  </span>
                  {line.text}
                </span>
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
