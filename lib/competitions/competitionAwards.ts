// lib/competitions/competitionAwards.ts
// Defaults, label resolution, indexes, and persistence for `competition_awards`.

import type { Db } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import type { AwardsLabels } from "@/lib/db/schemas/competitionAwards.schema";
import type { CompetitionAwardType } from "@/lib/db/schemas/competitionAwards.schema";
import { memberDisplayName } from "@/lib/competitions/playerSeasonStats";
import {
  loadRosterMemberIdsByTeamId,
  type RosterValidationResult,
} from "@/lib/competitions/matchEventRoster";

export const COMPETITION_AWARDS_COLLECTION = "competition_awards";

export const DEFAULT_AWARDS_LABELS: Required<AwardsLabels> = {
  playerOfMatch: "Player of the match",
  playerOfCompetition: "Player of the tournament",
  topGoalScorer: "Highest goal scorer",
  rookie: "Rookie of the tournament",
  goalkeeper: "Goal keeper of the tournament",
};

/** League copy: swap “tournament” → “season” in default strings when no custom label. */
export const DEFAULT_AWARDS_LABELS_LEAGUE: Required<AwardsLabels> = {
  playerOfMatch: DEFAULT_AWARDS_LABELS.playerOfMatch,
  playerOfCompetition: "Player of the season",
  topGoalScorer: "Highest goal scorer",
  rookie: "Rookie of the season",
  goalkeeper: "Goal keeper of the season",
};

export function mergeAwardsLabels(
  stored: AwardsLabels | null | undefined,
  defaults: Required<AwardsLabels>,
): Required<AwardsLabels> {
  return {
    playerOfMatch: stored?.playerOfMatch?.trim() || defaults.playerOfMatch,
    playerOfCompetition:
      stored?.playerOfCompetition?.trim() || defaults.playerOfCompetition,
    topGoalScorer: stored?.topGoalScorer?.trim() || defaults.topGoalScorer,
    rookie: stored?.rookie?.trim() || defaults.rookie,
    goalkeeper: stored?.goalkeeper?.trim() || defaults.goalkeeper,
  };
}

export function labelForAwardType(
  awardType: CompetitionAwardType,
  labels: Required<AwardsLabels>,
): string {
  switch (awardType) {
    case "player_of_match":
      return labels.playerOfMatch;
    case "player_of_competition":
      return labels.playerOfCompetition;
    case "top_goal_scorer":
      return labels.topGoalScorer;
    case "rookie":
      return labels.rookie;
    case "goalkeeper":
      return labels.goalkeeper;
    default:
      return awardType;
  }
}

let indexesEnsured = false;

export async function ensureCompetitionAwardIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  const col = db.collection(COMPETITION_AWARDS_COLLECTION);
  await col.createIndex({ seasonCompetitionId: 1, createdAt: -1 });
  await col.createIndex({ tournamentId: 1, createdAt: -1 });
  await col.createIndex({ awardRecordId: 1 }, { unique: true });
  await col.createIndex(
    { seasonCompetitionId: 1, awardType: 1, fixtureId: 1 },
    {
      unique: true,
      partialFilterExpression: {
        context: "league",
        awardType: "player_of_match",
      },
    },
  );
  await col.createIndex(
    { tournamentId: 1, awardType: 1, fixtureId: 1 },
    {
      unique: true,
      partialFilterExpression: {
        context: "tournament",
        awardType: "player_of_match",
      },
    },
  );
  indexesEnsured = true;
}

export async function fetchMemberDisplayName(
  db: Db,
  memberId: string,
): Promise<string> {
  const m = await db
    .collection("members")
    .findOne({ memberId }, { projection: { memberId: 1, personalInfo: 1 } });
  return memberDisplayName(m) || memberId;
}

async function loadMemberIdsForSeasonCompetition(
  db: Db,
  seasonCompetitionId: string,
): Promise<Set<string>> {
  const teams = await db
    .collection("teams")
    .find({ seasonCompetitionId })
    .project({ roster: 1 })
    .toArray();
  const ids = new Set<string>();
  for (const t of teams) {
    const roster = (t.roster as unknown[]) ?? [];
    for (const row of roster) {
      if (!row || typeof row !== "object") continue;
      const mid = (row as { memberId?: string }).memberId;
      if (typeof mid === "string" && mid) ids.add(mid);
    }
  }
  return ids;
}

async function loadMemberIdsForTournamentEntries(
  db: Db,
  tournamentId: string,
): Promise<Set<string>> {
  const entries = await db
    .collection("team_tournament_entries")
    .find({ tournamentId, status: { $ne: "withdrawn" } })
    .project({ attendingMemberIds: 1 })
    .toArray();
  const ids = new Set<string>();
  for (const e of entries) {
    const arr = (e.attendingMemberIds as string[]) ?? [];
    for (const mid of arr) {
      if (mid) ids.add(mid);
    }
  }
  return ids;
}

/** When team rosters exist, member must belong to `teamId` (home or away). */
export async function validateMemberAgainstFixtureRosters(
  db: Db,
  memberId: string,
  teamId: string,
  homeTeamId: string,
  awayTeamId: string,
): Promise<RosterValidationResult> {
  if (teamId !== homeTeamId && teamId !== awayTeamId) {
    return { ok: false, status: 400, error: "teamId must be home or away for this fixture" };
  }
  const map = await loadRosterMemberIdsByTeamId(db, [homeTeamId, awayTeamId]);
  const allowed = map.get(teamId);
  if (allowed && allowed.size > 0 && !allowed.has(memberId)) {
    return {
      ok: false,
      status: 400,
      error: "Member is not on the roster for the selected team",
    };
  }
  return { ok: true };
}

export async function validateLeagueAwardMember(
  db: Db,
  seasonCompetitionId: string,
  awardType: CompetitionAwardType,
  fixtureId: string | null,
  memberId: string,
  teamId: string | null | undefined,
  homeTeamId: string,
  awayTeamId: string,
): Promise<RosterValidationResult> {
  if (awardType === "player_of_match") {
    const tid = String(teamId ?? "").trim();
    if (!tid) {
      return { ok: false, status: 400, error: "teamId is required for player of the match" };
    }
    return validateMemberAgainstFixtureRosters(
      db,
      memberId,
      tid,
      homeTeamId,
      awayTeamId,
    );
  }

  const pool = await loadMemberIdsForSeasonCompetition(db, seasonCompetitionId);
  if (pool.size > 0 && !pool.has(memberId)) {
    return {
      ok: false,
      status: 400,
      error: "Member is not on any team roster for this season competition",
    };
  }
  return { ok: true };
}

export async function validateTournamentAwardMember(
  db: Db,
  tournamentId: string,
  awardType: CompetitionAwardType,
  fixtureId: string | null,
  memberId: string,
  teamId: string | null | undefined,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<RosterValidationResult> {
  if (awardType === "player_of_match") {
    const ht = homeTeamId?.trim() || "";
    const at = awayTeamId?.trim() || "";
    if (!ht || !at) {
      return {
        ok: false,
        status: 400,
        error: "Fixture must have home and away teams for player of the match",
      };
    }
    const tid = String(teamId ?? "").trim();
    if (!tid) {
      return { ok: false, status: 400, error: "teamId is required for player of the match" };
    }
    return validateMemberAgainstFixtureRosters(db, memberId, tid, ht, at);
  }

  const pool = await loadMemberIdsForTournamentEntries(db, tournamentId);
  if (pool.size > 0 && !pool.has(memberId)) {
    return {
      ok: false,
      status: 400,
      error: "Member is not listed as attending for any team in this tournament",
    };
  }
  return { ok: true };
}

export type CompetitionAwardDoc = {
  awardRecordId: string;
  context: "league" | "tournament";
  seasonCompetitionId?: string | null;
  tournamentId?: string | null;
  awardType: CompetitionAwardType;
  fixtureId: string | null;
  memberId: string;
  memberDisplayName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  awardLabelSnapshot: string;
  notes?: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date | null;
  updatedBy?: string | null;
};

export function serializeAwardForClient(doc: CompetitionAwardDoc) {
  return {
    awardRecordId: doc.awardRecordId,
    context: doc.context,
    seasonCompetitionId: doc.seasonCompetitionId ?? null,
    tournamentId: doc.tournamentId ?? null,
    awardType: doc.awardType,
    fixtureId: doc.fixtureId,
    memberId: doc.memberId,
    memberDisplayName: doc.memberDisplayName ?? null,
    teamId: doc.teamId ?? null,
    teamName: doc.teamName ?? null,
    awardLabelSnapshot: doc.awardLabelSnapshot,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    createdBy: doc.createdBy,
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt ?? null,
    updatedBy: doc.updatedBy ?? null,
  };
}

export async function resolveTeamName(
  db: Db,
  teamId: string | null | undefined,
): Promise<string | null> {
  if (!teamId) return null;
  const t = await db
    .collection("teams")
    .findOne({ teamId }, { projection: { displayName: 1, name: 1 } });
  if (!t) return null;
  return String(t.displayName ?? t.name ?? "") || null;
}

export async function insertCompetitionAward(
  db: Db,
  input: {
    context: "league" | "tournament";
    seasonCompetitionId?: string | null;
    tournamentId?: string | null;
    awardType: CompetitionAwardType;
    fixtureId: string | null;
    memberId: string;
    memberDisplayName: string;
    teamId?: string | null;
    teamName?: string | null;
    awardLabelSnapshot: string;
    notes?: string | null;
    createdBy: string;
  },
): Promise<CompetitionAwardDoc> {
  await ensureCompetitionAwardIndexes(db);
  const awardRecordId = uuidv4();
  const doc: CompetitionAwardDoc = {
    awardRecordId,
    context: input.context,
    seasonCompetitionId: input.seasonCompetitionId ?? null,
    tournamentId: input.tournamentId ?? null,
    awardType: input.awardType,
    fixtureId: input.fixtureId,
    memberId: input.memberId,
    memberDisplayName: input.memberDisplayName,
    teamId: input.teamId ?? null,
    teamName: input.teamName ?? null,
    awardLabelSnapshot: input.awardLabelSnapshot,
    notes: input.notes ?? null,
    createdAt: new Date(),
    createdBy: input.createdBy,
  };
  await db.collection(COMPETITION_AWARDS_COLLECTION).insertOne(doc);
  return doc;
}

export async function upsertPlayerOfMatchAward(
  db: Db,
  input: Omit<Parameters<typeof insertCompetitionAward>[1], "awardType" | "fixtureId"> & {
    fixtureId: string;
    awardType: "player_of_match";
  },
): Promise<CompetitionAwardDoc> {
  await ensureCompetitionAwardIndexes(db);
  const filter =
    input.context === "league"
      ? {
          context: "league" as const,
          seasonCompetitionId: input.seasonCompetitionId,
          awardType: "player_of_match" as const,
          fixtureId: input.fixtureId,
        }
      : {
          context: "tournament" as const,
          tournamentId: input.tournamentId,
          awardType: "player_of_match" as const,
          fixtureId: input.fixtureId,
        };

  const existing = await db.collection(COMPETITION_AWARDS_COLLECTION).findOne(filter);
  const awardRecordId = existing?.awardRecordId
    ? String((existing as { awardRecordId?: string }).awardRecordId)
    : uuidv4();

  const doc: CompetitionAwardDoc = {
    awardRecordId,
    context: input.context,
    seasonCompetitionId: input.seasonCompetitionId ?? null,
    tournamentId: input.tournamentId ?? null,
    awardType: "player_of_match",
    fixtureId: input.fixtureId,
    memberId: input.memberId,
    memberDisplayName: input.memberDisplayName,
    teamId: input.teamId ?? null,
    teamName: input.teamName ?? null,
    awardLabelSnapshot: input.awardLabelSnapshot,
    notes: input.notes ?? null,
    createdAt:
      existing != null &&
      (existing.createdAt as Date | undefined) instanceof Date
        ? (existing.createdAt as Date)
        : new Date(),
    createdBy: existing
      ? String((existing as { createdBy?: string }).createdBy ?? input.createdBy)
      : input.createdBy,
    updatedAt: new Date(),
    updatedBy: input.createdBy,
  };

  await db.collection(COMPETITION_AWARDS_COLLECTION).replaceOne(filter, doc, {
    upsert: true,
  });
  return doc;
}
