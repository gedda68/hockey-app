// D4 — Build pool round-robin fixtures from a tournament draw (legacy or multi-division).

import type { TournamentDrawState } from "@/lib/db/schemas/repTournamentDraw.schema";
import type { RepTournamentFixture } from "@/lib/db/schemas/repTournamentFixture.schema";
import { RepTournamentFixtureSchema } from "@/lib/db/schemas/repTournamentFixture.schema";
import { generateRoundRobin } from "@/lib/competitions/roundRobin";

export type EntryTeamInfo = {
  entryId: string;
  teamId: string;
  teamName: string;
};

export type DrawPoolSlice = {
  poolId: string;
  label: string;
  entryIds: string[];
  divisionId?: string;
};

/** Pools with at least two entries (round-robin eligible). */
export function collectPoolsFromDraw(draw: TournamentDrawState): DrawPoolSlice[] {
  const out: DrawPoolSlice[] = [];
  if (draw.structure === "multi_division" && draw.divisions?.length) {
    for (const d of draw.divisions) {
      for (const p of d.pools ?? []) {
        if (p.entryIds.length >= 2) {
          out.push({
            poolId: p.poolId,
            label: p.label,
            entryIds: p.entryIds,
            divisionId: d.divisionId,
          });
        }
      }
    }
    return out;
  }
  for (const p of draw.pools ?? []) {
    if (p.entryIds.length >= 2) {
      out.push({ poolId: p.poolId, label: p.label, entryIds: p.entryIds });
    }
  }
  return out;
}

export function generateRepPoolRoundRobinFixtures(input: {
  tournamentId: string;
  draw: TournamentDrawState;
  entryByEntryId: Map<string, EntryTeamInfo>;
  doubleRound?: boolean;
  createdBy: string;
  nowIso: string;
}): RepTournamentFixture[] {
  const pools = collectPoolsFromDraw(input.draw);
  const docs: RepTournamentFixture[] = [];
  let sequence = 0;
  let idCounter = 0;

  for (const pool of pools) {
    const pairs = generateRoundRobin(pool.entryIds, {
      doubleRound: input.doubleRound,
    });
    for (const pair of pairs) {
      const home = input.entryByEntryId.get(pair.homeTeamId);
      const away = input.entryByEntryId.get(pair.awayTeamId);
      if (!home || !away) continue;

      const fixtureId = `rtf-${Date.now().toString(36)}-${idCounter++}-${Math.random().toString(36).slice(2, 8)}`;

      const raw = {
        fixtureId,
        tournamentId: input.tournamentId,
        phase: "pool" as const,
        drawMatchId: null,
        bracketTag: null,
        knockoutRoundLabel: null,
        knockoutRoundIndex: null,
        matchOrder: null,
        homeSourceLabel: null,
        awaySourceLabel: null,
        divisionId: pool.divisionId ?? null,
        poolId: pool.poolId,
        poolLabel: pool.label,
        poolRound: pair.round,
        sequence,
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
      sequence += 1;
    }
  }

  return docs;
}
