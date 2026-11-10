// lib/competitions/publicPlayerProfile.ts
// Public player profile: name, teams, and career stats from published results only.
// Returns null — never partial data — for anyone without a public footprint, so a
// member who has not appeared in published results is indistinguishable from an
// id that does not exist.

import type { Db } from "mongodb";
import { aggregateMemberCareerInAssociation } from "@/lib/competitions/playerCareerStats";
import {
  memberDisplayName,
  type PlayerSeasonTotals,
} from "@/lib/competitions/playerSeasonStats";
import { findPublicPlayerFootprints } from "@/lib/competitions/publicPlayerFootprint";

export type ProfileTeam = {
  teamId: string;
  name: string;
  clubId: string | null;
  clubName: string | null;
};

export type ProfileSeason = {
  seasonCompetitionId: string;
  season: string;
  competitionName: string;
  totals: PlayerSeasonTotals;
};

export type ProfileAssociation = {
  owningAssociationId: string;
  associationName: string;
  career: PlayerSeasonTotals;
  bySeason: ProfileSeason[];
};

export type PublicPlayerProfile = {
  memberId: string;
  displayName: string;
  teams: ProfileTeam[];
  associations: ProfileAssociation[];
};

const MAX_MEMBER_ID_LENGTH = 64;

export async function getPublicPlayerProfile(
  db: Db,
  memberIdRaw: string,
): Promise<PublicPlayerProfile | null> {
  const memberId = String(memberIdRaw ?? "").trim();
  if (!memberId || memberId.length > MAX_MEMBER_ID_LENGTH) return null;

  const footprint = (await findPublicPlayerFootprints(db, [memberId])).get(memberId);
  if (!footprint) return null;

  const member = await db.collection("members").findOne(
    { memberId },
    {
      projection: {
        "personalInfo.firstName": 1,
        "personalInfo.lastName": 1,
        "personalInfo.displayName": 1,
      },
    },
  );
  const displayName = member ? memberDisplayName(member) : "";
  if (!displayName) return null;

  // Teams (with club names for linking)
  const teamDocs =
    footprint.teamIds.length > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: footprint.teamIds } })
          .project({ teamId: 1, clubId: 1, name: 1, displayName: 1 })
          .toArray()
      : [];
  const clubIds = [
    ...new Set(teamDocs.map((t) => String(t.clubId ?? "").trim()).filter(Boolean)),
  ];
  const clubDocs =
    clubIds.length > 0
      ? await db
          .collection("clubs")
          .find({ id: { $in: clubIds } })
          .project({ id: 1, name: 1, title: 1 })
          .toArray()
      : [];
  const clubNameById = new Map<string, string>();
  for (const c of clubDocs) {
    const id = String(c.id ?? "").trim();
    const name = String(c.name ?? c.title ?? "").trim();
    if (id && name) clubNameById.set(id, name);
  }
  const teams: ProfileTeam[] = teamDocs
    .map((t) => {
      const clubId = String(t.clubId ?? "").trim();
      return {
        teamId: String(t.teamId ?? "").trim(),
        name: String(t.displayName ?? t.name ?? t.teamId ?? "").trim(),
        clubId: clubId || null,
        clubName: clubNameById.get(clubId) ?? null,
      };
    })
    .filter((t) => t.teamId && t.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Career stats, one block per association the member has public stats in
  const assocIds = [
    ...new Set(footprint.seasonCompetitions.map((s) => s.owningAssociationId).filter(Boolean)),
  ];
  const competitionIds = [
    ...new Set(footprint.seasonCompetitions.map((s) => s.competitionId).filter(Boolean)),
  ];

  const [assocDocs, competitionDocs] = await Promise.all([
    assocIds.length > 0
      ? db
          .collection("associations")
          .find({ associationId: { $in: assocIds } })
          .project({ associationId: 1, name: 1 })
          .toArray()
      : Promise.resolve([]),
    competitionIds.length > 0
      ? db
          .collection("competitions")
          .find({ competitionId: { $in: competitionIds } })
          .project({ competitionId: 1, name: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);
  const assocNameById = new Map(
    assocDocs.map((a) => [String(a.associationId ?? ""), String(a.name ?? "")]),
  );
  const competitionNameById = new Map(
    competitionDocs.map((c) => [String(c.competitionId ?? ""), String(c.name ?? "")]),
  );

  const associations: ProfileAssociation[] = [];
  for (const owningAssociationId of assocIds) {
    const { bySeason, career } = await aggregateMemberCareerInAssociation(
      db,
      memberId,
      owningAssociationId,
    );
    if (bySeason.length === 0) continue;
    associations.push({
      owningAssociationId,
      associationName: assocNameById.get(owningAssociationId) || owningAssociationId,
      career,
      bySeason: bySeason.map((s) => ({
        seasonCompetitionId: s.seasonCompetitionId,
        season: String(s.season ?? ""),
        competitionName:
          competitionNameById.get(s.competitionId) || s.competitionId || "Competition",
        totals: s.totals,
      })),
    });
  }
  if (associations.length === 0) return null;

  return { memberId, displayName, teams, associations };
}
