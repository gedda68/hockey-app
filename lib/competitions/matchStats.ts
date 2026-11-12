// lib/competitions/matchStats.ts
// Per-match stats for the public match centre, derived from the fixture's
// match events and lineups (no extra stored data needed).

import type { FixtureMatchEventPublic } from "@/types";

export interface MatchStatPlayer {
  memberId: string;
  name: string;
  shirtNumber: number | null;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  href: string | null;
}

export interface MatchStatsRow {
  key: string;
  label: string;
  home: number;
  away: number;
}

export interface MatchScorer extends MatchStatPlayer {
  goals: { minute: number | null; type: string }[];
}

export interface MatchLineupEntry extends MatchStatPlayer {
  goals: number;
  cards: ("green" | "yellow" | "red")[];
  started: boolean;
  minuteEntered: number | null;
  didNotPlay: boolean;
}

export interface MatchStats {
  rows: MatchStatsRow[];
  scorers: { home: MatchScorer[]; away: MatchScorer[] };
  lineups: { home: MatchLineupEntry[]; away: MatchLineupEntry[] };
  hasEvents: boolean;
  hasLineups: boolean;
}

type PlayerLike = Partial<MatchStatPlayer> & {
  teamId?: string | null;
  started?: boolean;
  minuteEntered?: number | null;
  didNotPlay?: boolean;
};

export function goalType(e: Pick<FixtureMatchEventPublic, "kind" | "notes">): "field" | "corner" | "stroke" | "shootout" | null {
  if (e.kind === "penalty_stroke_goal") return "stroke";
  if (e.kind === "shootout_goal") return "shootout";
  if (e.kind !== "goal") return null;
  return /penalty corner/i.test(e.notes ?? "") ? "corner" : "field";
}

const GOAL_TYPE_LABEL = { field: "Field goal", corner: "Penalty corner", stroke: "Penalty stroke", shootout: "Shootout" } as const;

export function computeMatchStats(
  events: FixtureMatchEventPublic[],
  homeTeamId: string | undefined,
  awayTeamId: string | undefined,
  players: Record<string, PlayerLike>,
): MatchStats {
  const side = (teamId: string | null | undefined): "home" | "away" | null =>
    teamId && teamId === homeTeamId ? "home" : teamId && teamId === awayTeamId ? "away" : null;

  const count = (pred: (e: FixtureMatchEventPublic) => boolean) => {
    const c = { home: 0, away: 0 };
    for (const e of events) {
      const s = side(e.teamId);
      if (s && pred(e)) c[s]++;
    }
    return c;
  };

  const rows: MatchStatsRow[] = [
    { key: "goals", label: "Goals", ...count((e) => goalType(e) !== null && goalType(e) !== "shootout") },
    { key: "field", label: "Field goals", ...count((e) => goalType(e) === "field") },
    { key: "corner", label: "Penalty corner goals", ...count((e) => goalType(e) === "corner") },
    { key: "stroke", label: "Penalty stroke goals", ...count((e) => goalType(e) === "stroke") },
    { key: "green", label: "Green cards", ...count((e) => e.kind === "green_card") },
    { key: "yellow", label: "Yellow cards", ...count((e) => e.kind === "yellow_card") },
    { key: "red", label: "Red cards", ...count((e) => e.kind === "red_card") },
    { key: "saves", label: "Goalkeeper saves", ...count((e) => e.kind === "gk_save") },
  ].filter((r) => r.key === "goals" || r.home + r.away > 0);

  const base = (memberId: string): MatchStatPlayer => {
    const p = players[memberId] ?? {};
    return {
      memberId,
      name: p.name ?? "Unknown player",
      shirtNumber: p.shirtNumber ?? null,
      isGoalkeeper: p.isGoalkeeper ?? false,
      isCaptain: p.isCaptain ?? false,
      href: p.href ?? null,
    };
  };

  // Scorers (by side, ordered by first goal)
  const scorers = { home: new Map<string, MatchScorer>(), away: new Map<string, MatchScorer>() };
  const sorted = [...events].sort((a, b) => (a.minute ?? -1) - (b.minute ?? -1));
  for (const e of sorted) {
    const t = goalType(e);
    const s = side(e.teamId);
    if (!t || t === "shootout" || !s || !e.memberId) continue;
    const entry = scorers[s].get(e.memberId) ?? { ...base(e.memberId), goals: [] };
    entry.goals.push({ minute: e.minute ?? null, type: GOAL_TYPE_LABEL[t] });
    scorers[s].set(e.memberId, entry);
  }

  // Lineups with goals/cards
  const lineups = { home: [] as MatchLineupEntry[], away: [] as MatchLineupEntry[] };
  for (const [memberId, p] of Object.entries(players)) {
    const s = side(p.teamId ?? null);
    if (!s) continue;
    const mine = events.filter((e) => e.memberId === memberId);
    lineups[s].push({
      ...base(memberId),
      started: p.started ?? false,
      minuteEntered: p.minuteEntered ?? null,
      didNotPlay: p.didNotPlay ?? false,
      goals: mine.filter((e) => {
        const t = goalType(e);
        return t !== null && t !== "shootout";
      }).length,
      cards: mine
        .filter((e) => e.kind.endsWith("_card"))
        .map((e) => (e.kind === "red_card" ? "red" : e.kind === "yellow_card" ? "yellow" : "green")),
    });
  }
  // Starters by shirt, then substitutes by minute entered, then DNP
  const group = (p: MatchLineupEntry) => (p.started ? 0 : p.didNotPlay ? 2 : 1);
  const byShirt = (a: MatchLineupEntry, b: MatchLineupEntry) =>
    group(a) - group(b) ||
    (group(a) === 1 ? (a.minuteEntered ?? 999) - (b.minuteEntered ?? 999) : 0) ||
    (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999) ||
    a.name.localeCompare(b.name);
  lineups.home.sort(byShirt);
  lineups.away.sort(byShirt);

  return {
    rows,
    scorers: { home: [...scorers.home.values()], away: [...scorers.away.values()] },
    lineups,
    hasEvents: events.length > 0,
    hasLineups: lineups.home.length + lineups.away.length > 0,
  };
}

/** "(C)", "(GK)" or "(GK, C)" — empty when neither. */
export function roleTag(p: { isCaptain: boolean; isGoalkeeper: boolean }): string {
  if (p.isGoalkeeper && p.isCaptain) return "(GK, C)";
  if (p.isGoalkeeper) return "(GK)";
  if (p.isCaptain) return "(C)";
  return "";
}

/** "Started", "On 12'" or "DNP" (null when nothing recorded). */
export function entryLabel(p: { started: boolean; minuteEntered: number | null; didNotPlay: boolean }): string | null {
  if (p.started) return "Started";
  if (p.didNotPlay) return "DNP";
  if (p.minuteEntered != null) return `On ${p.minuteEntered}'`;
  return "Sub";
}
