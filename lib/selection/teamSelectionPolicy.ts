/**
 * Team / roster selection & movement policy, stored per association or club.
 * Effective rules for a club merge: ancestor associations (root → … → parent) then club overrides.
 *
 * **Runtime API:** `GET /api/admin/teams/effective-selection-policy?clubId=<id|slug>` returns the
 * merged policy for roster moves, eligibility checks, and (later) fixture game-count caps — keep
 * those code paths aligned with this document rather than hard-coding rules.
 */

import type { Db } from "mongodb";

export const SELECTION_POLICIES_COLLECTION = "selection_policies";

export type SelectionPolicyScope = "association" | "club";

/** Stored document in `selection_policies` */
export interface SelectionPolicyRow {
  scope: SelectionPolicyScope;
  associationId?: string;
  clubId?: string;
  policy: TeamSelectionPolicy;
  updatedAt: string;
  updatedByUserId?: string;
}

export interface TeamSelectionPolicy {
  movement: {
    /** Players may only move to same or higher strength division within the band. */
    enforceUpwardOnly: boolean;
    /** Juniors may only step up one age band at a time (no skipping). */
    juniorOnlySingleAgeStepUp: boolean;
    /** Max games in a division two or more bands above registration; null = no numeric cap in app. */
    seniorMaxGamesInDivisionTwoBandsAbove: number | null;
    /** Junior turning 15 in season may be selected for open-age sides (subject to weekly limits). */
    juniorTurning15MayPlayOpen: boolean;
    /** When playing open as a junior: max junior-graded games per week (e.g. 2). */
    juniorOpenWeeklyJuniorSlots: number;
    /** When playing open as a junior: max open/adult-graded games per week (e.g. 2). */
    juniorOpenWeeklyAdultSlots: number;
  };
  visibility: {
    showTeamSelectionOnMemberPortal: boolean;
    emailMemberOnSelection: boolean;
  };
  rosterGovernance: {
    /** Clubs under this body must roster only against published division catalogue (when present). */
    clubsMustUsePublishedDivisionCatalog: boolean;
    /** More teams in a slot than maxTeamsPerClub require governing-body approval. */
    extraTeamsBeyondSlotCapRequireApproval: boolean;
  };
  /** Optional guidance shown only in admin (not for players). */
  adminNotes?: string;
}

export const DEFAULT_TEAM_SELECTION_POLICY: TeamSelectionPolicy = {
  movement: {
    enforceUpwardOnly: true,
    juniorOnlySingleAgeStepUp: true,
    seniorMaxGamesInDivisionTwoBandsAbove: 4,
    juniorTurning15MayPlayOpen: true,
    juniorOpenWeeklyJuniorSlots: 2,
    juniorOpenWeeklyAdultSlots: 2,
  },
  visibility: {
    showTeamSelectionOnMemberPortal: false,
    emailMemberOnSelection: true,
  },
  rosterGovernance: {
    clubsMustUsePublishedDivisionCatalog: true,
    extraTeamsBeyondSlotCapRequireApproval: true,
  },
  adminNotes: "",
};

export function deepMergePolicies(
  base: TeamSelectionPolicy,
  override: Partial<TeamSelectionPolicy>,
): TeamSelectionPolicy {
  return {
    movement: { ...base.movement, ...override.movement },
    visibility: { ...base.visibility, ...override.visibility },
    rosterGovernance: { ...base.rosterGovernance, ...override.rosterGovernance },
    adminNotes:
      override.adminNotes !== undefined ? override.adminNotes : base.adminNotes,
  };
}

/** Walk parent links; returns [root, …, leaf] (national → … → `associationId`). */
export async function ancestorAssociationIdsRootFirst(
  db: Db,
  associationId: string,
): Promise<string[]> {
  const up: string[] = [];
  let cur: string | null = associationId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    up.push(cur);
    const doc = (await db
      .collection("associations")
      .findOne({ associationId: cur })) as
      | { parentAssociationId?: string | null }
      | null;
    cur = doc?.parentAssociationId ?? null;
  }
  return up.reverse();
}

export async function resolveEffectiveTeamSelectionPolicy(
  db: Db,
  clubCanonicalId: string,
): Promise<TeamSelectionPolicy> {
  const club = await db.collection("clubs").findOne({
    $or: [{ id: clubCanonicalId }, { slug: clubCanonicalId }],
  });
  if (!club) return { ...DEFAULT_TEAM_SELECTION_POLICY };

  let merged: TeamSelectionPolicy = {
    movement: { ...DEFAULT_TEAM_SELECTION_POLICY.movement },
    visibility: { ...DEFAULT_TEAM_SELECTION_POLICY.visibility },
    rosterGovernance: { ...DEFAULT_TEAM_SELECTION_POLICY.rosterGovernance },
    adminNotes: DEFAULT_TEAM_SELECTION_POLICY.adminNotes,
  };

  const parentAssoc = club.parentAssociationId as string | undefined;
  if (parentAssoc) {
    const chain = await ancestorAssociationIdsRootFirst(db, parentAssoc);
    for (const aid of chain) {
      const row = await db.collection(SELECTION_POLICIES_COLLECTION).findOne({
        scope: "association",
        associationId: aid,
      });
      const p = row?.policy as TeamSelectionPolicy | undefined;
      if (p) merged = deepMergePolicies(merged, p);
    }
  }

  const cid = club.id as string;
  if (cid) {
    const clubRow = await db.collection(SELECTION_POLICIES_COLLECTION).findOne({
      scope: "club",
      clubId: cid,
    });
    const p = clubRow?.policy as TeamSelectionPolicy | undefined;
    if (p) merged = deepMergePolicies(merged, p);
  }

  return merged;
}

export function normalizePolicyInput(raw: unknown): TeamSelectionPolicy {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TEAM_SELECTION_POLICY };
  const o = raw as Record<string, unknown>;
  const m = (o.movement ?? {}) as Record<string, unknown>;
  const v = (o.visibility ?? {}) as Record<string, unknown>;
  const r = (o.rosterGovernance ?? {}) as Record<string, unknown>;
  const d = DEFAULT_TEAM_SELECTION_POLICY;

  const capRaw = m.seniorMaxGamesInDivisionTwoBandsAbove;
  const cap =
    capRaw === null || capRaw === undefined || capRaw === ""
      ? null
      : Math.max(0, Math.min(99, Number(capRaw)));

  return {
    movement: {
      enforceUpwardOnly: Boolean(m.enforceUpwardOnly ?? d.movement.enforceUpwardOnly),
      juniorOnlySingleAgeStepUp: Boolean(
        m.juniorOnlySingleAgeStepUp ?? d.movement.juniorOnlySingleAgeStepUp,
      ),
      seniorMaxGamesInDivisionTwoBandsAbove:
        cap === null || Number.isNaN(cap as number)
          ? null
          : (cap as number),
      juniorTurning15MayPlayOpen: Boolean(
        m.juniorTurning15MayPlayOpen ?? d.movement.juniorTurning15MayPlayOpen,
      ),
      juniorOpenWeeklyJuniorSlots: Math.max(
        0,
        Math.min(7, Number(m.juniorOpenWeeklyJuniorSlots ?? d.movement.juniorOpenWeeklyJuniorSlots) || 0),
      ),
      juniorOpenWeeklyAdultSlots: Math.max(
        0,
        Math.min(7, Number(m.juniorOpenWeeklyAdultSlots ?? d.movement.juniorOpenWeeklyAdultSlots) || 0),
      ),
    },
    visibility: {
      showTeamSelectionOnMemberPortal: Boolean(
        v.showTeamSelectionOnMemberPortal ?? d.visibility.showTeamSelectionOnMemberPortal,
      ),
      emailMemberOnSelection: Boolean(
        v.emailMemberOnSelection ?? d.visibility.emailMemberOnSelection,
      ),
    },
    rosterGovernance: {
      clubsMustUsePublishedDivisionCatalog: Boolean(
        r.clubsMustUsePublishedDivisionCatalog ??
          d.rosterGovernance.clubsMustUsePublishedDivisionCatalog,
      ),
      extraTeamsBeyondSlotCapRequireApproval: Boolean(
        r.extraTeamsBeyondSlotCapRequireApproval ??
          d.rosterGovernance.extraTeamsBeyondSlotCapRequireApproval,
      ),
    },
    adminNotes:
      typeof o.adminNotes === "string"
        ? o.adminNotes.slice(0, 4000)
        : d.adminNotes,
  };
}
