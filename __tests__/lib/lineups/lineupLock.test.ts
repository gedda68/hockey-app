import { describe, expect, it } from "vitest";
import { lineupEditWindow } from "@/lib/lineups/lineupLock";

const START = "2026-06-06T10:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("lineupEditWindow (club)", () => {
  const w = (now: string, status = "scheduled", start: string | null = START) =>
    lineupEditWindow({ scheduledStart: start, status, now: at(now), actor: "club" });

  it("is open well before the cutoff", () => {
    const r = w("2026-06-05T10:00:00Z");
    expect(r.open).toBe(true);
    expect(r.closesAt).toBe("2026-06-06T09:55:00.000Z");
  });
  it("is open exactly at T-5", () => expect(w("2026-06-06T09:55:00Z").open).toBe(true));
  it("closes one second after T-5", () => {
    const r = w("2026-06-06T09:55:01Z");
    expect(r.open).toBe(false);
    expect(r.reason).toMatch(/5 minutes/);
  });
  it("is locked at and after the start", () => {
    expect(w("2026-06-06T10:00:00Z").open).toBe(false);
    expect(w("2026-06-06T11:00:00Z").open).toBe(false);
  });
  it("is locked once in progress or completed, even if the clock is early", () => {
    expect(w("2026-06-05T00:00:00Z", "in_progress").open).toBe(false);
    expect(w("2026-06-05T00:00:00Z", "completed").open).toBe(false);
  });
  it("is locked when cancelled", () => expect(w("2026-06-05T00:00:00Z", "cancelled").open).toBe(false));
  it("stays open when postponed", () => expect(w("2026-06-06T11:00:00Z", "postponed").open).toBe(true));
  it("is open when no usable start time exists", () => {
    expect(w("2026-06-06T11:00:00Z", "scheduled", null).open).toBe(true);
    expect(w("2026-06-06T11:00:00Z", "scheduled", "garbage").open).toBe(true);
  });
});

describe("lineupEditWindow (association)", () => {
  it("is open without a reason before the cutoff", () => {
    const r = lineupEditWindow({ scheduledStart: START, status: "scheduled", now: at("2026-06-05T00:00:00Z"), actor: "association" });
    expect(r).toMatchObject({ open: true, requiresReason: false });
  });
  it("requires a reason once the club window has closed", () => {
    const r = lineupEditWindow({ scheduledStart: START, status: "completed", now: at("2026-06-06T12:00:00Z"), actor: "association" });
    expect(r).toMatchObject({ open: true, requiresReason: true });
  });
});
