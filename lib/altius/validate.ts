// lib/altius/validate.ts
// Validates transformed Altius documents against the app's own zod schemas,
// so a seed run fails before writing anything the app can't read.

import { CompetitionSchema, SeasonCompetitionSchema } from "@/lib/db/schemas/competition.schema";
import { TeamSchema, MemberTeamRegistrationSchema } from "@/lib/db/schemas/team.schema";
import { LeagueFixtureSchema, FixtureMatchEventSchema } from "@/lib/db/schemas/leagueFixture.schema";
import { AssociationVenueSchema } from "@/lib/db/schemas/associationVenue.schema";
import type { TransformResult } from "./transform";

type Doc = Record<string, any>;

export function validateTransform(t: TransformResult): string[] {
  const problems: string[] = [];
  const now = new Date();
  const nowIso = now.toISOString();
  const check = (label: string, schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, doc: unknown) => {
    const r = schema.safeParse(doc);
    if (!r.success) {
      for (const i of r.error!.issues.slice(0, 3)) problems.push(`${label}: ${i.path.join(".") || "(root)"} — ${i.message}`);
    }
  };
  for (const d of t.competitions) check(`competition ${d.competitionId}`, CompetitionSchema, { ...d, createdAt: now });
  for (const d of t.seasonCompetitions) check(`season_competition ${d.seasonCompetitionId}`, SeasonCompetitionSchema, { ...d, createdAt: now });
  for (const d of t.teams) check(`team ${d.teamId}`, TeamSchema, { ...d, createdAt: now });
  for (const d of t.fixtures) {
    check(`fixture ${d.fixtureId}`, LeagueFixtureSchema, { ...d, createdAt: nowIso });
    for (const e of (d.matchEvents as Doc[] | null) ?? []) check(`fixture ${d.fixtureId} event ${e.eventId}`, FixtureMatchEventSchema, e);
  }
  for (const d of t.venues) check(`venue ${d.venueId}`, AssociationVenueSchema, { ...d, createdAt: nowIso, updatedAt: nowIso });
  for (const m of t.members) {
    for (const team of (m.teams as Doc[]) ?? []) {
      const { appearances: _n, ...reg } = team;
      check(`member ${m.memberId} team ${team.teamId}`, MemberTeamRegistrationSchema, reg);
    }
  }

  // Referential integrity inside the batch
  const teamIds = new Set(t.teams.map((x) => x.teamId));
  const scIds = new Set(t.seasonCompetitions.map((x) => x.seasonCompetitionId));
  const memberIds = new Set(t.members.map((x) => x.memberId));
  for (const f of t.fixtures) {
    if (!teamIds.has(f.homeTeamId)) problems.push(`fixture ${f.fixtureId}: unknown homeTeamId ${f.homeTeamId}`);
    if (!teamIds.has(f.awayTeamId)) problems.push(`fixture ${f.fixtureId}: unknown awayTeamId ${f.awayTeamId}`);
    if (!scIds.has(f.seasonCompetitionId)) problems.push(`fixture ${f.fixtureId}: unknown seasonCompetitionId`);
    for (const e of (f.matchEvents as Doc[] | null) ?? []) {
      if (!memberIds.has(e.memberId)) problems.push(`fixture ${f.fixtureId}: event member ${e.memberId} not in batch`);
    }
    for (const u of (f.umpires as Doc[] | null) ?? []) {
      if (!memberIds.has(u.umpireId)) problems.push(`fixture ${f.fixtureId}: umpire ${u.umpireId} not in batch`);
    }
  }
  for (const team of t.teams) {
    for (const r of team.roster as Doc[]) if (!memberIds.has(r.memberId)) problems.push(`team ${team.teamId}: roster member ${r.memberId} not in batch`);
  }
  return problems;
}
