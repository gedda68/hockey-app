// lib/sponsors/groups.ts
// The sponsor groups a member sees: their club's partners, then each association above it (nearest first).
// Pure: the API loads the club and associations.

import { normalizePublicPartners, type PublicSitePartner } from "@/lib/tenant/tenantPartners";

export interface SponsorGroup {
  label: string;
  scopeType: "club" | "association";
  scopeId: string;
  partners: PublicSitePartner[];
}

export function sponsorGroups(club: any | null, associations: Map<string, any>, maxLevels = 4): SponsorGroup[] {
  const out: SponsorGroup[] = [];
  if (club) {
    const partners = normalizePublicPartners(club.publicPartners);
    if (partners.length) out.push({ label: String(club.name ?? "Club"), scopeType: "club", scopeId: String(club.id ?? club.clubId ?? club.slug ?? ""), partners });
  }
  const seen = new Set<string>();
  let cur = club?.parentAssociationId ? associations.get(String(club.parentAssociationId)) : undefined;
  for (let i = 0; cur && i < maxLevels; i++) {
    const id = String(cur.associationId ?? "");
    if (!id || seen.has(id)) break; // a loop in the data must not hang the page
    seen.add(id);
    const partners = normalizePublicPartners(cur.branding?.partners ?? cur.branding?.sponsors);
    if (partners.length) out.push({ label: String(cur.name ?? id), scopeType: "association", scopeId: id, partners });
    cur = cur.parentAssociationId ? associations.get(String(cur.parentAssociationId)) : undefined;
  }
  return out;
}

/** Associations only (no club), for people whose session is at an association. */
export function associationOnlyGroups(start: any | null, associations: Map<string, any>, maxLevels = 4): SponsorGroup[] {
  return sponsorGroups({ parentAssociationId: start?.associationId }, associations, maxLevels);
}
