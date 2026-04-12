import type { Db } from "mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

/**
 * When the request is on a portal host, restrict season-competition reads to
 * competitions owned by that tenant's association (or the club's parent association).
 */
export async function seasonCompetitionVisibleForPortalTenant(
  db: Db,
  owningAssociationId: string,
  tenant: PublicTenantPayload | null,
): Promise<boolean> {
  if (!tenant) return true;
  const owner = owningAssociationId.trim();
  if (!owner) return false;

  if (tenant.kind === "association") {
    return owner === tenant.id;
  }

  const club = await db.collection("clubs").findOne({
    $or: [{ id: tenant.id }, { clubId: tenant.id }],
  });
  const parent = club?.associationId
    ? String(club.associationId)
    : club?.parentAssociationId
      ? String(club.parentAssociationId)
      : "";
  return !!parent && parent === owner;
}
