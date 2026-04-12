"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, type User } from "@/lib/auth/AuthContext";
import type { TeamSelectionPolicy } from "@/lib/selection/teamSelectionPolicy";

type Props = {
  apiUrl: string;
  title: string;
  subtitle?: string;
  /** e.g. National / State / Metro — informational */
  tierHint?: string;
};

function roleSet(user: User | null): Set<string> {
  const s = new Set<string>();
  if (!user) return s;
  s.add(user.role);
  for (const a of user.scopedRoles ?? []) {
    if (a?.role) s.add(a.role);
  }
  return s;
}

/** Matches server PUT on association selection-policy */
function canEditAssociation(user: User | null): boolean {
  const r = roleSet(user);
  return (
    r.has("super-admin") ||
    r.has("association-admin") ||
    r.has("assoc-competition")
  );
}

/** Matches server PUT on club selection-policy */
function canEditClub(user: User | null): boolean {
  const r = roleSet(user);
  return (
    r.has("super-admin") ||
    r.has("club-admin") ||
    r.has("association-admin")
  );
}

export default function SelectionPolicyForm({
  apiUrl,
  title,
  subtitle,
  tierHint,
}: Props) {
  const { user } = useAuth();
  const isClubApi = apiUrl.includes("/api/admin/clubs/");
  const canSave = isClubApi ? canEditClub(user) : canEditAssociation(user);

  const [policy, setPolicy] = useState<TeamSelectionPolicy | null>(null);
  const [inheritedLabel, setInheritedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(apiUrl, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setPolicy(data.policy);
      setInheritedLabel(
        isClubApi
          ? "Effective for members (merged from national → state → metro → this club): see read-only summary below."
          : "Parent tiers apply first where set; this row overrides for your jurisdiction and downstream.",
      );
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to load");
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, isClubApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateMovement = (patch: Partial<TeamSelectionPolicy["movement"]>) => {
    setPolicy((p) =>
      p
        ? {
            ...p,
            movement: { ...p.movement, ...patch },
          }
        : p,
    );
  };

  const updateVisibility = (patch: Partial<TeamSelectionPolicy["visibility"]>) => {
    setPolicy((p) =>
      p
        ? {
            ...p,
            visibility: { ...p.visibility, ...patch },
          }
        : p,
    );
  };

  const updateRoster = (patch: Partial<TeamSelectionPolicy["rosterGovernance"]>) => {
    setPolicy((p) =>
      p
        ? {
            ...p,
            rosterGovernance: { ...p.rosterGovernance, ...patch },
          }
        : p,
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy || !canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(apiUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Saved.");
      setPolicy(data.policy);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !policy) {
    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#06054e] border-t-transparent" />
        <p className="mt-4 font-bold text-slate-600">Loading policy…</p>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>
    );
  }

  const capValue =
    policy.movement.seniorMaxGamesInDivisionTwoBandsAbove ?? "";

  return (
    <form
      onSubmit={handleSave}
      className="space-y-8 rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm"
    >
      <div>
        <h1 className="text-3xl font-black uppercase text-[#06054e]">{title}</h1>
        {subtitle && <p className="mt-2 font-bold text-slate-600">{subtitle}</p>}
        {tierHint && (
          <p className="mt-1 text-sm text-slate-500">
            Tier: <span className="font-bold text-slate-700">{tierHint}</span>
          </p>
        )}
        {inheritedLabel && (
          <p className="mt-3 text-sm text-slate-600 border-l-4 border-indigo-300 pl-3">
            {inheritedLabel}
          </p>
        )}
      </div>

      {!canSave && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 border border-amber-200">
          You can view this policy. Only users with{" "}
          {isClubApi ? "club or association edit" : "association edit"} rights
          can change it.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Division movement & eligibility
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.movement.enforceUpwardOnly}
              disabled={!canSave}
              onChange={(e) =>
                updateMovement({ enforceUpwardOnly: e.target.checked })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Enforce upward-only moves (no playing down)
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.movement.juniorOnlySingleAgeStepUp}
              disabled={!canSave}
              onChange={(e) =>
                updateMovement({ juniorOnlySingleAgeStepUp: e.target.checked })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Juniors: only one age band up at a time
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.movement.juniorTurning15MayPlayOpen}
              disabled={!canSave}
              onChange={(e) =>
                updateMovement({ juniorTurning15MayPlayOpen: e.target.checked })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Juniors turning 15 in season may play open (with weekly limits)
            </span>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-black uppercase text-slate-400">
              Max games (2+ bands above registration)
            </label>
            <input
              type="number"
              min={0}
              max={99}
              placeholder="e.g. 4 — empty = no cap"
              disabled={!canSave}
              value={capValue === "" ? "" : capValue}
              onChange={(e) => {
                const v = e.target.value;
                updateMovement({
                  seniorMaxGamesInDivisionTwoBandsAbove:
                    v === "" ? null : Math.min(99, Math.max(0, parseInt(v, 10))),
                });
              }}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase text-slate-400">
              Open week: junior-graded slots
            </label>
            <input
              type="number"
              min={0}
              max={7}
              disabled={!canSave}
              value={policy.movement.juniorOpenWeeklyJuniorSlots}
              onChange={(e) =>
                updateMovement({
                  juniorOpenWeeklyJuniorSlots: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase text-slate-400">
              Open week: adult/open slots
            </label>
            <input
              type="number"
              min={0}
              max={7}
              disabled={!canSave}
              value={policy.movement.juniorOpenWeeklyAdultSlots}
              onChange={(e) =>
                updateMovement({
                  juniorOpenWeeklyAdultSlots: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Visibility & notifications
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.visibility.showTeamSelectionOnMemberPortal}
              disabled={!canSave}
              onChange={(e) =>
                updateVisibility({
                  showTeamSelectionOnMemberPortal: e.target.checked,
                })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Show team selection on member portal
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.visibility.emailMemberOnSelection}
              disabled={!canSave}
              onChange={(e) =>
                updateVisibility({ emailMemberOnSelection: e.target.checked })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Email member when selected to a team
            </span>
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Roster governance
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.rosterGovernance.clubsMustUsePublishedDivisionCatalog}
              disabled={!canSave}
              onChange={(e) =>
                updateRoster({
                  clubsMustUsePublishedDivisionCatalog: e.target.checked,
                })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Clubs must use published division catalogue (when published)
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 p-4">
            <input
              type="checkbox"
              checked={policy.rosterGovernance.extraTeamsBeyondSlotCapRequireApproval}
              disabled={!canSave}
              onChange={(e) =>
                updateRoster({
                  extraTeamsBeyondSlotCapRequireApproval: e.target.checked,
                })
              }
              className="h-5 w-5"
            />
            <span className="font-bold text-slate-800">
              Extra teams beyond slot cap need governing-body approval
            </span>
          </label>
        </div>
      </section>

      <div>
        <label className="mb-2 block text-xs font-black uppercase text-slate-400">
          Admin notes (internal)
        </label>
        <textarea
          value={policy.adminNotes ?? ""}
          disabled={!canSave}
          onChange={(e) =>
            setPolicy((p) => (p ? { ...p, adminNotes: e.target.value } : p))
          }
          rows={3}
          className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium"
          placeholder="Optional guidance for selectors and registrars…"
        />
      </div>

      {message && (
        <p
          className={`text-sm font-bold ${
            message === "Saved." ? "text-green-700" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {canSave && (
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#06054e] px-8 py-3 font-black uppercase text-sm text-white shadow-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save policy"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border-2 border-slate-200 bg-white px-6 py-3 font-black uppercase text-sm text-slate-600"
        >
          Reload
        </button>
      </div>
    </form>
  );
}
