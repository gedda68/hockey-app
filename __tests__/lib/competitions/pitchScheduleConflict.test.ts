import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Db } from "mongodb";
import {
  assertPublishedPitchSchedule,
  fixtureEffectiveWindow,
  windowsOverlap,
} from "@/lib/competitions/pitchScheduleConflict";

describe("fixtureEffectiveWindow", () => {
  it("extends end by buffer only", () => {
    const buf = 15 * 60_000;
    const w = fixtureEffectiveWindow("2026-04-01T10:00:00.000Z", "2026-04-01T11:00:00.000Z", buf);
    expect(w).not.toBeNull();
    expect(w!.start).toBe(Date.parse("2026-04-01T10:00:00.000Z"));
    expect(w!.end).toBe(Date.parse("2026-04-01T11:00:00.000Z") + buf);
  });

  it("uses default slot when end missing", () => {
    const buf = 0;
    const w = fixtureEffectiveWindow("2026-04-01T10:00:00.000Z", null, buf);
    expect(w).not.toBeNull();
    expect(w!.end).toBeGreaterThan(w!.start);
  });
});

describe("windowsOverlap", () => {
  it("detects overlap", () => {
    expect(
      windowsOverlap(
        { start: 0, end: 10 },
        { start: 5, end: 15 },
      ),
    ).toBe(true);
  });

  it("no overlap when touching at boundary", () => {
    expect(
      windowsOverlap(
        { start: 0, end: 10 },
        { start: 10, end: 20 },
      ),
    ).toBe(false);
  });
});

describe("assertPublishedPitchSchedule", () => {
  beforeEach(() => {
    vi.stubEnv("VENUE_PITCH_SCHEDULE_BUFFER_MINUTES", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows when no pitch", async () => {
    const db = {} as Db;
    const r = await assertPublishedPitchSchedule(db, {
      owningAssociationId: "a1",
      seasonCompetitionId: "s1",
      fixtureId: "f-new",
      pitchId: null,
      published: true,
      scheduledStart: "2026-04-01T10:00:00.000Z",
      scheduledEnd: null,
      status: "scheduled",
    });
    expect(r).toEqual({ ok: true });
  });

  it("flags overlap on same pitch", async () => {
    const other = {
      fixtureId: "f-other",
      scheduledStart: "2026-04-01T10:00:00.000Z",
      scheduledEnd: "2026-04-01T11:00:00.000Z",
      status: "scheduled",
    };
    const db = {
      collection: () => ({
        find: () => ({
          project: () => ({
            toArray: async () => [other],
          }),
        }),
      }),
    } as unknown as Db;

    const r = await assertPublishedPitchSchedule(db, {
      owningAssociationId: "a1",
      seasonCompetitionId: "s1",
      fixtureId: "f-new",
      pitchId: "pitch-1",
      published: true,
      scheduledStart: "2026-04-01T10:30:00.000Z",
      scheduledEnd: "2026-04-01T11:30:00.000Z",
      status: "scheduled",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.conflictFixtureId).toBe("f-other");
    }
  });

  it("ignores cancelled opponents", async () => {
    const other = {
      fixtureId: "f-other",
      scheduledStart: "2026-04-01T10:00:00.000Z",
      scheduledEnd: "2026-04-01T11:00:00.000Z",
      status: "cancelled",
    };
    const db = {
      collection: () => ({
        find: () => ({
          project: () => ({
            toArray: async () => [other],
          }),
        }),
      }),
    } as unknown as Db;

    const r = await assertPublishedPitchSchedule(db, {
      owningAssociationId: "a1",
      seasonCompetitionId: "s1",
      fixtureId: "f-new",
      pitchId: "pitch-1",
      published: true,
      scheduledStart: "2026-04-01T10:30:00.000Z",
      scheduledEnd: "2026-04-01T11:30:00.000Z",
      status: "scheduled",
    });
    expect(r).toEqual({ ok: true });
  });
});
