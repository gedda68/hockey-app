import Link from "next/link";
import type { PathwayCardModel } from "@/lib/website/pathwaysCards";

export default function PathwaysGrid({
  cards,
  variant,
  heading = "Get involved",
  intro,
  className = "",
}: {
  cards: PathwayCardModel[];
  variant: "dark" | "light";
  heading?: string;
  intro?: string;
  className?: string;
}) {
  const isDark = variant === "dark";
  const sectionCls = isDark ? "text-white" : "text-slate-900";
  const cardCls = isDark
    ? "rounded-2xl border border-white/12 bg-white/5 p-5 shadow-sm backdrop-blur-sm"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const titleCls = isDark
    ? "text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200"
    : "text-[10px] font-black uppercase tracking-[0.28em] text-[#06054e]/80";
  const blurbCls = isDark ? "mt-2 text-sm text-white/75" : "mt-2 text-sm text-slate-600";
  const linkCls = isDark
    ? "inline-flex rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-bold text-white hover:border-yellow-300/40"
    : "inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-[#06054e] hover:border-[#06054e]/30";

  return (
    <section
      className={`${sectionCls} ${className}`}
      aria-labelledby="pathways-grid-heading"
    >
      <h2 id="pathways-grid-heading" className={titleCls}>
        {heading}
      </h2>
      {intro ? (
        <p className={isDark ? "mt-2 max-w-2xl text-sm text-white/70" : "mt-2 max-w-2xl text-sm text-slate-600"}>
          {intro}
        </p>
      ) : null}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.id} className={cardCls}>
            <h3 className="text-lg font-black uppercase tracking-tight">{c.title}</h3>
            <p className={blurbCls}>{c.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.links.map((l) => (
                <Link key={`${c.id}-${l.href}-${l.label}`} href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
