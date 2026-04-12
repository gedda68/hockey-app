import type { Db, Document } from "mongodb";

export const ASSOCIATION_SEASON_ROSTER_DIVISIONS = "association_season_roster_divisions";

export type RosterDivisionSlot = {
  category: string;
  division: string;
  gender: string;
  sortOrder: number;
  /** Teams per club in this slot without extra association approval (default 1). */
  maxTeamsPerClub: number;
};

export type AssociationSeasonRosterDoc = {
  associationId: string;
  season: string;
  slots: RosterDivisionSlot[];
  updatedAt: string;
};

export function rosterTripleKey(
  category: string,
  division: string,
  gender: string,
): string {
  return `${category.trim().toLowerCase()}|${division.trim()}|${gender.trim().toLowerCase()}`;
}

export function clubAssociationId(club: Document | null | undefined): string | null {
  if (!club) return null;
  const a =
    club.parentAssociationId ?? club.associationId ?? club.parentAssocId;
  return a != null && String(a).trim() ? String(a).trim() : null;
}

export function normalizeClubId(club: Document): string {
  return String(club.id ?? club.clubId ?? club._id ?? "").trim();
}

export async function getAssociationSeasonRosterDoc(
  db: Db,
  associationId: string,
  season: string,
): Promise<AssociationSeasonRosterDoc | null> {
  const row = await db.collection(ASSOCIATION_SEASON_ROSTER_DIVISIONS).findOne({
    associationId,
    season: String(season),
  });
  if (!row || !Array.isArray(row.slots)) return null;
  return row as unknown as AssociationSeasonRosterDoc;
}

export function findSlot(
  slots: RosterDivisionSlot[],
  category: string,
  division: string,
  gender: string,
): RosterDivisionSlot | undefined {
  const key = rosterTripleKey(category, division, gender);
  return slots.find(
    (s) => rosterTripleKey(s.category, s.division, s.gender) === key,
  );
}

/** Total team rows across all roster documents for this club + season + triple. */
export async function countClubTeamsInDivisionSlot(
  db: Db,
  clubId: string,
  season: string,
  category: string,
  division: string,
  gender: string,
): Promise<number> {
  const rosters = await db
    .collection("teamRosters")
    .find({
      clubId,
      season: String(season),
      category,
      division,
      gender,
    })
    .project({ teams: 1 })
    .toArray();

  let n = 0;
  for (const r of rosters) {
    const teams = Array.isArray(r.teams) ? r.teams : [];
    n += teams.length;
  }
  return n;
}

export async function maxTeamsAllowedForClubInSlot(
  db: Db,
  _clubId: string,
  associationId: string,
  season: string,
  category: string,
  division: string,
  gender: string,
): Promise<number> {
  const doc = await getAssociationSeasonRosterDoc(db, associationId, season);
  if (!doc?.slots?.length) return Number.POSITIVE_INFINITY;
  const slot = findSlot(doc.slots, category, division, gender);
  if (!slot) return 0;
  const m = slot.maxTeamsPerClub;
  return typeof m === "number" && m >= 1 ? m : 1;
}
