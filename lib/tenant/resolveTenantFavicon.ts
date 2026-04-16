import { existsSync } from "node:fs";
import path from "node:path";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const ICON_EXTENSIONS = [".png", ".svg", ".jpg", ".jpeg", ".webp", ".ico"] as const;

function localPublicPathExists(webPath: string): boolean {
  if (!webPath.startsWith("/")) return false;
  const rel = webPath.replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return false;
  return existsSync(path.join(PUBLIC_DIR, rel));
}

export function faviconMimeFromUrl(url: string): string | undefined {
  const p = url.split("?")[0].toLowerCase();
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

function toWebPath(dirSegments: string[], fileName: string): string {
  return `/${[...dirSegments, fileName].join("/")}`;
}

/** First match under `public/{dirSegments}/{basename}{ext}` for known image extensions. */
function firstExistingUnderDir(
  dirSegments: string[],
  basename: string,
): string | null {
  for (const ext of ICON_EXTENSIONS) {
    const fsPath = path.join(PUBLIC_DIR, ...dirSegments, `${basename}${ext}`);
    if (existsSync(fsPath)) {
      return toWebPath(dirSegments, `${basename}${ext}`);
    }
  }
  return null;
}

/**
 * Tab icon:
 * 1) Shipped `public/icons/associations/{portalSlug}.*` when present (reliable; avoids a stale
 *    admin CDN URL blocking the repo asset).
 * 2) Admin branding (`tenant.logo`) when http(s) or when a `/…` path exists under `public/`.
 * 3) `public/icons/{slug}.*`, then `public/icons/clubs/{slug}.*`.
 */
export function resolveTenantFaviconUrl(tenant: PublicTenantPayload): string | null {
  const slug = tenant.portalSlug.trim().toLowerCase();
  const pathSlug =
    tenant.kind === "club" && tenant.pathSlug?.trim()
      ? tenant.pathSlug.trim().toLowerCase()
      : null;
  const slugCandidates =
    pathSlug && pathSlug !== slug ? [slug, pathSlug] : [slug];

  for (const s of slugCandidates) {
    const shipped = firstExistingUnderDir(["icons", "associations"], s);
    if (shipped) return shipped;
  }

  const fromAdmin = tenant.logo?.trim();
  if (fromAdmin) {
    if (fromAdmin.startsWith("http://") || fromAdmin.startsWith("https://")) {
      return fromAdmin;
    }
    if (fromAdmin.startsWith("/")) {
      if (localPublicPathExists(fromAdmin)) return fromAdmin;
    } else {
      const normalized = `/${fromAdmin.replace(/^\.?\//, "")}`;
      if (localPublicPathExists(normalized)) return normalized;
    }
  }

  for (const s of slugCandidates) {
    const u = firstExistingUnderDir(["icons"], s);
    if (u) return u;
  }
  for (const s of slugCandidates) {
    const u = firstExistingUnderDir(["icons", "clubs"], s);
    if (u) return u;
  }
  return null;
}
