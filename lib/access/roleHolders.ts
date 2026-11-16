// lib/access/roleHolders.ts — managing the roles people already hold: see them, change their scope, end them.
// Pure rules here; the API route does the I/O.

import { getMatrixRole, type MatrixRole, type RoleHolding } from "@/lib/access/matrix";
import { canAppoint, cleanIds, missingScope, type Appointer } from "@/lib/access/appointments";

export type HolderState = "active" | "waiting-blue-card" | "expired" | "ended" | "pending";

export function holderState(h: Pick<RoleHolding, "status" | "expiresAt">, role: Pick<MatrixRole, "blueCardRequired">, opts: { blueCardOk: boolean; now?: Date }): HolderState {
  if (h.status === "ended") return "ended";
  if (h.status === "pending") return "pending";
  if (h.expiresAt && new Date(h.expiresAt) <= (opts.now ?? new Date())) return "expired";
  if (role.blueCardRequired && !opts.blueCardOk) return "waiting-blue-card";
  return "active";
}

export const STATE_LABEL: Record<HolderState, string> = {
  active: "Active",
  "waiting-blue-card": "Waiting for Blue Card",
  expired: "Expired",
  ended: "Ended",
  pending: "Pending",
};

/** May `by` change or end this holding? You can't change your own roles (ask another administrator). */
export function canManageHolding(by: Appointer, role: MatrixRole, opts: { self: boolean }): { ok: true } | { ok: false; reason: string } {
  if (opts.self && !by.isSuperAdmin) return { ok: false, reason: "Ask another administrator to change your own roles" };
  const v = canAppoint(by, role);
  return v.ok ? v : { ok: false, reason: v.reason.replace("appoint", "change") };
}

export interface HoldingPatch {
  teamIds?: unknown; ageGroups?: unknown; repSquadIds?: unknown; fixtureIds?: unknown;
  season?: unknown; expiresAt?: unknown;
}

/**
 * Validate and clean a scope / term change. Returns the fields to $set on the holding (an empty array clears a
 * scope list; "" or null clears the end date). The role keeps needing whatever scope it needs.
 */
export function cleanHoldingPatch(role: MatrixRole, current: RoleHolding, patch: HoldingPatch): { ok: true; set: Record<string, unknown> } | { ok: false; error: string } {
  const set: Record<string, unknown> = {};
  const lists = ["teamIds", "ageGroups", "repSquadIds", "fixtureIds"] as const;
  const merged: Record<string, string[] | undefined> = {};
  for (const k of lists) {
    if (k in patch) { const v = cleanIds((patch as any)[k]); set[k] = v ?? []; merged[k] = v; }
    else merged[k] = (current as any)[k];
  }
  const missing = missingScope(role, merged);
  if (missing) return { ok: false, error: missing };

  if ("season" in patch) {
    const s = String(patch.season ?? "").trim().slice(0, 9);
    if (!s) return { ok: false, error: "Season can't be blank" };
    set.season = s;
  }
  if ("expiresAt" in patch) {
    if (patch.expiresAt === "" || patch.expiresAt === null) set.expiresAt = null;
    else {
      const d = new Date(String(patch.expiresAt));
      if (Number.isNaN(d.getTime())) return { ok: false, error: "That end date isn't valid" };
      set.expiresAt = d.toISOString();
    }
  }
  if (Object.keys(set).length === 0) return { ok: false, error: "Nothing to change" };
  return { ok: true, set };
}

export const roleName = (key: string) => getMatrixRole(key)?.name ?? key;
