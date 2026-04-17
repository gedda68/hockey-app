import type { Db } from "mongodb";

export type AssociationClubOption = { clubId: string; name: string; slug: string };

/**
 * Clubs under the same `parentAssociationId` as the member’s primary club (for fan favourites).
 */
export async function listAssociationClubsForMemberClub(
  db: Db,
  memberClubId: string,
): Promise<AssociationClubOption[]> {
  const cid = String(memberClubId ?? "").trim();
  if (!cid) return [];

  const club =
    (await db.collection("clubs").findOne({ $or: [{ id: cid }, { clubId: cid }] })) ?? null;
  if (!club) return [];

  const parentAssociationId = String(
    (club as { parentAssociationId?: string }).parentAssociationId ?? "",
  ).trim();
  if (!parentAssociationId) return [];

  const rows = await db
    .collection("clubs")
    .find(
      {
        parentAssociationId,
        $or: [{ active: true }, { active: { $exists: false } }],
      },
      { projection: { id: 1, clubId: 1, name: 1, title: 1, slug: 1 } },
    )
    .sort({ name: 1 })
    .limit(200)
    .toArray();

  const out: AssociationClubOption[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const rec = r as { id?: string; clubId?: string; name?: string; title?: string; slug?: string };
    const clubId = String(rec.id ?? rec.clubId ?? "").trim();
    if (!clubId || seen.has(clubId)) continue;
    seen.add(clubId);
    const name = String(rec.name ?? rec.title ?? "Club").trim() || "Club";
    const slug = String(rec.slug ?? "").trim() || clubId;
    out.push({ clubId, name, slug });
  }
  return out;
}
