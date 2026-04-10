// lib/competitions/playerSeasonStats.ts
// Aggregate player-level stats from fixture matchEvents (E6).

export type MatchEventStored = {
  eventId: string;
  kind: "goal" | "green_card" | "yellow_card" | "red_card";
  teamId: string;
  memberId: string;
  assistMemberId?: string | null;
  period?: number | null;
  minute?: number | null;
  notes?: string | null;
};

export type PlayerSeasonTotals = {
  memberId: string;
  goals: number;
  assists: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  matchesWithEvents: number;
};

export type PlayerFixtureStatRow = {
  fixtureId: string;
  round: number;
  teamId: string;
  opponentTeamId: string;
  isHome: boolean;
  events: MatchEventStored[];
};

export function isFixtureResultPublicForEvents(
  fixture: {
    status?: unknown;
    result?: unknown;
    resultStatus?: unknown;
  },
  requiresApproval: boolean,
): boolean {
  const rs = String(fixture.resultStatus ?? "");
  if (requiresApproval) return rs === "approved";
  return fixture.result != null && String(fixture.status) === "completed";
}

function emptyTotals(memberId: string): PlayerSeasonTotals {
  return {
    memberId,
    goals: 0,
    assists: 0,
    greenCards: 0,
    yellowCards: 0,
    redCards: 0,
    matchesWithEvents: 0,
  };
}

function touchTotals(map: Map<string, PlayerSeasonTotals>, memberId: string) {
  if (!map.has(memberId)) map.set(memberId, emptyTotals(memberId));
  return map.get(memberId)!;
}

export function asMatchEvents(raw: unknown): MatchEventStored[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchEventStored[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const eventId = typeof o.eventId === "string" ? o.eventId : "";
    const kind = o.kind as MatchEventStored["kind"];
    const teamId = typeof o.teamId === "string" ? o.teamId : "";
    const memberId = typeof o.memberId === "string" ? o.memberId : "";
    if (!eventId || !teamId || !memberId) continue;
    if (!["goal", "green_card", "yellow_card", "red_card"].includes(kind)) continue;
    out.push({
      eventId,
      kind,
      teamId,
      memberId,
      assistMemberId:
        typeof o.assistMemberId === "string" || o.assistMemberId === null
          ? (o.assistMemberId as string | null)
          : undefined,
      period: typeof o.period === "number" ? o.period : null,
      minute: typeof o.minute === "number" ? o.minute : null,
      notes: typeof o.notes === "string" ? o.notes : null,
    });
  }
  return out;
}

/**
 * Count goals, assists, cards; per-member fixture breakdown for season career view.
 */
export function aggregatePlayerStatsForSeason(
  fixtures: Array<{
    fixtureId: string;
    round: unknown;
    homeTeamId: string;
    awayTeamId: string;
    status?: unknown;
    result?: unknown;
    resultStatus?: unknown;
    matchEvents?: unknown;
  }>,
  requiresApproval: boolean,
): {
  totalsByMember: Map<string, PlayerSeasonTotals>;
  fixturesByMember: Map<string, PlayerFixtureStatRow[]>;
} {
  const totalsByMember = new Map<string, PlayerSeasonTotals>();
  const byMemberFixture = new Map<string, Map<string, PlayerFixtureStatRow>>();

  function ensureFixtureRow(
    memberId: string,
    fixtureId: string,
    teamId: string,
    home: string,
    away: string,
    round: number,
  ): PlayerFixtureStatRow {
    if (!byMemberFixture.has(memberId)) byMemberFixture.set(memberId, new Map());
    const fm = byMemberFixture.get(memberId)!;
    let row = fm.get(fixtureId);
    if (!row) {
      const isHome = teamId === home;
      row = {
        fixtureId,
        round,
        teamId,
        opponentTeamId: isHome ? away : home,
        isHome,
        events: [],
      };
      fm.set(fixtureId, row);
      touchTotals(totalsByMember, memberId).matchesWithEvents += 1;
    }
    return row;
  }

  for (const f of fixtures) {
    if (!isFixtureResultPublicForEvents(f, requiresApproval)) continue;
    const home = String(f.homeTeamId);
    const away = String(f.awayTeamId);
    const round = Number(f.round) || 0;
    const events = asMatchEvents(f.matchEvents);
    if (events.length === 0) continue;

    for (const ev of events) {
      if (ev.teamId !== home && ev.teamId !== away) continue;

      const row = ensureFixtureRow(ev.memberId, f.fixtureId, ev.teamId, home, away, round);
      row.events.push(ev);

      const tp = touchTotals(totalsByMember, ev.memberId);
      switch (ev.kind) {
        case "goal":
          tp.goals += 1;
          break;
        case "green_card":
          tp.greenCards += 1;
          break;
        case "yellow_card":
          tp.yellowCards += 1;
          break;
        case "red_card":
          tp.redCards += 1;
          break;
        default:
          break;
      }

      if (ev.kind === "goal" && ev.assistMemberId) {
        const aid = ev.assistMemberId;
        const aRow = ensureFixtureRow(aid, f.fixtureId, ev.teamId, home, away, round);
        aRow.events.push({
          ...ev,
          memberId: aid,
          assistMemberId: null,
          notes: ev.notes ? `${ev.notes} (assist)` : "assist",
        });
        touchTotals(totalsByMember, aid).assists += 1;
      }
    }
  }

  const fixturesByMember = new Map<string, PlayerFixtureStatRow[]>();
  for (const [memberId, fm] of byMemberFixture) {
    const rows = [...fm.values()].sort(
      (a, b) => a.round - b.round || a.fixtureId.localeCompare(b.fixtureId),
    );
    fixturesByMember.set(memberId, rows);
  }

  return { totalsByMember, fixturesByMember };
}

export function memberDisplayName(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const pi = (doc as Record<string, unknown>).personalInfo as
    | Record<string, unknown>
    | undefined;
  if (pi && typeof pi === "object") {
    const dn = pi.displayName;
    if (typeof dn === "string" && dn.trim()) return dn.trim();
    const fn = typeof pi.firstName === "string" ? pi.firstName : "";
    const ln = typeof pi.lastName === "string" ? pi.lastName : "";
    const name = `${fn} ${ln}`.trim();
    if (name) return name;
  }
  return "";
}
