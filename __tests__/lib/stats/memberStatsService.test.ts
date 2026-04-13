import { describe, it, expect } from "vitest";
import { summarizePlayingHistory } from "@/lib/stats/memberStatsService";
import type { MemberPlayingHistoryRow } from "@/types/memberStats";

describe("summarizePlayingHistory", () => {
  it("aggregates by season and event type", () => {
    const rows: MemberPlayingHistoryRow[] = [
      {
        historyId: "1",
        memberId: "m1",
        seasonYear: "2025",
        eventType: "fixture",
        date: "2025-06-01",
        result: "win",
        goals: 2,
        assists: 1,
        minutesPlayed: 60,
        createdAt: new Date(),
      },
      {
        historyId: "2",
        memberId: "m1",
        seasonYear: "2025",
        eventType: "fixture",
        date: "2025-06-08",
        result: "loss",
        goals: 0,
        minutesPlayed: 45,
        createdAt: new Date(),
      },
      {
        historyId: "3",
        memberId: "m1",
        seasonYear: "2025",
        eventType: "training",
        date: "2025-06-10",
        createdAt: new Date(),
      },
    ];
    const s = summarizePlayingHistory(rows);
    expect(s.totalEvents).toBe(3);
    expect(s.bySeason["2025"]?.games).toBe(2);
    expect(s.bySeason["2025"]?.goals).toBe(2);
    expect(s.bySeason["2025"]?.wins).toBe(1);
    expect(s.bySeason["2025"]?.losses).toBe(1);
    expect(s.byEventType.fixture).toBe(2);
    expect(s.byEventType.training).toBe(1);
  });
});
