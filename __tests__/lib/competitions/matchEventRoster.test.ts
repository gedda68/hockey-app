import { describe, expect, it } from "vitest";
import { validateMatchEventsAgainstRosters } from "@/lib/competitions/matchEventRoster";
import type { FixtureMatchEvent } from "@/lib/db/schemas/leagueFixture.schema";

describe("validateMatchEventsAgainstRosters", () => {
  const home = "team-h";
  const away = "team-a";

  it("accepts members on the correct roster", () => {
    const roster = new Map<string, Set<string> | null>([
      [home, new Set(["M1", "M2"])],
      [away, new Set(["M3"])],
    ]);
    const events: FixtureMatchEvent[] = [
      {
        eventId: "e1",
        kind: "goal",
        teamId: home,
        memberId: "M1",
        assistMemberId: "M2",
      },
    ];
    expect(validateMatchEventsAgainstRosters(events, home, away, roster)).toEqual({
      ok: true,
    });
  });

  it("rejects scorer not on roster", () => {
    const roster = new Map<string, Set<string> | null>([
      [home, new Set(["M1"])],
      [away, new Set(["M3"])],
    ]);
    const events: FixtureMatchEvent[] = [
      { eventId: "e1", kind: "goal", teamId: home, memberId: "X" },
    ];
    const r = validateMatchEventsAgainstRosters(events, home, away, roster);
    expect(r.ok).toBe(false);
  });

  it("rejects assist not on roster", () => {
    const roster = new Map<string, Set<string> | null>([
      [home, new Set(["M1", "M2"])],
      [away, null],
    ]);
    const events: FixtureMatchEvent[] = [
      {
        eventId: "e1",
        kind: "goal",
        teamId: home,
        memberId: "M1",
        assistMemberId: "BAD",
      },
    ];
    const r = validateMatchEventsAgainstRosters(events, home, away, roster);
    expect(r.ok).toBe(false);
  });
});
