// F2 — Conflict-of-interest (club + immediate family on roster) and register availability.

import type { Db } from "mongodb";

const REGISTER_COL = "association_official_register";

export type CoiIssueCode =
  | "own_club"
  | "family_on_roster"
  | "official_unavailable"
  | "limited_availability"
  | "no_register_match"
  | "family_check_skipped";

export type CoiIssueSeverity = "block" | "warn";

export interface CoiIssue {
  code: CoiIssueCode;
  severity: CoiIssueSeverity;
  message: string;
}

/** Word-boundary match for immediate-family labels on relationship strings. */
const IMMEDIATE_FAMILY_RE =
  /\b(spouse|partner|husband|wife|married|parent|mother|father|mum|dad|mom|child|son|daughter|sibling|brother|sister|stepson|stepdaughter|stepchild|stepmother|stepfather|step[-\s]?(mother|father|son|daughter|child|brother|sister))\b/i;

export function isImmediateFamilyRelationship(rel: {
  relationshipType?: string;
  forwardRelation?: string;
  reverseRelation?: string;
}): boolean {
  const blob = [rel.relationshipType, rel.forwardRelation, rel.reverseRelation]
    .filter(Boolean)
    .join(" ");
  return IMMEDIATE_FAMILY_RE.test(blob);
}

export function memberPrimaryClubIdFromDoc(member: unknown): string | null {
  if (!member || typeof member !== "object") return null;
  const o = member as Record<string, unknown>;
  const top = o.clubId;
  if (typeof top === "string" && top.trim()) return top.trim();
  const mem = o.membership as Record<string, unknown> | undefined;
  const nested = mem?.clubId;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  return null;
}

export function immediateFamilyRelatedMemberIds(member: unknown): Set<string> {
  const ids = new Set<string>();
  if (!member || typeof member !== "object") return ids;
  const rels = (member as { familyRelationships?: unknown }).familyRelationships;
  if (!Array.isArray(rels)) return ids;
  for (const r of rels) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (
      !isImmediateFamilyRelationship({
        relationshipType: String(o.relationshipType ?? ""),
        forwardRelation: String(o.forwardRelation ?? ""),
        reverseRelation: String(o.reverseRelation ?? ""),
      })
    ) {
      continue;
    }
    const id = o.relatedMemberId;
    if (typeof id === "string" && id.trim()) ids.add(id.trim());
  }
  return ids;
}

export function activeRosterMemberIds(team: { roster?: unknown }): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(team.roster)) return out;
  for (const r of team.roster) {
    if (!r || typeof r !== "object") continue;
    const row = r as { memberId?: unknown; status?: unknown };
    const status = typeof row.status === "string" ? row.status : "";
    if (status && status !== "active") continue;
    const mid = row.memberId;
    if (typeof mid === "string" && mid.trim()) {
      out.add(mid.trim());
    }
  }
  return out;
}

export function registerIndicatesUnavailable(
  register: {
    allocationAvailability?: string;
    unavailableUntil?: string | null;
  },
  now: Date = new Date(),
): boolean {
  if (register.allocationAvailability === "unavailable") return true;
  const until = register.unavailableUntil;
  if (!until || typeof until !== "string") return false;
  const t = Date.parse(until);
  if (Number.isNaN(t)) return false;
  return t > now.getTime();
}

export function resolvePrimaryClubId(
  register: Record<string, unknown> | null | undefined,
  memberDoc: unknown,
): string | null {
  const fromReg = register?.primaryClubId;
  if (typeof fromReg === "string" && fromReg.trim()) return fromReg.trim();
  return memberPrimaryClubIdFromDoc(memberDoc);
}

async function findActiveRegister(
  db: Db,
  associationId: string,
  umpireId: string,
): Promise<Record<string, unknown> | null> {
  const row = await db.collection(REGISTER_COL).findOne({
    associationId,
    isActive: { $ne: false },
    $or: [{ memberId: umpireId }, { umpireNumber: umpireId }],
  });
  return row as Record<string, unknown> | null;
}

export type ProposedUmpireSlot = {
  umpireType: string;
  umpireId: string;
  coiOverride?: boolean;
  coiOverrideReason?: string;
};

export type SlotEvaluation = {
  index: number;
  umpireId: string;
  blockingIssues: CoiIssue[];
  warnings: CoiIssue[];
};

export async function evaluateFixtureUmpireAssignments(
  db: Db,
  input: {
    associationId: string;
    homeTeamId: string;
    awayTeamId: string;
    proposedUmpires: ProposedUmpireSlot[];
    now?: Date;
  },
): Promise<{ slots: SlotEvaluation[] }> {
  const now = input.now ?? new Date();
  const { associationId, homeTeamId, awayTeamId, proposedUmpires } = input;

  const [homeTeam, awayTeam] = await Promise.all([
    db.collection("teams").findOne({ teamId: homeTeamId }),
    db.collection("teams").findOne({ teamId: awayTeamId }),
  ]);

  const homeDoc = homeTeam as unknown as { clubId?: string; roster?: unknown[] } | null;
  const awayDoc = awayTeam as unknown as { clubId?: string; roster?: unknown[] } | null;

  const homeClub =
    homeDoc && typeof homeDoc.clubId === "string" ? homeDoc.clubId.trim() : "";
  const awayClub =
    awayDoc && typeof awayDoc.clubId === "string" ? awayDoc.clubId.trim() : "";

  const rosterUnion = new Set<string>();
  if (homeDoc) {
    for (const id of activeRosterMemberIds(homeDoc)) {
      rosterUnion.add(id);
    }
  }
  if (awayDoc) {
    for (const id of activeRosterMemberIds(awayDoc)) {
      rosterUnion.add(id);
    }
  }

  const slots: SlotEvaluation[] = [];

  for (let index = 0; index < proposedUmpires.length; index++) {
    const slot = proposedUmpires[index];
    const umpireId = slot.umpireId?.trim() ?? "";
    const blockingIssues: CoiIssue[] = [];
    const warnings: CoiIssue[] = [];

    if (!umpireId) {
      slots.push({ index, umpireId: slot.umpireId, blockingIssues, warnings });
      continue;
    }

    const register = await findActiveRegister(db, associationId, umpireId);

    if (!register) {
      warnings.push({
        code: "no_register_match",
        severity: "warn",
        message:
          "No active official register row matches this umpireId; automated club/family checks were skipped.",
      });
      slots.push({ index, umpireId, blockingIssues, warnings });
      continue;
    }

    const regMemberId =
      typeof register.memberId === "string" && register.memberId.trim()
        ? register.memberId.trim()
        : null;

    let memberDoc: unknown = null;
    if (regMemberId) {
      memberDoc = await db.collection("members").findOne({ memberId: regMemberId });
    }

    if (!regMemberId) {
      warnings.push({
        code: "family_check_skipped",
        severity: "warn",
        message:
          "Official register has no memberId; family conflict checks were skipped (link member or rely on roster + relationship data elsewhere).",
      });
    } else if (!memberDoc) {
      warnings.push({
        code: "family_check_skipped",
        severity: "warn",
        message: `Member ${regMemberId} not found; family conflict checks were skipped.`,
      });
    }

    const primaryClub = resolvePrimaryClubId(register, memberDoc);
    if (primaryClub && (primaryClub === homeClub || primaryClub === awayClub)) {
      blockingIssues.push({
        code: "own_club",
        severity: "block",
        message:
          "Umpire’s primary club matches the home or away team club; assign a different official or record an override with reason.",
      });
    }

    if (memberDoc) {
      const familyIds = immediateFamilyRelatedMemberIds(memberDoc);
      for (const fid of familyIds) {
        if (rosterUnion.has(fid)) {
          blockingIssues.push({
            code: "family_on_roster",
            severity: "block",
            message:
              "An immediate family member (per member family relationships) appears on a team roster for this fixture.",
          });
          break;
        }
      }
    }

    if (registerIndicatesUnavailable(register as { allocationAvailability?: string; unavailableUntil?: string | null }, now)) {
      blockingIssues.push({
        code: "official_unavailable",
        severity: "block",
        message:
          "Official is marked unavailable (or unavailable-until date is still in the future).",
      });
    } else if (register.allocationAvailability === "limited") {
      warnings.push({
        code: "limited_availability",
        severity: "warn",
        message: "Official is marked as having limited availability.",
      });
    }

    slots.push({ index, umpireId, blockingIssues, warnings });
  }

  return { slots };
}

export function slotHasValidCoiOverride(slot: ProposedUmpireSlot): boolean {
  if (!slot.coiOverride) return false;
  const reason = String(slot.coiOverrideReason ?? "").trim();
  return reason.length >= 15;
}
