"use client";

import type { PublicSitePartner } from "@/lib/tenant/tenantPartners";

function recordPartnerStripClick(
  scopeType: "association" | "club",
  scopeId: string,
  slot: number,
) {
  const sid = scopeId.trim();
  if (!sid) return;
  const payload = JSON.stringify({ scopeType, scopeId: sid, slot });
  const url = "/api/public/partner-strip-click";
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    /* fall through */
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

export type PartnerStripLayout = "footer" | "aside";

export default function PartnerStripClickable({
  partners,
  scopeType,
  scopeId,
  layout,
  borderColor,
  headingClass,
  showHeading = true,
}: {
  partners: PublicSitePartner[];
  scopeType: "association" | "club";
  scopeId: string;
  layout: PartnerStripLayout;
  borderColor?: string;
  headingClass: string;
  /** When false, parent supplies the section title (e.g. home sidebar). */
  showHeading?: boolean;
}) {
  if (!partners.length) return null;

  const listWrap =
    layout === "footer"
      ? "mx-auto mt-5 flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-6"
      : "space-y-5";

  return (
    <div
      className={layout === "footer" ? "border-b px-4 py-8 sm:px-8" : ""}
      style={layout === "footer" && borderColor ? { borderColor } : undefined}
    >
      {showHeading ? (
        <p
          className={`text-center text-[10px] font-black uppercase tracking-[0.28em] ${headingClass}`}
        >
          Partners &amp; sponsors
        </p>
      ) : null}
      <ul className={showHeading ? listWrap : `${listWrap} mt-0`}>
        {partners.map((p, slot) => {
          const inner = (
            <span className="flex flex-col items-center gap-2 text-center">
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote partner logos
                <img
                  src={p.logoUrl}
                  alt=""
                  className={
                    layout === "footer"
                      ? "max-h-11 w-auto max-w-[140px] object-contain opacity-95"
                      : "mx-auto max-h-12 w-auto max-w-[160px] object-contain"
                  }
                />
              ) : null}
              <span
                className={
                  layout === "footer"
                    ? "text-xs font-bold leading-tight"
                    : "mt-2 text-[10px] font-black uppercase text-slate-800"
                }
              >
                {p.name}
              </span>
            </span>
          );

          return (
            <li key={`${p.name}-${slot}`} className={layout === "aside" ? "text-center" : ""}>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={() => recordPartnerStripClick(scopeType, scopeId, slot)}
                  className={
                    layout === "footer"
                      ? "block opacity-90 transition hover:opacity-100"
                      : "inline-block rounded-xl border border-slate-100 p-3 transition hover:border-[#06054e]/25 hover:shadow-sm"
                  }
                >
                  {inner}
                </a>
              ) : (
                <div
                  className={
                    layout === "aside"
                      ? "rounded-xl border border-slate-100 p-3"
                      : "opacity-90"
                  }
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
