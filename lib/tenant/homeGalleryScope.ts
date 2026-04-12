import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import type { UserSession } from "@/lib/db/schemas/user";

/** Directory segment under public/icons/home-gallery/<segment>/ */
export type HomeGalleryDiskSegment = string;

export function sanitizeScopeIdPart(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "x";
}

export function homeGallerySegmentFromTenant(
  tenant: PublicTenantPayload | null,
): HomeGalleryDiskSegment {
  if (!tenant) return "platform";
  if (tenant.kind === "association") {
    return `association-${sanitizeScopeIdPart(tenant.id)}`;
  }
  return `club-${sanitizeScopeIdPart(tenant.id)}`;
}

/**
 * Which gallery folder an admin user may manage.
 * super-admin may pass requestedSegment from query (validated).
 */
export function adminHomeGallerySegment(
  user: UserSession,
  requested: string | null,
): { ok: true; segment: HomeGalleryDiskSegment } | { ok: false; error: string } {
  if (user.role === "super-admin") {
    const s = (requested ?? "platform").trim();
    if (!/^(platform|association-[a-zA-Z0-9_-]+|club-[a-zA-Z0-9_-]+)$/.test(s)) {
      return { ok: false, error: "Invalid gallery scope key" };
    }
    return { ok: true, segment: s };
  }
  if (user.clubId) {
    const seg = `club-${sanitizeScopeIdPart(user.clubId)}`;
    if (requested && requested !== seg) {
      return { ok: false, error: "Cannot manage another club's gallery" };
    }
    return { ok: true, segment: seg };
  }
  if (user.associationId) {
    const seg = `association-${sanitizeScopeIdPart(user.associationId)}`;
    if (requested && requested !== seg) {
      return { ok: false, error: "Cannot manage another association's gallery" };
    }
    return { ok: true, segment: seg };
  }
  return { ok: false, error: "No org scope for gallery" };
}

/** Category path segment for /api/admin/upload/image (icons/<category>/<file>). */
export function homeGalleryUploadCategory(segment: HomeGalleryDiskSegment): string {
  return `home-gallery/${segment}`;
}
