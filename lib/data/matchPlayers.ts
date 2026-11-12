// lib/data/matchPlayers.ts
// Player cards for the public match centre timeline: name, match-day shirt
// number, photo (only with consent) and a link to the public player page.

import type { Db } from "mongodb";
import { FIXTURE_LINEUPS_COLLECTION } from "@/lib/db/schemas/fixtureLineup.schema";

export interface PublicMatchPlayer {
  memberId: string;
  name: string;
  teamId: string | null;
  shirtNumber: number | null;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  /** From the fixture lineup: in the starting XI. */
  started: boolean;
  /** Minute the player first came on (substitutes). */
  minuteEntered: number | null;
  /** Named in the squad but never entered the game. */
  didNotPlay: boolean;
  /** Only set when the member has given photo consent. */
  photoUrl: string | null;
  href: string;
}

export const publicPlayerHref = (memberId: string) => `/competitions/players/${encodeURIComponent(memberId)}`;

type Doc = Record<string, any>;

/** Photos are public only with recorded consent (registration or admin consent form). */
export function memberPhotoIfConsented(member: Doc | null | undefined): string | null {
  if (!member) return null;
  const url = member.personalInfo?.photoUrl;
  const consent = member.consents?.photoConsent === true || member.preferences?.photoConsent === true;
  return consent && typeof url === "string" && url.trim() ? url.trim() : null;
}

export function memberPublicName(member: Doc | null | undefined, fallback: string): string {
  const pi = member?.personalInfo ?? {};
  const display = typeof pi.displayName === "string" ? pi.displayName.trim() : "";
  const full = [pi.firstName, pi.lastName].filter((x) => typeof x === "string" && x.trim()).join(" ").trim();
  return display || full || fallback;
}

/**
 * Builds a player map for one fixture: everyone in the fixture's lineups plus any
 * member referenced by an event. Shirt numbers come from `fixture_lineups`, then
 * the team roster's jersey number as a fallback.
 */
export async function loadMatchPlayers(
  db: Db,
  fixtureId: string,
  teamIds: string[],
  eventMemberIds: string[],
): Promise<Record<string, PublicMatchPlayer>> {
  const lineups = await db
    .collection(FIXTURE_LINEUPS_COLLECTION)
    .find({ fixtureId }, { projection: { teamId: 1, players: 1 } })
    .toArray();

  const fromLineup = new Map<
    string,
    { teamId: string; shirt: number | null; gk: boolean; captain: boolean; started: boolean; minuteEntered: number | null; didNotPlay: boolean }
  >();
  for (const lu of lineups) {
    for (const p of (lu.players as Doc[]) ?? []) {
      if (!p?.memberId) continue;
      fromLineup.set(String(p.memberId), {
        teamId: String(lu.teamId),
        shirt: typeof p.shirtNumber === "number" ? p.shirtNumber : null,
        gk: p.isGoalkeeper === true,
        captain: p.isCaptain === true,
        started: p.started === true,
        minuteEntered: typeof p.minuteEntered === "number" ? p.minuteEntered : null,
        didNotPlay: p.didNotPlay === true,
      });
    }
  }

  const memberIds = [...new Set([...fromLineup.keys(), ...eventMemberIds.filter(Boolean)])];
  if (memberIds.length === 0) return {};

  // Roster fallback for shirt numbers when no lineup was recorded
  const rosterShirt = new Map<string, { teamId: string; shirt: number | null }>();
  if (teamIds.length) {
    const teams = await db
      .collection("teams")
      .find({ teamId: { $in: teamIds } }, { projection: { teamId: 1, roster: 1 } })
      .toArray();
    for (const t of teams) {
      for (const r of (t.roster as Doc[]) ?? []) {
        if (r?.memberId && !rosterShirt.has(String(r.memberId))) {
          rosterShirt.set(String(r.memberId), {
            teamId: String(t.teamId),
            shirt: typeof r.jerseyNumber === "number" ? r.jerseyNumber : null,
          });
        }
      }
    }
  }

  const members = await db
    .collection("members")
    .find(
      { memberId: { $in: memberIds } },
      { projection: { memberId: 1, personalInfo: 1, consents: 1, "preferences.photoConsent": 1 } },
    )
    .toArray();
  const memberById = new Map(members.map((m) => [String(m.memberId), m]));

  const out: Record<string, PublicMatchPlayer> = {};
  for (const id of memberIds) {
    const lu = fromLineup.get(id);
    const ro = rosterShirt.get(id);
    const m = memberById.get(id);
    out[id] = {
      memberId: id,
      name: memberPublicName(m, "Unknown player"),
      teamId: lu?.teamId ?? ro?.teamId ?? null,
      shirtNumber: lu?.shirt ?? ro?.shirt ?? null,
      isGoalkeeper: lu?.gk ?? false,
      isCaptain: lu?.captain ?? false,
      started: lu?.started ?? false,
      minuteEntered: lu?.minuteEntered ?? null,
      didNotPlay: lu?.didNotPlay ?? false,
      photoUrl: memberPhotoIfConsented(m),
      href: publicPlayerHref(id),
    };
  }
  return out;
}

export interface PublicMatchStaff {
  name: string;
  role: string;
}

/** Coaches / managers recorded on the fixture's lineups, by team. */
export async function loadMatchStaff(db: Db, fixtureId: string): Promise<Record<string, PublicMatchStaff[]>> {
  const lineups = await db
    .collection(FIXTURE_LINEUPS_COLLECTION)
    .find({ fixtureId }, { projection: { teamId: 1, staff: 1 } })
    .toArray();
  const ids = [...new Set(lineups.flatMap((l) => ((l.staff as Doc[]) ?? []).map((s) => String(s.memberId))))];
  if (ids.length === 0) return {};
  const members = await db
    .collection("members")
    .find({ memberId: { $in: ids } }, { projection: { memberId: 1, personalInfo: 1 } })
    .toArray();
  const byId = new Map(members.map((m) => [String(m.memberId), m]));
  const out: Record<string, PublicMatchStaff[]> = {};
  for (const l of lineups) {
    const staff = ((l.staff as Doc[]) ?? []).map((s) => ({
      name: memberPublicName(byId.get(String(s.memberId)), "—"),
      role: String(s.role ?? "Staff"),
    }));
    if (staff.length) out[String(l.teamId)] = staff;
  }
  return out;
}
