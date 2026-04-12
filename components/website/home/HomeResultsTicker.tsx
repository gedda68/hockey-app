"use client";

export type TickerLine = { key: string; text: string };

export default function HomeResultsTicker({ lines }: { lines: TickerLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="relative overflow-hidden bg-[#04033a] text-white border-b border-white/10">
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-[#04033a] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[#04033a] to-transparent pointer-events-none" />
      <div className="py-2.5">
        <div className="home-marquee-track gap-16 items-center">
          {[0, 1].map((dup) =>
            lines.map((line, i) => (
              <span
                key={`${dup}-${line.key}-${i}`}
                className="text-xs md:text-sm font-bold tracking-wide text-white/95 whitespace-nowrap"
              >
                <span className="text-yellow-300/90 mr-2">●</span>
                {line.text}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
