/**
 * Epic V2 — Published league fixtures on the same pitch must not overlap in time
 * (plus configurable trailing buffer between bookings).
 */

import type { Db } from "mongodb";

/** Minutes after each fixture’s end before another may start on the same pitch. */
export function pitchScheduleBufferMs(): number {
  const raw = process.env.VENUE_PITCH_SCHEDULE_BUFFER_MINUTES;
  const n = parseInt(raw ?? "15", 10);
  if (!Number.isFinite(n) || n < 0 || n > 240) return 15 * 60_000;
  return n * 60_000;
}

/** Default slot length when `scheduledEnd` is missing (hours). */
export function defaultFixtureSlotMs(): number {
  const raw = process.env.VENUE_PITCH_DEFAULT_SLOT_HOURS;
  const h = parseInt(raw ?? "2", 10);
  const hh = Number.isFinite(h) && h >= 1 && h <= 12 ? h : 2;
  return hh * 3600_000;
}

export function fixtureEffectiveWindow(
  scheduledStart: string | null | undefined,
  scheduledEnd: string | null | undefined,
  bufferMs: number,
): { start: number; end: number } | null {
  if (!scheduledStart) return null;
  const s = Date.parse(scheduledStart);
  if (Number.isNaN(s)) return null;
  let endMs = scheduledEnd ? Date.parse(scheduledEnd) : NaN;
  if (!scheduledEnd || Number.isNaN(endMs) || endMs <= s) {
    endMs = s + defaultFixtureSlotMs();
  }
  return { start: s, end: endMs + bufferMs };
}

export function windowsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

export type ResolvedPitchVenue = {
  venueId: string;
  venueName: string;
  addressLine: string;
};

/** Active association venue row that owns this pitchId. */
export async function resolvePitchVenueForAssociation(
  db: Db,
  associationId: string,
  pitchId: string,
): Promise<ResolvedPitchVenue | null> {
  const venue = await db.collection("association_venues").findOne({
    associationId,
    status: "active",
    pitches: { $elemMatch: { pitchId } },
  });
  if (!venue) return null;
  const addr = venue.address as Record<string, string> | undefined;
  const line =
    addr &&
    typeof addr.street === "string" &&
    typeof addr.suburb === "string" &&
    typeof addr.city === "string"
      ? [addr.street, addr.suburb, addr.city, addr.state, addr.postcode]
          .filter(Boolean)
          .join(", ")
      : "";
  return {
    venueId: String(venue.venueId ?? ""),
    venueName: String(venue.name ?? "Venue"),
    addressLine: line,
  };
}

export type PitchScheduleCheckInput = {
  owningAssociationId: string;
  seasonCompetitionId: string;
  fixtureId: string;
  pitchId: string | null | undefined;
  published: boolean;
  scheduledStart: string | null | undefined;
  scheduledEnd: string | null | undefined;
  status: string | null | undefined;
};

/**
 * When a fixture is published, has a pitch, and has a start time, ensure no other
 * published fixture on the same pitch overlaps (same association).
 */
export async function assertPublishedPitchSchedule(
  db: Db,
  opts: PitchScheduleCheckInput,
): Promise<{ ok: true } | { ok: false; error: string; conflictFixtureId?: string }> {
  const pid = typeof opts.pitchId === "string" ? opts.pitchId.trim() : "";
  if (!pid || !opts.published) return { ok: true };
  if (opts.status === "cancelled") return { ok: true };
  if (!opts.scheduledStart?.trim()) {
    return {
      ok: false,
      error:
        "Published fixtures with a pitch need a scheduled start so the system can check for double-bookings.",
    };
  }

  const buf = pitchScheduleBufferMs();
  const self = fixtureEffectiveWindow(opts.scheduledStart, opts.scheduledEnd, buf);
  if (!self) {
    return { ok: false, error: "Invalid scheduled start for pitch conflict check." };
  }

  const candidates = await db
    .collection("league_fixtures")
    .find({
      owningAssociationId: opts.owningAssociationId,
      pitchId: pid,
      published: true,
      fixtureId: { $ne: opts.fixtureId },
      status: { $nin: ["cancelled"] },
    })
    .project({ fixtureId: 1, scheduledStart: 1, scheduledEnd: 1, status: 1 })
    .toArray();

  for (const c of candidates) {
    if (String(c.status ?? "") === "cancelled") continue;
    const w = fixtureEffectiveWindow(
      c.scheduledStart as string | null,
      c.scheduledEnd as string | null,
      buf,
    );
    if (w && windowsOverlap(self, w)) {
      const fid = String(c.fixtureId ?? "");
      return {
        ok: false,
        error: `This pitch is already used by published fixture ${fid} in the same time window (includes ${Math.round(buf / 60000)} min buffer).`,
        conflictFixtureId: fid,
      };
    }
  }

  return { ok: true };
}
