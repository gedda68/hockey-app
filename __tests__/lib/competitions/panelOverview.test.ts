import { describe, expect, it } from "vitest";
import { summariseFixtures } from "@/lib/competitions/panelOverview";

const now = new Date("2026-06-10T00:00:00Z");
describe("summariseFixtures", () => {
  it("counts teams, statuses and problems", () => {
    const s = summariseFixtures([
      { homeTeamId: "a", awayTeamId: "b", status: "completed", resultStatus: "submitted" },
      { homeTeamId: "a", awayTeamId: "c", status: "scheduled", scheduledStart: "2026-06-01T00:00:00Z" },
      { homeTeamId: "b", awayTeamId: "c", status: "scheduled", scheduledStart: "2026-06-20T00:00:00Z" },
      { homeTeamId: "b", awayTeamId: "a", status: "scheduled", scheduledStart: null },
      { homeTeamId: "c", awayTeamId: "a", status: "postponed" },
      { homeTeamId: "c", awayTeamId: "b", status: "cancelled" },
      { homeTeamId: "a", awayTeamId: "b", status: "in_progress" },
    ], now);
    expect(s).toMatchObject({
      teams: 3, fixtures: 7, completed: 1, inProgress: 1, remaining: 4,
      postponed: 1, cancelled: 1, awaitingApproval: 1, unscheduled: 1, overdue: 1,
      nextStart: "2026-06-20T00:00:00.000Z",
    });
  });
  it("handles no fixtures", () => {
    expect(summariseFixtures([], now)).toMatchObject({ teams: 0, fixtures: 0, nextStart: null });
  });
});
