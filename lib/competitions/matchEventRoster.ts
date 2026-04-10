// lib/competitions/matchEventRoster.ts
// Validate match event memberIds against team rosters (E6 follow-up).

import type { Db } from "mongodb";
import type { FixtureMatchEvent } from "@/lib/db/schemas/leagueFixture.schema";
import { memberDisplayName } from "@/lib/competitions/playerSeasonStats";

function rosterEntryActive(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  const o = entry as Record<string, unknown>;
  if (o.status === "inactive") return false;
  if (o.leftDate != null) return false;
  return true;
}

/**
 * Member IDs allowed for a team when the team document has a non-empty roster.
 * If roster is missing or empty, returns null (caller should skip strict validation).
 */
export async function loadRosterMemberIdsByTeamId(
  db: Db,
  teamIds: string[],
): Promise<Map<string, Set<string> | null>> {
  const uniq = [...new Set(teamIds.filter(Boolean))];
  const out = new Map<string, Set<string> | null>();
  if (uniq.length === 0) return out;

  const teams = await db
    .collection("teams")
    .find({ teamId: { $in: uniq } })
    .project({ teamId: 1, roster: 1 })
    .toArray();

  for (const tid of uniq) {
    const t = teams.find((x) => String(x.teamId) === tid);
    const roster = t?.roster;
    if (!Array.isArray(roster) || roster.length === 0) {
      out.set(tid, null);
      continue;
    }
    const ids = new Set<string>();
    for (const row of roster) {
      if (!rosterEntryActive(row)) continue;
      const mid =
        row && typeof row === "object" && typeof (row as { memberId?: string }).memberId === "string"
          ? (row as { memberId: string }).memberId
          : "";
      if (mid) ids.add(mid);
    }
    out.set(tid, ids.size > 0 ? ids : null);
  }

  return out;
}

export type RosterValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Ensures scorer, assist, and teamId align with home/away rosters when rosters exist.
 */
export function validateMatchEventsAgainstRosters(
  events: FixtureMatchEvent[],
  homeTeamId: string,
  awayTeamId: string,
  rosterByTeam: Map<string, Set<string> | null>,
): RosterValidationResult {
  for (const e of events) {
    if (e.teamId !== homeTeamId && e.teamId !== awayTeamId) {
      return {
        ok: false,
        status: 400,
        error: `Invalid teamId on event ${e.eventId ?? "?"} (not home or away)`,
      };
    }

    const allowed = rosterByTeam.get(e.teamId);
    if (allowed && allowed.size > 0 && !allowed.has(e.memberId)) {
      return {
        ok: false,
        status: 400,
        error: `memberId ${e.memberId} is not on the roster for team ${e.teamId} (event ${e.eventId ?? "?"})`,
      };
    }

    if (e.assistMemberId) {
      const aAllowed = rosterByTeam.get(e.teamId);
      if (aAllowed && aAllowed.size > 0 && !aAllowed.has(e.assistMemberId)) {
        return {
          ok: false,
          status: 400,
          error: `assistMemberId ${e.assistMemberId} is not on the roster for team ${e.teamId}`,
        };
      }
    }
  }

  return { ok: true };
}

export type RosterOption = {
  memberId: string;
  displayName: string;
  jerseyNumber?: number | null;
};

export async function buildRosterOptionsForTeams(
  db: Db,
  homeTeamId: string,
  awayTeamId: string,
): Promise<{ home: RosterOption[]; away: RosterOption[] }> {
  const map = await loadRosterMemberIdsByTeamId(db, [homeTeamId, awayTeamId]);
  const homeSet = map.get(homeTeamId);
  const awaySet = map.get(awayTeamId);
  const homeIds = homeSet ? [...homeSet] : [];
  const awayIds = awaySet ? [...awaySet] : [];

  const allIds = [...new Set([...homeIds, ...awayIds])];
  const members =
    allIds.length > 0
      ? await db
          .collection("members")
          .find({ memberId: { $in: allIds } })
          .project({ memberId: 1, personalInfo: 1 })
          .toArray()
      : [];

  const byId = new Map<string, { displayName: string }>();
  for (const m of members) {
    const id = String(m.memberId ?? "");
    if (!id) continue;
    const dn = memberDisplayName(m) || id;
    byId.set(id, { displayName: dn });
  }

  const teamDoc = async (tid: string) => {
    const t = await db.collection("teams").findOne({ teamId: tid }, { projection: { roster: 1 } });
    const roster = (t?.roster as unknown[]) ?? [];
    const jersey = new Map<string, number | null>();
    for (const row of roster) {
      if (!row || typeof row !== "object") continue;
      const r = row as { memberId?: string; jerseyNumber?: number };
      if (typeof r.memberId === "string")
        jersey.set(r.memberId, typeof r.jerseyNumber === "number" ? r.jerseyNumber : null);
    }
    return jersey;
  };

  const homeJersey = await teamDoc(homeTeamId);
  const awayJersey = await teamDoc(awayTeamId);

  const toOpts = (ids: string[], jersey: Map<string, number | null>): RosterOption[] =>
    ids
      .map((memberId) => ({
        memberId,
        displayName: byId.get(memberId)?.displayName ?? memberId,
        jerseyNumber: jersey.get(memberId) ?? null,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    home: toOpts(homeIds, homeJersey),
    away: toOpts(awayIds, awayJersey),
  };
}
