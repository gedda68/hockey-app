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
import { useAuth } from "@/lib/auth/AuthContext";

export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo?: string;
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

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandColors | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const isClub  = CLUB_ROLES.has(user.role);
    const isAssoc = ASSOC_ROLES.has(user.role);

    if (isClub && (user.clubSlug || user.clubId)) {
      const ref = user.clubSlug || user.clubId;
      fetch(`/api/admin/clubs/${ref}`)
        .then((r) => r.json())
        .then((data) => {
          const club = data.club;
          if (club) {
            setBrand({
              primaryColor:   club.colors?.primaryColor   ?? DEFAULT_BRAND.primaryColor,
              secondaryColor: club.colors?.secondaryColor ?? DEFAULT_BRAND.secondaryColor,
              accentColor:    club.colors?.accentColor    ?? DEFAULT_BRAND.accentColor,
              logo:           club.logo ?? undefined,
              name:           club.name,
              shortName:      club.shortName ?? undefined,
            });
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else if (isAssoc && user.associationId) {
      fetch(`/api/admin/associations/${user.associationId}`)
        .then((r) => r.json())
        .then((data) => {
          const assoc = data.association || data;
          if (assoc?.name || assoc?.fullName) {
            setBrand({
              primaryColor:   assoc.branding?.primaryColor   ?? DEFAULT_BRAND.primaryColor,
              secondaryColor: assoc.branding?.secondaryColor ?? DEFAULT_BRAND.secondaryColor,
              accentColor:    assoc.branding?.accentColor    ?? DEFAULT_BRAND.accentColor,
              logo:           assoc.branding?.logo ?? undefined,
              name:           assoc.name || assoc.fullName,
              shortName:      assoc.code || assoc.acronym,
            });
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      // super-admin or unscoped role — use system defaults
      setIsLoading(false);
    }
  }, [user?.clubId, user?.clubSlug, user?.associationId, user?.role]);

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
