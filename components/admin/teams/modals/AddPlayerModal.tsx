// components/admin/teams/modals/AddPlayerModal.tsx
// Add several players to a team at once: type-ahead name multi-select, then a
// jersey number + type-ahead position for each selected player.

"use client";

import { useState, useEffect, useMemo } from "react";
import type { TeamRoster } from "@/types/admin/teams.types";
import TypeaheadMultiSelect from "@/components/ui/TypeaheadMultiSelect";
import { checkTeamEligibility } from "@/lib/rosters/teamEligibility";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

interface Player {
  /** Mongo _id (display/debug only) — API add-player expects `memberId`. */
  id: string;
  playerId: string;
  memberId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  memberNumber: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  currentTeams?: { teamName: string; rosterId: string }[];
  lastSelection?: {
    number: string;
    position: string;
    teamName: string;
    selectedDate: string;
  } | null;
}

export interface AddPlayerEntry {
  playerId: string;
  number: string;
  position: string;
}

interface AddPlayerModalProps {
  roster: TeamRoster;
  teamIndex: number;
  onClose: () => void;
  onSubmit: (entries: AddPlayerEntry[]) => void | Promise<void>;
}

export const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Striker",
  "Winger",
  "Utility",
];
const POSITION_OPTIONS = POSITIONS.map((p) => ({ value: p, label: p }));

interface Pick {
  number: string;
  position: string;
}

const keyOf = (p: Player) => p.memberId || p.playerId;

export default function AddPlayerModal({
  roster,
  teamIndex,
  onClose,
  onSubmit,
}: AddPlayerModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url =
          `/api/admin/teams/players/eligible?` +
          new URLSearchParams({
            clubId: roster.clubId,
            division: roster.division,
            category: roster.category,
            gender: roster.gender,
            season: roster.season || "2026",
          });
        const data = await (await fetch(url)).json();

        const onRoster = new Set<string>();
        const collect = (p: { id?: string; playerId?: string; memberId?: string }) => {
          if (p.id) onRoster.add(String(p.id));
          if (p.playerId) onRoster.add(String(p.playerId));
          if (p.memberId) onRoster.add(String(p.memberId));
        };
        // Players may be in several teams (rules checked below), so only block this team.
        for (const p of roster.teams[teamIndex]?.players ?? []) collect(p);
        for (const p of roster.shadowPlayers) collect(p);
        for (const p of roster.withdrawn) collect(p);

        setPlayers(
          (data.players || []).filter((p: Player) => {
            const mid = keyOf(p);
            return mid && !onRoster.has(mid) && !onRoster.has(p.id);
          }),
        );
      } catch (error) {
        console.error("Error fetching eligible players:", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
    // roster arrays are stable for the modal's lifetime; see exclusion filtering above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster.clubId, roster.division, roster.category, roster.gender, roster.season]);

  const teamName = roster.teams[teamIndex]?.name ?? "";
  const { allowed, blocked } = useMemo(() => {
    const allowed: Player[] = [];
    const blocked: { player: Player; reason: string }[] = [];
    for (const p of players) {
      const v = checkTeamEligibility({
        category: roster.category,
        season: roster.season || "2026",
        dateOfBirth: p.dateOfBirth,
        newTeamName: teamName,
        existing: p.currentTeams ?? [],
      });
      if (v.ok) allowed.push(p);
      else blocked.push({ player: p, reason: v.reason });
    }
    return { allowed, blocked };
  }, [players, roster.category, roster.season, teamName]);

  const options = useMemo(
    () =>
      allowed.map((p) => ({
        value: keyOf(p),
        label: `${p.firstName} ${p.lastName}${p.preferredName ? ` "${p.preferredName}"` : ""} · #${p.memberNumber}`,
        hint: p.primaryPosition,
      })),
    [allowed],
  );

  const handleSelect = (ids: string[]) => {
    setSelectedIds(ids);
    setPicks((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (next[id]) continue;
        const p = players.find((x) => keyOf(x) === id);
        // Smart defaults from last selection / primary position
        next[id] = {
          number: p?.lastSelection?.number || "",
          position: p?.lastSelection?.position || p?.primaryPosition || "",
        };
      }
      return next;
    });
  };

  const setPick = (id: string, patch: Partial<Pick>) =>
    setPicks((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const selected = selectedIds
    .map((id) => players.find((p) => keyOf(p) === id))
    .filter((p): p is Player => !!p);

  const numberCounts = new Map<string, number>();
  for (const id of selectedIds) {
    const n = (picks[id]?.number || "").trim();
    if (n) numberCounts.set(n, (numberCounts.get(n) || 0) + 1);
  }
  const hasDuplicateNumbers = [...numberCounts.values()].some((c) => c > 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected.length || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(
        selected.map((p) => ({
          playerId: keyOf(p),
          number: picks[keyOf(p)]?.number ?? "",
          position: picks[keyOf(p)]?.position ?? "",
        })),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="flex min-h-0 max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black uppercase text-[#06054e]">
                    Add Players to Team
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {roster.clubName} · {roster.division} {roster.category}{" "}
                    {roster.gender}
                  </p>
                  <p className="text-sm font-bold text-blue-600 mt-1">
                    Team: {roster.teams[teamIndex]?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Players
              </label>
              <TypeaheadMultiSelect
                options={options}
                values={selectedIds}
                onChange={handleSelect}
                placeholder={
                  loading
                    ? "Loading players…"
                    : "Type a name or member number…"
                }
                ariaLabel="Players"
              />
              {blocked.length > 0 && (
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer font-bold">
                    {blocked.length} member{blocked.length === 1 ? "" : "s"} not
                    eligible for this team
                  </summary>
                  <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
                    {blocked.map(({ player, reason }) => (
                      <li key={keyOf(player)}>
                        <span className="font-bold">
                          {player.firstName} {player.lastName}
                        </span>{" "}
                        — {reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <div className="min-h-[200px] min-w-0 flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
              {selected.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="font-bold">
                    {!loading && players.length === 0
                      ? "No eligible players available"
                      : "Select one or more players"}
                  </p>
                  <p className="mt-2 text-sm">
                    Each player gets their own jersey number and position.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  <li className="hidden grid-cols-[1fr_6rem_14rem_2rem] gap-3 px-1 text-xs font-black uppercase tracking-wider text-slate-400 sm:grid">
                    <span>Player</span>
                    <span>Number</span>
                    <span>Position</span>
                    <span />
                  </li>
                  {selected.map((p) => {
                    const id = keyOf(p);
                    const pick = picks[id] || { number: "", position: "" };
                    const dup =
                      pick.number.trim() !== "" &&
                      (numberCounts.get(pick.number.trim()) || 0) > 1;
                    return (
                      <li
                        key={id}
                        className="grid grid-cols-1 items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 sm:grid-cols-[1fr_6rem_14rem_2rem]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-black">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-xs text-slate-500">
                            #{p.memberNumber}
                            {p.lastSelection && (
                              <span className="ml-2 text-green-600">
                                Last: #{p.lastSelection.number}{" "}
                                {p.lastSelection.position}
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Jersey number for ${p.firstName} ${p.lastName}`}
                          value={pick.number}
                          onChange={(e) => setPick(id, { number: e.target.value })}
                          placeholder="No."
                          className={`w-full rounded-xl border-2 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#06054e] ${
                            dup ? "border-red-400" : "border-slate-300"
                          }`}
                        />
                        <TypeaheadSelect
                          options={POSITION_OPTIONS}
                          value={pick.position}
                          onChange={(v) => setPick(id, { position: v })}
                          placeholder="Position…"
                          ariaLabel={`Position for ${p.firstName} ${p.lastName}`}
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${p.firstName} ${p.lastName}`}
                          onClick={() =>
                            setSelectedIds((prev) => prev.filter((x) => x !== id))
                          }
                          className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {hasDuplicateNumbers && (
                <p className="mt-3 text-sm font-bold text-red-600">
                  Two selected players share the same jersey number.
                </p>
              )}
            </div>

            <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-8 py-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selected.length || submitting}
                className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Adding…"
                  : selected.length === 0
                    ? "Select Players"
                    : `Add ${selected.length} player${selected.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
