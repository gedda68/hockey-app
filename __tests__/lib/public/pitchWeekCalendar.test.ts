import { describe, expect, it } from "vitest";
import {
  buildPitchColumnsFromVenues,
  buildPitchMonthCalendarResponse,
  buildPitchWeekCalendarResponse,
  buildUtcDayHeadersInRange,
  intervalOverlapMs,
  summarizeCellsForMonth,
  utcParseDayStartIso,
  utcParseMonthYm,
  buildUtcWeekDayHeaders,
} from "@/lib/public/pitchWeekCalendar";

describe("utcParseDayStartIso", () => {
  it("parses valid YMD", () => {
    expect(utcParseDayStartIso("2026-04-13")).toBe(Date.parse("2026-04-13T00:00:00.000Z"));
  });
  it("rejects invalid", () => {
    expect(utcParseDayStartIso("nope")).toBeNull();
  });
});

describe("intervalOverlapMs", () => {
  it("detects overlap", () => {
    expect(intervalOverlapMs(0, 10, 5, 15)).toBe(true);
  });
  it("no overlap when touching", () => {
    expect(intervalOverlapMs(0, 10, 10, 20)).toBe(false);
  });
});

describe("utcParseMonthYm", () => {
  it("parses April 2026", () => {
    const b = utcParseMonthYm("2026-04");
    expect(b).not.toBeNull();
    expect(new Date(b!.startMs).toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(new Date(b!.endExclusiveMs).toISOString().slice(0, 10)).toBe("2026-05-01");
  });
  it("rejects invalid", () => {
    expect(utcParseMonthYm("2026-13")).toBeNull();
  });
});

describe("buildUtcDayHeadersInRange", () => {
  it("returns all days in April 2026", () => {
    const b = utcParseMonthYm("2026-04")!;
    const d = buildUtcDayHeadersInRange(b.startMs, b.endExclusiveMs);
    expect(d).toHaveLength(30);
    expect(d[0].dateKey).toBe("2026-04-01");
    expect(d[29].dateKey).toBe("2026-04-30");
  });
});

describe("buildUtcWeekDayHeaders", () => {
  it("returns 7 days", () => {
    const ms = Date.parse("2026-04-13T00:00:00.000Z");
    const d = buildUtcWeekDayHeaders(ms);
    expect(d).toHaveLength(7);
    expect(d[0].dateKey).toBe("2026-04-13");
    expect(d[6].dateKey).toBe("2026-04-19");
  });
});

describe("buildPitchWeekCalendarResponse", () => {
  it("places a match on the correct day cell", () => {
    const weekStartMs = Date.parse("2026-04-13T00:00:00.000Z");
    const weekEndExclusiveMs = weekStartMs + 7 * 86_400_000;
    const venues = [
      {
        venueId: "v1",
        name: "Park",
        status: "active",
        pitches: [{ pitchId: "p1", label: "Main" }],
      },
    ];
    const payload = buildPitchWeekCalendarResponse({
      associationId: "a1",
      associationName: "Assoc",
      weekStartYmd: "2026-04-13",
      weekStartMs,
      weekEndExclusiveMs,
      venueIdFilter: null,
      venues,
      fixtures: [
        {
          fixtureId: "f1",
          seasonCompetitionId: "s1",
          round: 1,
          homeTeamId: "h1",
          awayTeamId: "a1",
          pitchId: "p1",
          venueId: "v1",
          scheduledStart: "2026-04-15T02:00:00.000Z",
          scheduledEnd: "2026-04-15T04:00:00.000Z",
          status: "scheduled",
        },
      ],
      teamNameById: new Map([
        ["h1", "Home FC"],
        ["a1", "Away FC"],
      ]),
      seasonLabelById: new Map([["s1", "Prem"]]),
      entries: [],
      clubNameById: new Map(),
    });
    const key = "2026-04-15::v1::p1";
    expect(payload.view).toBe("week");
    expect(payload.cells[key]?.length).toBe(1);
    expect(payload.cells[key]![0].kind).toBe("match");
  });
});

describe("summarizeCellsForMonth", () => {
  it("aggregates counts", () => {
    const cells = {
      "2026-04-01::v::p": [
        {
          kind: "match" as const,
          fixtureId: "1",
          seasonCompetitionId: "s",
          round: 1,
          scheduledStart: "2026-04-01T10:00:00.000Z",
          scheduledEnd: null,
          summary: "A vs B",
          homeTeamName: "A",
          awayTeamName: "B",
          competitionLabel: null,
        },
        {
          kind: "private" as const,
          entryId: "e",
          scheduledStart: "2026-04-01T12:00:00.000Z",
          scheduledEnd: null,
          summary: "Private" as const,
        },
      ],
    };
    const s = summarizeCellsForMonth(cells, 5);
    expect(s["2026-04-01::v::p"].matchCount).toBe(1);
    expect(s["2026-04-01::v::p"].privateCount).toBe(1);
    expect(s["2026-04-01::v::p"].total).toBe(2);
  });
});

describe("buildPitchMonthCalendarResponse", () => {
  it("returns month view with summaries", () => {
    const b = utcParseMonthYm("2026-04")!;
    const venues = [
      {
        venueId: "v1",
        name: "Park",
        status: "active",
        pitches: [{ pitchId: "p1", label: "Main" }],
      },
    ];
    const payload = buildPitchMonthCalendarResponse({
      associationId: "a1",
      associationName: "Assoc",
      monthYm: "2026-04",
      monthStartMs: b.startMs,
      monthEndExclusiveMs: b.endExclusiveMs,
      venueIdFilter: null,
      venues,
      fixtures: [],
      teamNameById: new Map(),
      seasonLabelById: new Map(),
      entries: [],
      clubNameById: new Map(),
    });
    expect(payload.view).toBe("month");
    expect(payload.days).toHaveLength(30);
    expect(payload.summaries).toBeDefined();
  });
});

describe("buildPitchColumnsFromVenues", () => {
  it("flattens pitches", () => {
    const cols = buildPitchColumnsFromVenues(
      [
        {
          venueId: "v1",
          name: "Alpha",
          status: "active",
          pitches: [
            { pitchId: "p1", label: "North" },
            { pitchId: "p2", label: "South" },
          ],
        },
      ],
      null,
    );
    expect(cols).toHaveLength(2);
    expect(cols[0].columnKey).toBe("v1::p1");
  });
});
