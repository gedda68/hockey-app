// lib/search/playerSearch.ts
// Public player search. Privacy rules, all enforced here:
//  - only members with a counted stat in a published fixture of a public season
//    competition can be found (see publicPlayerFootprint.ts);
//  - only the display name, team names and a season count leave this module — no
//    date of birth, contact, medical or membership details;
//  - on a club / association portal, only players who played for an in-scope club.

import type { Db } from "mongodb";
import { memberDisplayName } from "@/lib/competitions/playerSeasonStats";
import {
  findPublicPlayerFootprints,
  type PlayerFootprint,
} from "@/lib/competitions/publicPlayerFootprint";
import { buildPlayerNameFilter } from "@/lib/search/playerNameFilter";

/** Name matches considered before the (more expensive) visibility check. */
export const PLAYER_CANDIDATE_LIMIT = 40;
export const PLAYER_RESULT_LIMIT = 10;

export type PlayerSearchHit = {
  memberId: string;
  displayName: string;
  /** Up to two team names, most relevant first. */
  teamNames: string[];
  seasonCount: number;
};

export type TeamLite = {
  teamId: string;
  clubId: string;
  label: string;
};

/** Pure: turn candidates + footprints into ordered, tenant-scoped hits. */
export function shapePlayerHits(args: {
  candidates: Array<{ memberId: string; displayName: string }>;
  footprints: Map<string, PlayerFootprint>;
  teamsById: Map<string, TeamLite>;
  /** null = no tenant restriction (apex site). */
  allowedClubIds: string[] | null;
  limit?: number;
}): PlayerSearchHit[] {
  const { candidates, footprints, teamsById, allowedClubIds } = args;
  const limit = args.limit ?? PLAYER_RESULT_LIMIT;
  const allowed = allowedClubIds ? new Set(allowedClubIds) : null;

  const hits: PlayerSearchHit[] = [];
  for (const c of candidates) {
    const fp = footprints.get(c.memberId);
    if (!fp || !c.displayName) continue;

    const teams = fp.teamIds
      .map((id) => teamsById.get(id))
      .filter((t): t is TeamLite => Boolean(t))
      .filter((t) => !allowed || allowed.has(t.clubId));

    // On a scoped portal a player with no in-scope team is simply not visible there.
    if (allowed && teams.length === 0) continue;

    hits.push({
      memberId: c.memberId,
      displayName: c.displayName,
      teamNames: [...new Set(teams.map((t) => t.label))].slice(0, 2),
      seasonCount: fp.seasonCompetitions.length,
    });
  }

  hits.sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) ||
      a.memberId.localeCompare(b.memberId),
  );
  return hits.slice(0, limit);
}

export async function searchPublicPlayers(
  db: Db,
  q: string,
  opts: { allowedClubIds: string[] | null; limit?: number },
): Promise<PlayerSearchHit[]> {
  const filter = buildPlayerNameFilter(q);
  if (!filter) return [];

  const members = await db
    .collection("members")
    .find(filter)
    // Data minimisation: names only.
    .project({
      memberId: 1,
      "personalInfo.firstName": 1,
      "personalInfo.lastName": 1,
      "personalInfo.displayName": 1,
    })
    .limit(PLAYER_CANDIDATE_LIMIT)
    .toArray();

  const candidates = members
    .map((m) => ({
      memberId: String(m.memberId ?? "").trim(),
      displayName: memberDisplayName(m),
    }))
    .filter((c) => c.memberId && c.displayName);
  if (candidates.length === 0) return [];

  const footprints = await findPublicPlayerFootprints(
    db,
    candidates.map((c) => c.memberId),
  );
  if (footprints.size === 0) return [];

  const teamIds = [...new Set([...footprints.values()].flatMap((f) => f.teamIds))];
  const teamDocs =
    teamIds.length > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: teamIds } })
          .project({ teamId: 1, clubId: 1, name: 1, displayName: 1 })
          .toArray()
      : [];

  const teamsById = new Map<string, TeamLite>();
  for (const t of teamDocs) {
    const teamId = String(t.teamId ?? "").trim();
    if (!teamId) continue;
    teamsById.set(teamId, {
      teamId,
      clubId: String(t.clubId ?? "").trim(),
      label: String(t.displayName ?? t.name ?? teamId).trim(),
    });
  }

  return shapePlayerHits({
    candidates,
    footprints,
    teamsById,
    allowedClubIds: opts.allowedClubIds,
    limit: opts.limit,
  });
}
