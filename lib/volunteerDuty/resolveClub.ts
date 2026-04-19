import type { Db } from "mongodb";

export type ResolvedClubRef = {
  clubId: string;
  clubSlug: string;
  name: string;
};

export async function resolveClubByIdOrSlug(
  db: Db,
  idOrSlug: string,
): Promise<ResolvedClubRef | null> {
  const raw = idOrSlug?.trim();
  if (!raw) return null;
  const club = await db.collection("clubs").findOne(
    { $or: [{ slug: raw }, { id: raw }] },
    { projection: { id: 1, slug: 1, name: 1, title: 1 } },
  );
  if (!club) return null;
  const clubId = String(club.id ?? "").trim();
  const slugRaw = String(club.slug ?? clubId).trim();
  const name = String(club.name ?? club.title ?? "").trim();
  if (!clubId || !slugRaw || !name) return null;
  return { clubId, clubSlug: slugRaw, name };
}
