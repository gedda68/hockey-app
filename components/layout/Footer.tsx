"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePublicTenant } from "@/lib/contexts/PublicTenantContext";
import PartnerStripClickable from "@/components/website/PartnerStripClickable";

const DEFAULT_PRIMARY = "#06054e";

function luminance(hex: string): number {
  const h = hex.replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function Footer() {
  const { tenant } = usePublicTenant();

  const primary = String(tenant?.primaryColor ?? DEFAULT_PRIMARY).trim() || DEFAULT_PRIMARY;
  const accent = String(tenant?.accentColor ?? "#facc15").trim();

  const lightBg = useMemo(() => luminance(primary) > 0.55, [primary]);
  const partners = tenant?.partners ?? [];

  const navTitle = lightBg ? "text-slate-500" : "text-white/50";
  const linkClass = lightBg
    ? "link link-hover text-slate-700 hover:text-slate-900"
    : "link link-hover text-indigo-100/90 hover:text-white";
  const borderColor = lightBg ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.18)";
  const stripHeading = lightBg ? "text-slate-500" : "text-white/60";

  return (
    <footer
      className="footer sm:footer-horizontal flex-col p-0 sm:flex-col"
      style={{
        backgroundColor: primary,
        color: lightBg ? "#0f172a" : "rgba(224,231,255,0.92)",
      }}
    >
      {partners.length > 0 && tenant ? (
        <PartnerStripClickable
          partners={partners}
          scopeType={tenant.kind}
          scopeId={tenant.id}
          layout="footer"
          borderColor={borderColor}
          headingClass={stripHeading}
        />
      ) : null}

      <div
        className={`grid w-full grid-cols-1 gap-8 p-10 sm:grid-cols-3 ${lightBg ? "" : ""}`}
        style={
          lightBg
            ? undefined
            : {
                color: "rgba(224,231,255,0.92)",
              }
        }
      >
        <nav>
          <h6 className={`footer-title ${navTitle}`}>Explore</h6>
          <Link href="/competitions" className={linkClass}>
            Competitions
          </Link>
          <Link href="/competitions/this-round" className={linkClass}>
            This round
          </Link>
          <Link href="/clubs" className={linkClass}>
            Clubs
          </Link>
          <Link href="/play" className={linkClass}>
            Get involved
          </Link>
        </nav>
        <nav>
          <h6 className={`footer-title ${navTitle}`}>About</h6>
          <Link href="/about" className={linkClass}>
            About
          </Link>
          <Link href="/contact" className={linkClass}>
            Contact
          </Link>
          <Link href="/news" className={linkClass}>
            News
          </Link>
        </nav>
        <nav>
          <h6 className={`footer-title ${navTitle}`}>Members</h6>
          <Link href="/login" className={linkClass}>
            Portal login
          </Link>
          <span className={`mt-2 block text-xs ${lightBg ? "text-slate-500" : "text-indigo-100/60"}`}>
            Coach, umpire, and volunteer requests live under{" "}
            <strong className={lightBg ? "text-slate-700" : "text-white/90"}>My registrations</strong>{" "}
            after sign-in.
          </span>
        </nav>
      </div>

      <div
        className="w-full px-10 py-4 text-center text-[11px] font-semibold"
        style={{
          borderTop: `1px solid ${borderColor}`,
          color: lightBg ? "rgba(15,23,42,0.55)" : "rgba(224,231,255,0.55)",
        }}
      >
        {tenant ? (
          <span>
            © {new Date().getFullYear()} {tenant.displayName}
            {tenant.shortName ? ` · ${tenant.shortName}` : ""}
          </span>
        ) : (
          <span>© {new Date().getFullYear()} Brisbane Hockey Association</span>
        )}
        <span className="mx-2 opacity-40" aria-hidden>
          ·
        </span>
        <span style={{ color: accent }} className="opacity-90">
          Thank you to our partners for supporting community hockey
        </span>
      </div>
    </footer>
  );
}
