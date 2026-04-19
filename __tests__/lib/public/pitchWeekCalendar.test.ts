import { describe, expect, it } from "vitest";
import {
  buildPitchColumnsFromVenues,
  buildPitchWeekCalendarResponse,
  intervalOverlapMs,
  utcParseDayStartIso,
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
    expect(payload.cells[key]?.length).toBe(1);
    expect(payload.cells[key]![0].kind).toBe("match");
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
