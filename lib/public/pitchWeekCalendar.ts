/**
 * Epic V3 — Build public venue/pitch week calendar payload (matches + training + private).
 */

import { defaultFixtureSlotMs } from "@/lib/competitions/pitchScheduleConflict";

export type PitchColumn = {
  columnKey: string;
  venueId: string;
  venueName: string;
  pitchId: string;
  pitchLabel: string;
};

export type CalendarDayHeader = {
  dateKey: string;
  /** Short label for UI (UTC calendar day). */
  dayLabel: string;
};

export type PublicCalendarEvent =
  | {
      kind: "match";
      fixtureId: string;
      seasonCompetitionId: string;
      round: number;
      scheduledStart: string;
      scheduledEnd: string | null;
      summary: string;
      homeTeamName: string;
      awayTeamName: string;
      competitionLabel: string | null;
    }
  | {
      kind: "training";
      entryId: string;
      scheduledStart: string;
      scheduledEnd: string | null;
      summary: string;
      organizerLabel: string;
    }
  | {
      kind: "private";
      entryId: string;
      scheduledStart: string;
      scheduledEnd: string | null;
      summary: "Private";
    };

export type PitchWeekCalendarResponse = {
  associationId: string;
  associationName: string;
  weekStart: string;
  weekEndExclusive: string;
  venueFilter: string | null;
  days: CalendarDayHeader[];
  columns: PitchColumn[];
  /** Key `${dateKey}::${columnKey}` → events overlapping that UTC calendar day on that pitch. */
  cells: Record<string, PublicCalendarEvent[]>;
};

export function utcParseDayStartIso(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const ms = Date.parse(`${ymd}T00:00:00.000Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function buildUtcWeekDayHeaders(weekStartMs: number): CalendarDayHeader[] {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const days: CalendarDayHeader[] = [];
  for (let i = 0; i < 7; i++) {
    const startMs = weekStartMs + i * 86_400_000;
    const dateKey = new Date(startMs).toISOString().slice(0, 10);
    days.push({ dateKey, dayLabel: fmt.format(new Date(startMs)) });
  }
  return days;
}

export function intervalOverlapMs(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): boolean {
  return a0 < b1 && b0 < a1;
}

function fixtureEndMs(startMs: number, scheduledEnd: string | null | undefined): number {
  if (scheduledEnd) {
    const e = Date.parse(scheduledEnd);
    if (!Number.isNaN(e) && e > startMs) return e;
  }
  return startMs + defaultFixtureSlotMs();
}

function entryEndMs(startMs: number, scheduledEnd: string | null | undefined): number {
  if (scheduledEnd) {
    const e = Date.parse(scheduledEnd);
    if (!Number.isNaN(e) && e > startMs) return e;
  }
  return startMs + 60 * 60_000;
}

type VenueRow = {
  venueId: string;
  name: string;
  status?: string;
  pitches?: Array<{ pitchId: string; label: string }>;
};

export function buildPitchColumnsFromVenues(
  venues: VenueRow[],
  venueIdFilter: string | null,
): PitchColumn[] {
  const cols: PitchColumn[] = [];
  for (const v of venues) {
    if ((v.status ?? "active") !== "active") continue;
    if (venueIdFilter && v.venueId !== venueIdFilter) continue;
    const venueName = String(v.name ?? "Venue");
    for (const p of v.pitches ?? []) {
      if (!p?.pitchId || !p?.label) continue;
      cols.push({
        columnKey: `${v.venueId}::${p.pitchId}`,
        venueId: v.venueId,
        venueName,
        pitchId: p.pitchId,
        pitchLabel: p.label,
      });
    }
  }
  cols.sort((a, b) =>
    `${a.venueName} ${a.pitchLabel}`.localeCompare(`${b.venueName} ${b.pitchLabel}`, undefined, {
      sensitivity: "base",
    }),
  );
  return cols;
}

function pitchToVenueId(venues: VenueRow[], pitchId: string): string | null {
  for (const v of venues) {
    if ((v.status ?? "active") !== "active") continue;
    for (const p of v.pitches ?? []) {
      if (p.pitchId === pitchId) return v.venueId;
    }
  }
  return null;
}

function columnKeyForPitch(columns: PitchColumn[], venueId: string, pitchId: string): string | null {
  const hit = columns.find((c) => c.venueId === venueId && c.pitchId === pitchId);
  return hit?.columnKey ?? null;
}

export function buildPitchWeekCalendarResponse(input: {
  associationId: string;
  associationName: string;
  weekStartYmd: string;
  weekStartMs: number;
  weekEndExclusiveMs: number;
  venueIdFilter: string | null;
  venues: VenueRow[];
  fixtures: Array<{
    fixtureId: string;
    seasonCompetitionId: string;
    round: number;
    homeTeamId: string;
    awayTeamId: string;
    pitchId?: string | null;
    venueId?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    status?: string | null;
  }>;
  teamNameById: Map<string, string>;
  seasonLabelById: Map<string, string | null>;
  entries: Array<{
    entryId: string;
    venueId: string;
    pitchId: string;
    scheduledStart: string;
    scheduledEnd?: string | null;
    displayKind: "training" | "private";
    trainingOrganizer?: "club" | "association";
    trainingClubId?: string | null;
  }>;
  clubNameById: Map<string, string>;
}): PitchWeekCalendarResponse {
  const columns = buildPitchColumnsFromVenues(input.venues, input.venueIdFilter);
  const columnKeySet = new Set(columns.map((c) => c.columnKey));

  const days = buildUtcWeekDayHeaders(input.weekStartMs);
  const cells: Record<string, PublicCalendarEvent[]> = {};

  const pushCell = (dateKey: string, columnKey: string, ev: PublicCalendarEvent) => {
    const key = `${dateKey}::${columnKey}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(ev);
  };

  const dayRanges = days.map((d) => {
    const start = utcParseDayStartIso(d.dateKey);
    return {
      dateKey: d.dateKey,
      startMs: start!,
      endMs: start! + 86_400_000,
    };
  });

  for (const fx of input.fixtures) {
    if (String(fx.status ?? "") === "cancelled") continue;
    const pid = typeof fx.pitchId === "string" ? fx.pitchId.trim() : "";
    if (!pid) continue;
    const startIso = fx.scheduledStart;
    if (!startIso) continue;
    const startMs = Date.parse(startIso);
    if (Number.isNaN(startMs)) continue;
    const endMs = fixtureEndMs(startMs, fx.scheduledEnd ?? null);
    let venueId = typeof fx.venueId === "string" ? fx.venueId.trim() : "";
    if (!venueId) {
      const inferred = pitchToVenueId(input.venues, pid);
      if (!inferred) continue;
      venueId = inferred;
    }
    const ck = columnKeyForPitch(columns, venueId, pid);
    if (!ck || !columnKeySet.has(ck)) continue;

    const home =
      input.teamNameById.get(String(fx.homeTeamId ?? "")) ?? String(fx.homeTeamId ?? "");
    const away =
      input.teamNameById.get(String(fx.awayTeamId ?? "")) ?? String(fx.awayTeamId ?? "");
    const comp =
      input.seasonLabelById.get(String(fx.seasonCompetitionId ?? "")) ?? null;
    const ev: PublicCalendarEvent = {
      kind: "match",
      fixtureId: String(fx.fixtureId),
      seasonCompetitionId: String(fx.seasonCompetitionId),
      round: Number(fx.round ?? 0),
      scheduledStart: startIso,
      scheduledEnd: fx.scheduledEnd ? String(fx.scheduledEnd) : null,
      summary: `${home} vs ${away}`,
      homeTeamName: home,
      awayTeamName: away,
      competitionLabel: comp,
    };

    for (const dr of dayRanges) {
      if (intervalOverlapMs(startMs, endMs, dr.startMs, dr.endMs)) {
        pushCell(dr.dateKey, ck, ev);
      }
    }
  }

  for (const en of input.entries) {
    const ck = columnKeyForPitch(columns, en.venueId, en.pitchId);
    if (!ck || !columnKeySet.has(ck)) continue;
    const startMs = Date.parse(en.scheduledStart);
    if (Number.isNaN(startMs)) continue;
    const endMs = entryEndMs(startMs, en.scheduledEnd ?? null);

    let ev: PublicCalendarEvent;
    if (en.displayKind === "private") {
      ev = {
        kind: "private",
        entryId: en.entryId,
        scheduledStart: en.scheduledStart,
        scheduledEnd: en.scheduledEnd ? String(en.scheduledEnd) : null,
        summary: "Private",
      };
    } else {
      let organizerLabel = input.associationName;
      if (en.trainingOrganizer === "club" && en.trainingClubId) {
        organizerLabel =
          input.clubNameById.get(en.trainingClubId) ?? en.trainingClubId;
      }
      ev = {
        kind: "training",
        entryId: en.entryId,
        scheduledStart: en.scheduledStart,
        scheduledEnd: en.scheduledEnd ? String(en.scheduledEnd) : null,
        summary: `Training — ${organizerLabel}`,
        organizerLabel,
      };
    }

    for (const dr of dayRanges) {
      if (intervalOverlapMs(startMs, endMs, dr.startMs, dr.endMs)) {
        pushCell(dr.dateKey, ck, ev);
      }
    }
  }

  for (const k of Object.keys(cells)) {
    cells[k].sort(
      (a, b) =>
        Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart) ||
        a.kind.localeCompare(b.kind),
    );
  }

  return {
    associationId: input.associationId,
    associationName: input.associationName,
    weekStart: input.weekStartYmd,
    weekEndExclusive: new Date(input.weekEndExclusiveMs).toISOString().slice(0, 10),
    venueFilter: input.venueIdFilter,
    days,
    columns,
    cells,
  };
}
