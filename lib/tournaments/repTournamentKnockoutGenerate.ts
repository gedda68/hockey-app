// D4 — Knockout fixture rows from D3 draw skeletons (legacy + multi-division).

import type { TournamentDrawKnockoutMatchSchema } from "@/lib/db/schemas/repTournamentDraw.schema";
import type { TournamentDrawState } from "@/lib/db/schemas/repTournamentDraw.schema";
import type { RepTournamentFixture } from "@/lib/db/schemas/repTournamentFixture.schema";
import { RepTournamentFixtureSchema } from "@/lib/db/schemas/repTournamentFixture.schema";
import type { z } from "zod";
import type { EntryTeamInfo } from "@/lib/tournaments/repTournamentFixtureGenerate";

export type KnockoutMatchDraft = z.infer<typeof TournamentDrawKnockoutMatchSchema>;

export type SkeletonRow = {
  match: KnockoutMatchDraft;
  divisionId?: string;
};

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

export function poolPlaceLabel(poolId: string, place: number): string {
  return `${ordinal(place)} · ${poolId}`;
}

export function collectKnockoutSkeletonMatches(draw: TournamentDrawState): SkeletonRow[] {
  const out: SkeletonRow[] = [];
  if (draw.structure === "multi_division" && draw.divisions?.length) {
    for (const d of draw.divisions) {
      for (const m of d.knockoutMatches ?? []) {
        out.push({ match: m, divisionId: d.divisionId });
      }
    }
  } else {
    for (const m of draw.knockoutMatches ?? []) {
      out.push({ match: m });
    }
  }
  out.sort((a, b) => {
    const ra = a.match.roundIndex - b.match.roundIndex;
    if (ra !== 0) return ra;
    return a.match.order - b.match.order;
  });
  return out;
}

function resolveSide(
  entryId: string | null | undefined,
  poolSource: { poolId: string; place: number } | undefined,
  entryByEntryId: Map<string, EntryTeamInfo>,
): {
  entryId: string | null;
  teamId: string | null;
  teamName: string | null;
  sourceLabel: string | null;
} {
  const fallbackLabel = poolSource
    ? poolPlaceLabel(poolSource.poolId, poolSource.place)
    : null;
  if (entryId) {
    const row = entryByEntryId.get(entryId);
    if (row) {
      return {
        entryId: row.entryId,
        teamId: row.teamId,
        teamName: row.teamName,
        sourceLabel: null,
      };
    }
    return {
      entryId,
      teamId: null,
      teamName: null,
      sourceLabel: fallbackLabel,
    };
  }
  return { entryId: null, teamId: null, teamName: null, sourceLabel: fallbackLabel };
}

export function generateRepKnockoutFixturesFromDraw(input: {
  tournamentId: string;
  draw: TournamentDrawState;
  entryByEntryId: Map<string, EntryTeamInfo>;
  sequenceStart: number;
  createdBy: string;
  nowIso: string;
}): RepTournamentFixture[] {
  const rows = collectKnockoutSkeletonMatches(input.draw);
  const docs: RepTournamentFixture[] = [];
  let seq = input.sequenceStart;
  let idCounter = 0;

  for (const row of rows) {
    const m = row.match;

    const home = resolveSide(m.homeEntryId ?? null, m.homeSource, input.entryByEntryId);
    const away = resolveSide(m.awayEntryId ?? null, m.awaySource, input.entryByEntryId);

    const fixtureId = `rtk-${Date.now().toString(36)}-${idCounter++}-${Math.random().toString(36).slice(2, 8)}`;

    const raw = {
      fixtureId,
      tournamentId: input.tournamentId,
      phase: "knockout" as const,
      drawMatchId: m.matchId,
      bracketTag: m.bracketTag ?? null,
      knockoutRoundLabel: m.roundLabel ?? null,
      knockoutRoundIndex: m.roundIndex,
      matchOrder: m.order,
      homeSourceLabel: home.entryId ? null : home.sourceLabel,
      awaySourceLabel: away.entryId ? null : away.sourceLabel,
      divisionId: m.divisionId ?? row.divisionId ?? null,
      poolId: null,
      poolLabel: null,
      poolRound: m.roundIndex + 1,
      sequence: seq,
      homeEntryId: home.entryId,
      awayEntryId: away.entryId,
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeTeamName: home.teamName,
      awayTeamName: away.teamName,
      status: "scheduled" as const,
      venueId: null,
      venueName: null,
      addressLine: null,
      scheduledStart: null,
      scheduledEnd: null,
      timezone: null,
      published: false,
      publishedAt: null,
      result: null,
      resultStatus: null,
      resultSubmittedAt: null,
      resultSubmittedBy: null,
      resultApprovedAt: null,
      resultApprovedBy: null,
      createdAt: input.nowIso,
      createdBy: input.createdBy,
      updatedAt: input.nowIso,
      updatedBy: input.createdBy,
    };

    docs.push(RepTournamentFixtureSchema.parse(raw));
    seq += 1;
  }

  return docs;
}
