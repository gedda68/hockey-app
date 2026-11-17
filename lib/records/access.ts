// lib/records/access.ts
// Who can see and change training sessions, injuries and incident reports.
//
// These hold sensitive information about children and health, so they follow the Roles & Access Matrix where the
// person has matrix roles, and a deliberately narrow fallback for everyone else (the matrix is not enforced for
// people without matrix roles, so "not enforced" must not mean "can see everything" here).
//
//   none  – can't open it            own   – only records about / by themselves (or their children)
//   read  – everything in the club   edit  – add and update
//   admin – also delete, export and close

import type { AccessCode } from "@/lib/access/matrix";
import { decideArea, type AccessLike } from "@/lib/access/areaAccess";

export type RecordArea = "training" | "injuries" | "incidents";
export type RecordLevel = "none" | "own" | "read" | "edit" | "admin";

const RANK: Record<RecordLevel, number> = { none: 0, own: 1, read: 2, edit: 3, admin: 4 };
export const atLeast = (have: RecordLevel, need: RecordLevel) => RANK[have] >= RANK[need];

export function levelFromCode(code: AccessCode): RecordLevel {
  return code === "A" ? "admin" : code === "E" ? "edit" : code === "R" ? "read" : code === "O" ? "own" : "none";
}

/** For people the matrix doesn't apply to: by their login role. Anything not listed gets the "everyone" level. */
const LEGACY: Record<RecordArea, { everyone: RecordLevel; byRole: Record<string, RecordLevel> }> = {
  training: {
    everyone: "own",
    byRole: {
      "super-admin": "admin", "association-admin": "admin", "club-admin": "admin",
      "club-committee": "read", coach: "edit", manager: "edit", "team-selector": "read",
      "assoc-coach": "read", "assoc-committee": "read",
    },
  },
  injuries: {
    everyone: "own",
    byRole: {
      "super-admin": "admin", "association-admin": "admin", "club-admin": "admin",
      coach: "edit", manager: "edit",
    },
  },
  incidents: {
    // Anyone can report one; only the people who run the club see the rest.
    everyone: "own",
    byRole: { "super-admin": "admin", "association-admin": "admin", "club-admin": "admin", "club-committee": "edit" },
  },
};

export function legacyLevel(area: RecordArea, role: string | undefined): RecordLevel {
  const l = LEGACY[area];
  return (role && l.byRole[role]) || l.everyone;
}

/** The person's level in this area: from the matrix when it applies to them, otherwise from their login role. */
export function recordLevel(access: AccessLike | null | undefined, role: string | undefined, area: RecordArea): { level: RecordLevel; enforced: boolean } {
  const d = decideArea(access, role, area, "V");
  if (d.enforced) return { level: levelFromCode(d.code), enforced: true };
  return { level: legacyLevel(area, role), enforced: false };
}
