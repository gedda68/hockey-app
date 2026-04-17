/**
 * Public-site partners / sponsors (B5) — stored on association `branding.partners`
 * or club `publicPartners` (same shape).
 */

export type PublicSitePartner = {
  name: string;
  url?: string;
  logoUrl?: string;
};

const MAX_PARTNERS = 24;

export function normalizePublicPartners(raw: unknown): PublicSitePartner[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicSitePartner[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const logoUrl = typeof o.logoUrl === "string" ? o.logoUrl.trim() : "";
    out.push({
      name,
      ...(url ? { url } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    });
    if (out.length >= MAX_PARTNERS) break;
  }
  return out;
}
