import { createHash } from "crypto";
import type { Db } from "mongodb";
import {
  normalizePublicPartners,
  type PublicSitePartner,
} from "@/lib/tenant/tenantPartners";

/** Stable id for a partner row (name + URL) — no end-user PII. */
export function partnerRefFromRow(name: string, url?: string): string {
  const n = name.trim().toLowerCase();
  const u = (url ?? "").trim().toLowerCase();
  return createHash("sha256")
    .update(`${n}|${u}`, "utf8")
    .digest("hex")
    .slice(0, 20);
}

export function utcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function loadPartnersForPublicScope(
  db: Db,
  scopeType: "association" | "club",
  scopeId: string,
): Promise<PublicSitePartner[] | null> {
  const sid = scopeId.trim();
  if (!sid) return null;

  if (scopeType === "association") {
    const assoc = await db.collection("associations").findOne(
      { associationId: sid },
      { projection: { branding: 1 } },
    );
    if (!assoc) return null;
    const b = (assoc as { branding?: unknown }).branding;
    const br = b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
    return normalizePublicPartners(br.partners ?? br.sponsors);
  }

  const club = await db.collection("clubs").findOne(
    { $or: [{ id: sid }, { slug: sid }] },
    { projection: { publicPartners: 1, branding: 1 } },
  );
  if (!club) return null;
  const cr = club as Record<string, unknown>;
  const clubBranding =
    cr.branding && typeof cr.branding === "object" && !Array.isArray(cr.branding)
      ? (cr.branding as Record<string, unknown>)
      : {};
  return normalizePublicPartners(cr.publicPartners ?? clubBranding.partners);
}

export const PARTNER_STRIP_CLICK_COLLECTION = "partner_strip_click_daily";
