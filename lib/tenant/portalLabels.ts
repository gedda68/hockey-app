/**
 * Normalized labels for portal subdomains (club shortName, association code, etc.)
 */

export function normalizePortalLabel(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clubPortalSubdomain(club: {
  shortName?: string | null;
  abbreviation?: string | null;
  portalSlug?: string | null;
  slug?: string | null;
}): string {
  const fromShort = normalizePortalLabel(club.shortName || club.abbreviation);
  if (fromShort) return fromShort;
  const fromPortal = normalizePortalLabel(club.portalSlug || "");
  if (fromPortal) return fromPortal;
  return String(club.slug || "").toLowerCase();
}

export function associationPortalSubdomain(assoc: {
  code?: string | null;
  portalSlug?: string | null;
}): string {
  const fromCode = normalizePortalLabel(assoc.code || "");
  if (fromCode) return fromCode;
  const fromPortal = normalizePortalLabel(assoc.portalSlug || "");
  if (fromPortal) return fromPortal;
  return String(assoc.code || assoc.portalSlug || "").toLowerCase();
}
