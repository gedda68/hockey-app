import { describe, expect, it } from "vitest";
import {
  buildLeagueIcsCalendar,
  toIcalUtcDateTime,
} from "@/lib/calendar/leagueIcal";

describe("leagueIcal", () => {
  it("formats UTC date-time for iCal", () => {
    expect(toIcalUtcDateTime("2026-06-15T02:30:00.000Z")).toBe("20260615T023000Z");
  });

  it("builds a minimal VCALENDAR with one event", () => {
    const ics = buildLeagueIcsCalendar({
      calendarName: "Test Comp",
      domain: "example.test",
      events: [
        {
          uid: "fx-1",
          start: "2026-06-15T02:30:00.000Z",
          summary: "R1: A vs B",
          location: "Field 1",
        },
      ],
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("R1: A vs B");
    expect(ics).toContain("UID:fx-1@example.test");
  });
});
