/**
 * Multi-tenant portals: {portalSlug}.{PORTAL_ROOT_DOMAIN}
 * e.g. bha.sportsolutions.com.au → association or club record.
 *
 * Env:
 *   NEXT_PUBLIC_PORTAL_ROOT_DOMAIN — e.g. sportsolutions.com.au or localhost:3000 (no scheme).
 *     When unset, development defaults to localhost:3000 so tenant links resolve correctly.
 *   NEXT_PUBLIC_DEV_PORTAL_SLUG — optional; on plain localhost / 127.0.0.1, use this
 *     slug so you get portal theming without subdomain DNS (e.g. bha).
 *
 * Local dev:
 *   • http://bha.localhost:3000 — subdomain (works when OS resolves *.localhost)
 *   • http://localhost:3000?portal=bha — query override (any OS)
 *   • http://localhost:3000 + NEXT_PUBLIC_DEV_PORTAL_SLUG=bha — default portal
 *
 * Optional DB fields:
 *   associations.portalSlug — preferred host label (lowercase)
 *   clubs.portalSlug — preferred host label; falls back to clubs.slug
 */

import type { Db } from "mongodb";
import { escapeRegex } from "@/lib/utils/regex";
import { normalizePortalLabel } from "@/lib/tenant/portalLabels";

export type PublicTenantPayload = {
  kind: "association" | "club";
  /** associationId or club id string */
  id: string;
  /** Subdomain / portal key that matched */
  portalSlug: string;
  /** Club URL segment for /clubs/[pathSlug]/… (canonical slug) */
  pathSlug?: string;
  displayName: string;
  shortName?: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  accentColor: string;
};

/**
 * Middleware sets this on the forwarded request so RSC / `generateMetadata` can resolve
 * the same portal slug as the browser URL (including `?portal=` on plain localhost).
 */
export const RESOLVED_PORTAL_SLUG_HEADER = "x-resolved-portal-slug";

const DEFAULT_PRIMARY = "#06054e";
const DEFAULT_SECONDARY = "#1a1870";
const DEFAULT_TERTIARY = "#2d2a8c";
const DEFAULT_ACCENT = "#facc15";

export function getPortalRootDomain(): string {
  const explicit = process.env.NEXT_PUBLIC_PORTAL_ROOT_DOMAIN?.trim();
  if (explicit) return explicit.toLowerCase();
  if (process.env.NODE_ENV === "development") return "localhost:3000";
  return "sportsolutions.com.au";
}

/**
 * Returns the portal slug from Host, or null for apex / www / unknown hosts.
 */
export function extractPortalSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase().trim();
  if (!host) return null;

  const root = getPortalRootDomain();

  if (host === root || host === `www.${root}`) return null;

  const suffix = `.${root}`;
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length);
    if (!sub || sub === "www") return null;
    return sub;
  }

  // Dev: {slug}.localhost
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    if (sub && sub !== "www") return sub;
  }

  return null;
}

/** Hostname only, lowercase, no port */
function hostnameOnly(hostHeader: string): string {
  return hostHeader.split(":")[0].toLowerCase().trim();
}

/** Plain dev servers (no tenant subdomain). */
export function isLocalDevHostname(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const h = hostnameOnly(hostHeader);
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h === "::1"
  );
}

/** Normalizes/validates portal slug tokens from query params or trusted middleware headers. */
export function sanitizeDevPortalToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (!t || !/^[a-z0-9-]+$/.test(t)) return null;
  return t;
}

/**
 * Resolve portal slug for an incoming request (Host + optional ?portal= for localhost).
 * Precedence: subdomain / production root → ?portal on localhost → NEXT_PUBLIC_DEV_PORTAL_SLUG on localhost.
 */
export function resolvePortalSlugForRequest(
  hostHeader: string | null,
  queryPortal: string | null,
): string | null {
  const fromHost = extractPortalSlugFromHost(hostHeader);
  if (fromHost) return fromHost;

  if (isLocalDevHostname(hostHeader)) {
    const fromQuery = sanitizeDevPortalToken(queryPortal);
    if (fromQuery) return fromQuery;
    const fromEnv = sanitizeDevPortalToken(
      process.env.NEXT_PUBLIC_DEV_PORTAL_SLUG,
    );
    if (fromEnv) return fromEnv;
  }

  return null;
}

function safeRegexExact(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, "i");
}

export async function resolveTenantByPortalSlug(
  db: Db,
  slug: string,
): Promise<PublicTenantPayload | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;

  let assoc = await db.collection("associations").findOne({
    $or: [
      { portalSlug: safeRegexExact(key) },
      { code: safeRegexExact(key) },
      { acronym: safeRegexExact(key) },
      { associationId: safeRegexExact(key) },
    ],
  });

  // Subdomains often use a short label (e.g. rha) while `code` may be a longer string; align
  // with `associationPortalSubdomain` / `normalizePortalLabel` behaviour.
  if (!assoc) {
    const candidates = await db
      .collection("associations")
      .find({
        status: { $nin: ["inactive", "suspended"] },
      })
      .project({
        associationId: 1,
        code: 1,
        name: 1,
        fullName: 1,
        acronym: 1,
        portalSlug: 1,
        branding: 1,
      })
      .limit(400)
      .toArray();
    for (const a of candidates) {
      const labels = [
        normalizePortalLabel(
          a.portalSlug != null ? String(a.portalSlug) : "",
        ),
        normalizePortalLabel(a.code != null ? String(a.code) : ""),
        normalizePortalLabel(a.acronym != null ? String(a.acronym) : ""),
        normalizePortalLabel(
          a.associationId != null ? String(a.associationId) : "",
        ),
      ];
      if (labels.some((l) => l === key)) {
        assoc = a as any;
        break;
      }
    }
  }

  if (assoc) {
    const id = String(assoc.associationId ?? "");
    if (!id) return null;
    const ar = assoc as Record<string, unknown>;
    const b = (ar.branding ?? {}) as Record<string, unknown>;
    const logoRaw =
      (typeof b.logo === "string" && b.logo.trim()) ||
      (typeof b.logoUrl === "string" && b.logoUrl.trim()) ||
      (typeof ar.logo === "string" && ar.logo.trim()) ||
      "";
    return {
      kind: "association",
      id,
      portalSlug: key,
      displayName: String(assoc.name ?? assoc.fullName ?? "Association"),
      shortName: assoc.acronym
        ? String(assoc.acronym)
        : assoc.code
          ? String(assoc.code)
          : undefined,
      logo: logoRaw || undefined,
      primaryColor: String(b.primaryColor ?? DEFAULT_PRIMARY),
      secondaryColor: String(b.secondaryColor ?? DEFAULT_SECONDARY),
      tertiaryColor: String(b.tertiaryColor ?? b.secondaryColor ?? DEFAULT_TERTIARY),
      accentColor: String(b.accentColor ?? DEFAULT_ACCENT),
    };
  }

  let club = await db.collection("clubs").findOne({
    $or: [
      { portalSlug: safeRegexExact(key) },
      { slug: safeRegexExact(key) },
      { shortName: safeRegexExact(key) },
      { abbreviation: safeRegexExact(key) },
    ],
  });

  if (!club) {
    const candidates = await db
      .collection("clubs")
      .find({
        $nor: [{ active: false }],
        $or: [
          { shortName: { $exists: true, $nin: [null, ""] } },
          { abbreviation: { $exists: true, $nin: [null, ""] } },
        ],
      })
      .limit(400)
      .toArray();
    for (const c of candidates) {
      const sn = normalizePortalLabel(
        c.shortName != null ? String(c.shortName) : "",
      );
      const ab = normalizePortalLabel(
        c.abbreviation != null ? String(c.abbreviation) : "",
      );
      if (sn === key || ab === key) {
        club = c;
        break;
      }
    }
  }

  if (club) {
    const id = String(
      club.id ?? club.clubId ?? (club._id ? String(club._id) : ""),
    );
    const pathSlug = String(
      club.slug || club.id || club.clubId || "",
    ).trim();
    if (!pathSlug) return null;
    const c = club.colors ?? {};
    const primary = c.primaryColor ?? c.primary ?? DEFAULT_PRIMARY;
    const secondary = c.secondaryColor ?? c.secondary ?? DEFAULT_SECONDARY;
    const accent = c.accentColor ?? c.accent ?? DEFAULT_ACCENT;
    return {
      kind: "club",
      id,
      portalSlug: key,
      pathSlug,
      displayName: String(club.name ?? club.title ?? "Club"),
      shortName: club.shortName ? String(club.shortName) : undefined,
      logo: club.logo ? String(club.logo) : club.iconSrc ? String(club.iconSrc) : undefined,
      primaryColor: String(primary),
      secondaryColor: String(secondary),
      tertiaryColor: String(
        c.tertiaryColor ?? c.tertiary ?? secondary ?? DEFAULT_TERTIARY,
      ),
      accentColor: String(accent),
    };
  }

  return null;
}
