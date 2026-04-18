// lib/contexts/BrandContext.tsx
// Central brand context — fetches the logged-in user's club or association
// branding once and shares it across all admin components.
//
// Usage:
//   const { brand } = useBrand();
//   brand?.primaryColor  // e.g. "#06054e"
//   brand?.secondaryColor
//   brand?.logo
//   brand?.name

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth, type User } from "@/lib/auth/AuthContext";

export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  accentColor: string;
  logo?: string;
  /** When set, admin top bar uses this image instead of the colour gradient */
  adminHeaderBannerUrl?: string;
  name: string;
  shortName?: string;
}

interface BrandContextType {
  brand: BrandColors | null;
  isLoading: boolean;
}

const DEFAULT_BRAND: BrandColors = {
  primaryColor: "#06054e",
  secondaryColor: "#1a1870",
  tertiaryColor: "#2d2a8c",
  accentColor: "#FFD700",
  name: "Hockey Admin",
};

const BrandContext = createContext<BrandContextType>({
  brand: null,
  isLoading: true,
});

// Roles whose branding comes from a club record
const CLUB_ROLES = new Set([
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "team-selector",
  "volunteer",
  "umpire",
  "technical-official",
]);

// Roles whose branding comes from an association record
const ASSOC_ROLES = new Set([
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "media-marketing",
]);

/** Club portal roles including members who should see club colours after login. */
const PORTAL_CLUB_ROLES = new Set<string>([
  ...CLUB_ROLES,
  "player",
  "member",
  "parent",
]);

function userShouldLoadClubBrand(user: User): boolean {
  if (!(user.clubId || user.clubSlug)) return false;
  if (PORTAL_CLUB_ROLES.has(user.role)) return true;
  return (
    user.scopedRoles?.some(
      (r) =>
        r.scopeType === "club" ||
        r.scopeType === "team" ||
        CLUB_ROLES.has(r.role),
    ) ?? false
  );
}

function userShouldLoadAssocBrand(user: User): boolean {
  if (user.role === "super-admin") return false;
  if (userShouldLoadClubBrand(user)) return false;
  if (!user.associationId) return false;
  if (ASSOC_ROLES.has(user.role)) return true;
  return (
    user.scopedRoles?.some(
      (r) =>
        r.scopeType === "association" && ASSOC_ROLES.has(r.role),
    ) ?? false
  );
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandColors | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBrand(null);
      setIsLoading(false);
      return;
    }

    if (user.role === "super-admin") {
      setBrand(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (userShouldLoadClubBrand(user)) {
      const ref = user.clubSlug || user.clubId;
      if (!ref) {
        setIsLoading(false);
        return;
      }
      fetch(`/api/admin/clubs/${ref}`)
        .then((r) => r.json())
        .then((data) => {
          const club = data.club;
          if (club) {
            const c = club.colors ?? {};
            const p = c.primaryColor ?? c.primary ?? DEFAULT_BRAND.primaryColor;
            const s = c.secondaryColor ?? c.secondary ?? DEFAULT_BRAND.secondaryColor;
            const a = c.accentColor ?? c.accent ?? DEFAULT_BRAND.accentColor;
            const br = club.branding as { adminHeaderBannerUrl?: string } | undefined;
            const rawAdmin = br?.adminHeaderBannerUrl;
            const adminHeaderBannerUrl =
              typeof rawAdmin === "string" && rawAdmin.trim()
                ? rawAdmin.trim()
                : undefined;
            setBrand({
              primaryColor: p,
              secondaryColor: s,
              tertiaryColor:
                c.tertiaryColor ?? c.tertiary ?? s ?? DEFAULT_BRAND.tertiaryColor,
              accentColor: a,
              logo: club.logo ?? undefined,
              adminHeaderBannerUrl,
              name: club.name,
              shortName: club.shortName ?? undefined,
            });
          } else {
            setBrand(null);
          }
        })
        .catch(() => setBrand(null))
        .finally(() => setIsLoading(false));
      return;
    }

    if (userShouldLoadAssocBrand(user) && user.associationId) {
      fetch(`/api/admin/associations/${user.associationId}`)
        .then((r) => r.json())
        .then((data) => {
          const assoc = data.association || data;
          if (assoc?.name || assoc?.fullName) {
            const b = assoc.branding as {
              primaryColor?: string;
              secondaryColor?: string;
              tertiaryColor?: string;
              accentColor?: string;
              logo?: string;
              logoUrl?: string;
              adminHeaderBannerUrl?: string;
            } | null;
            const bb = b ?? {};
            setBrand({
              primaryColor: bb.primaryColor ?? DEFAULT_BRAND.primaryColor,
              secondaryColor: bb.secondaryColor ?? DEFAULT_BRAND.secondaryColor,
              tertiaryColor:
                bb.tertiaryColor ?? bb.secondaryColor ?? DEFAULT_BRAND.tertiaryColor,
              accentColor: bb.accentColor ?? DEFAULT_BRAND.accentColor,
              logo: bb.logoUrl ?? bb.logo ?? undefined,
              adminHeaderBannerUrl:
                typeof bb.adminHeaderBannerUrl === "string" &&
                bb.adminHeaderBannerUrl.trim()
                  ? bb.adminHeaderBannerUrl.trim()
                  : undefined,
              name: assoc.name || assoc.fullName,
              shortName: assoc.acronym
                ? String(assoc.acronym)
                : assoc.code
                  ? String(assoc.code)
                  : undefined,
            });
          } else {
            setBrand(null);
          }
        })
        .catch(() => setBrand(null))
        .finally(() => setIsLoading(false));
      return;
    }

    setBrand(null);
    setIsLoading(false);
  }, [user]);

  return (
    <BrandContext.Provider value={{ brand, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}

/**
 * Returns true if a hex colour is light enough to need dark text overlay.
 * Uses the standard W3C luminance formula.
 */
export function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/**
 * Given a background colour, return the appropriate foreground text colour.
 */
export function contrastText(bgHex: string): "text-gray-900" | "text-white" {
  return isLightColor(bgHex) ? "text-gray-900" : "text-white";
}
