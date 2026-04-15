// components/layout/ConditionalBodyPadding.tsx
// Public pages need pt-16 to clear the fixed BHA header.
// Admin pages manage their own header spacing, so no padding needed here.

"use client";

import { usePathname } from "next/navigation";
import { usePublicTenant } from "@/lib/contexts/PublicTenantContext";

function hexToRgba(hex: string, alpha: number): string | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function ConditionalBodyPadding({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const { tenant } = usePublicTenant();

  const isPublic = !isAdmin;

  // Avoid a thin "body background" seam under the fixed navbar by giving the padding
  // wrapper an appropriate background for dark/tenant portals.
  const isDarkRoute =
    pathname === "/" ||
    pathname?.startsWith("/competitions") ||
    pathname?.startsWith("/tournaments") ||
    pathname?.startsWith("/representative") ||
    pathname?.startsWith("/associations") ||
    pathname?.startsWith("/clubs/");

  const portalPrimary = tenant?.primaryColor?.trim() || "";
  const portalPrimary75 = portalPrimary
    ? hexToRgba(portalPrimary, 0.75) ?? portalPrimary
    : "";

  const style: React.CSSProperties | undefined =
    tenant && portalPrimary
      ? {
          background:
            pathname === "/"
              ? `linear-gradient(to bottom right, ${portalPrimary}, ${portalPrimary75})`
              : undefined,
        }
      : undefined;

  const className = isPublic ? `${isDarkRoute ? "bg-[#0b1220]" : ""}` : "";

  return (
    <div
      className={className}
      style={{
        ...(style ?? {}),
        ...(isPublic ? { paddingTop: "var(--public-header-height)" } : null),
        // Disable scroll anchoring for the main app content area to prevent
        // browser-driven scroll jumps when content above changes (ticker/gallery refresh).
        overflowAnchor: "none",
      }}
    >
      {children}
    </div>
  );
}
