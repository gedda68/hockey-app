// lib/competitions/matchTimeline.ts
// Groups match events into periods (quarters / halves) and adds club-level rows
// for set pieces that aren't attributed to a player (penalty corners awarded).

import type { FixtureMatchEventPublic } from "@/types";

export interface TeamPeriodCounts {
  penaltyCornersAwarded?: { total: number; byPeriod: (number | null)[] } | null;
  penaltyStrokesAwarded?: { total: number; byPeriod: (number | null)[] } | null;
}

export type TimelineItem =
  | { type: "event"; event: FixtureMatchEventPublic }
  | {
      type: "club";
      teamId: string;
      kind: "penalty_corners" | "penalty_strokes";
      awarded: number;
      scored: number;
    };

export interface TimelineGroup {
  key: string;
  label: string;
  /** e.g. "0'–17'" */
  range: string | null;
  items: TimelineItem[];
}

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
const HALF = ["First half", "Second half"];

export function periodLabel(index: number, count: number): string {
  if (count === 2) return HALF[index] ?? `Period ${index + 1}`;
  if (count === 4) return `${ORDINAL[index]} quarter`;
  return `Period ${index + 1}`;
}

const isPcGoal = (e: FixtureMatchEventPublic) => e.kind === "goal" && /penalty corner/i.test(e.notes ?? "");
const isPsGoal = (e: FixtureMatchEventPublic) => e.kind === "penalty_stroke_goal";

export function buildMatchTimeline(
  events: FixtureMatchEventPublic[],
  periodEndMinutes: number[],
  teamStats: Record<string, TeamPeriodCounts>,
  teamOrder: string[],
): TimelineGroup[] {
  const sorted = [...events].sort((a, b) => (a.minute ?? Infinity) - (b.minute ?? Infinity));
  const timed = sorted.filter((e) => typeof e.minute === "number");
  const untimed = sorted.filter((e) => typeof e.minute !== "number");

  // No period information: one flat group (legacy fixtures)
  if (periodEndMinutes.length === 0) {
    const groups: TimelineGroup[] = [{ key: "all", label: "Match", range: null, items: timed.map((event) => ({ type: "event" as const, event })) }];
    const clubRows = clubItems(teamOrder, teamStats, events, null);
    if (clubRows.length) groups[0]!.items.unshift(...clubRows);
    if (untimed.length) groups.push({ key: "untimed", label: "Time not recorded", range: null, items: untimed.map((event) => ({ type: "event" as const, event })) });
    return groups.filter((g) => g.items.length);
  }

  const count = periodEndMinutes.length;
  const groups: TimelineGroup[] = periodEndMinutes.map((end, i) => {
    const start = i === 0 ? 0 : periodEndMinutes[i - 1]!;
    const last = i === count - 1;
    const inPeriod = timed.filter((e) => e.minute! > start - (i === 0 ? 1 : 0) && (last || e.minute! <= end));
    return {
      key: `p${i + 1}`,
      label: periodLabel(i, count),
      range: `${start}'–${end}'`,
      items: [
        ...clubItems(teamOrder, teamStats, inPeriod, i),
        ...inPeriod.map((event) => ({ type: "event" as const, event })),
      ],
    };
  });
  if (untimed.length) {
    groups.push({ key: "untimed", label: "Time not recorded", range: null, items: untimed.map((event) => ({ type: "event" as const, event })) });
  }
  return groups;
}

/** Club rows for one period (or the whole match when periodIndex is null). */
function clubItems(
  teamOrder: string[],
  teamStats: Record<string, TeamPeriodCounts>,
  periodEvents: FixtureMatchEventPublic[],
  periodIndex: number | null,
): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const teamId of teamOrder) {
    const st = teamStats[teamId];
    const pick = (c?: { total: number; byPeriod: (number | null)[] } | null) =>
      c ? (periodIndex == null ? c.total : c.byPeriod[periodIndex] ?? 0) : 0;
    const pcs = pick(st?.penaltyCornersAwarded);
    if (pcs > 0) {
      items.push({
        type: "club",
        teamId,
        kind: "penalty_corners",
        awarded: pcs,
        scored: periodEvents.filter((e) => e.teamId === teamId && isPcGoal(e)).length,
      });
    }
    const pss = pick(st?.penaltyStrokesAwarded);
    if (pss > 0) {
      items.push({
        type: "club",
        teamId,
        kind: "penalty_strokes",
        awarded: pss,
        scored: periodEvents.filter((e) => e.teamId === teamId && isPsGoal(e)).length,
      });
    }
  }
  return items;
}
