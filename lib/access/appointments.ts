// lib/access/appointments.ts
// Role appointments: someone with authority invites a member to a matrix role; the role is only created when
// the member accepts ("no one gets a role silently"). Pure rules here; the API routes do the I/O.

import {
  getMatrixRole, codeAtLeast, MATRIX_ROLES,
  type MatrixRole, type OrgType, type ResolvedAccess, type RoleHolding,
} from "@/lib/access/matrix";

export type AppointmentStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface RoleAppointment {
  appointmentId: string;
  roleKey: string;
  orgType: OrgType;
  orgId: string;
  /** Nominee's member id (the "MBR-…" string). */
  memberId: string;
  memberName?: string;
  sentByMemberId?: string;
  sentByName?: string;
  teamIds?: string[];
  ageGroups?: string[];
  repSquadIds?: string[];
  fixtureIds?: string[];
  season?: string;
  message?: string;
  status: AppointmentStatus;
  createdAt: string;
  respondedAt?: string;
  /** Present when the nominee is under 18: a parent/guardian must approve before the nominee can accept. */
  guardianApproval?: {
    status: "pending" | "approved" | "refused";
    guardianIds: string[];
    decidedBy?: string;
    decidedByName?: string;
    decidedAt?: string;
  };
}

/** Roles that come from registration / membership rather than an appointment. */
export const NOT_APPOINTABLE_CATEGORIES = new Set(["Membership Types"]);

/** For each category, the area whose Admin (A) holder may appoint into it without Users & Roles access. */
const DELEGATE_AREA: Record<OrgType, Record<string, string>> = {
  club: {
    "Coaching & Teams": "teamsSquads",
    "Game Day": "volunteersRosters",
    "Canteen & Social": "canteenBar",
    "Community & Inclusion": "volunteersRosters",
    "Facilities & Equipment": "facilitiesEquipment",
    "Sponsorship & Comms": "commsMedia",
    "Health & Safety": "childSafetyIncidents",
  },
  association: {
    "Officiating": "officialsAppointments",
    "Coaching & Pathways": "pathwaysRepTeams",
    "Medical & Wellbeing": "medicalInjury",
    "Safety, Integrity & Compliance": "integrityChildSafety",
    "Venues & Events": "venuesEvents",
    "Commercial & Comms": "commsMedia",
  },
};

export interface Appointer {
  access: ResolvedAccess;
  isSuperAdmin?: boolean;
}

export type AppointVerdict = { ok: true } | { ok: false; reason: string };

/**
 * May this person invite someone to `role` in the organisation they are working in?
 *  • the role must belong to that organisation type and be an appointable role;
 *  • they need Users & Roles at Edit or above, or Admin in the area that role's category belongs to;
 *  • they can never appoint above their own level (L0–L6).
 */
export function canAppoint(by: Appointer, role: MatrixRole): AppointVerdict {
  const ctx = by.access.context;
  if (ctx.kind !== "org") return { ok: false, reason: "Choose a club or association first" };
  if (ctx.orgType !== role.orgType) return { ok: false, reason: "That role belongs to a different kind of organisation" };
  if (NOT_APPOINTABLE_CATEGORIES.has(role.category)) return { ok: false, reason: "That is a membership type, not an appointed role" };
  if (by.isSuperAdmin) return { ok: true };
  if (role.level > by.access.level) return { ok: false, reason: "You can't appoint someone above your own level" };
  if (codeAtLeast(by.access.areas.usersRoles, "E")) return { ok: true };
  const delegate = DELEGATE_AREA[role.orgType][role.category];
  if (delegate && by.access.areas[delegate] === "A") return { ok: true };
  return { ok: false, reason: "You don't have permission to appoint this role" };
}

export function appointableRoles(by: Appointer): MatrixRole[] {
  return MATRIX_ROLES.filter((r) => canAppoint(by, r).ok);
}

/** The scope fields a role needs before it can be offered. */
export function missingScope(role: MatrixRole, a: Pick<RoleAppointment, "teamIds" | "ageGroups" | "repSquadIds" | "fixtureIds">): string | null {
  switch (role.scope) {
    case "team": return a.teamIds?.length ? null : "Choose the team(s) this role covers";
    case "ageGroup": return a.ageGroups?.length ? null : "Choose the age group(s) or program this role covers";
    case "repSquad": return a.repSquadIds?.length ? null : "Choose the rep squad(s) this role covers";
    case "assignedMatches": return a.fixtureIds?.length ? null : "Choose the match(es) this appointment covers";
    default: return null;
  }
}

/** The holding created when the nominee accepts. */
export function holdingFromAppointment(a: RoleAppointment): RoleHolding & { appointmentId: string; acceptedAt: string } {
  return {
    roleKey: a.roleKey,
    orgType: a.orgType,
    orgId: a.orgId,
    ...(a.teamIds?.length ? { teamIds: a.teamIds } : {}),
    ...(a.ageGroups?.length ? { ageGroups: a.ageGroups } : {}),
    ...(a.repSquadIds?.length ? { repSquadIds: a.repSquadIds } : {}),
    ...(a.fixtureIds?.length ? { fixtureIds: a.fixtureIds } : {}),
    season: a.season,
    status: "active",
    appointmentId: a.appointmentId,
    acceptedAt: new Date().toISOString(),
  };
}

export const hasHolding = (holdings: RoleHolding[], roleKey: string, orgId: string) =>
  holdings.some((h) => h.roleKey === roleKey && h.orgId === orgId && (!h.status || h.status === "active"));

export function cleanIds(v: unknown, max = 30): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = [...new Set(v.map((x) => String(x ?? "").trim().slice(0, 80)).filter(Boolean))].slice(0, max);
  return out.length ? out : undefined;
}

export { getMatrixRole };
