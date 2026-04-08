// lib/auth/mediaContentRoles.ts
// Roles allowed to manage news + events (calendar) in admin — aligned with
// adminRouteAccess `/admin/news` and ROLE_MATRIX (media / committee / org admins).

export const MEDIA_CONTENT_ADMIN_ROLES: string[] = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "media-marketing",
  "club-admin",
  "club-committee",
];
