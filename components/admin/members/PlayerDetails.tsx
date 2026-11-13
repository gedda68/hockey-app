"use client";
// Player details: positions and jersey number (editable on the edit screen) plus games and goals.

import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import type { PlayerStats } from "@/lib/members/playerStats";

export const POSITIONS = [
  "Goalkeeper",
  "Fullback",
  "Defender",
  "Midfielder",
  "Forward",
  "Utility",
];

const LABEL = "text-xs font-black uppercase text-slate-400 mb-0.5 block";
const INPUT =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

const posOptions = (stored?: string) => {
  const list = [...POSITIONS];
  if (stored && !list.some((p) => p.toLowerCase() === stored.toLowerCase()))
    list.push(stored); // keep imported values visible
  return list.map((p) => ({ value: p, label: p }));
};

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
      <p className="text-xs font-black uppercase text-orange-700/70">{label}</p>
      <p className="text-2xl font-black text-slate-900 tabular-nums">
        {value ?? "—"}
      </p>
    </div>
  );
}

export function PlayerStatsGrid({ stats }: { stats?: PlayerStats | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat
        label={`Games ${stats?.season ?? "this season"}`}
        value={stats?.gamesSeason}
      />
      <Stat label="Games total" value={stats?.gamesTotal} />
      <Stat
        label={`Goals ${stats?.season ?? "this season"}`}
        value={stats?.goalsSeason}
      />
      <Stat label="Goals total" value={stats?.goalsTotal} />
    </div>
  );
}

export default function PlayerDetails({
  playerInfo,
  stats,
  onChange,
}: {
  playerInfo: Record<string, any> | undefined;
  stats?: PlayerStats | null;
  /** When given, the fields are editable. */
  onChange?: (next: Record<string, any>) => void;
}) {
  const p = playerInfo || {};
  const primary = p.primaryPosition || p.position || "";
  const set = (patch: Record<string, any>) => onChange?.({ ...p, ...patch });
  const ro = (v: unknown) => (
    <p className="text-slate-800 font-semibold">
      {v === undefined || v === null || v === "" ? (
        <span className="text-slate-300">—</span>
      ) : (
        String(v)
      )}
    </p>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Primary position</label>
          {onChange ? (
            <TypeaheadSelect
              ariaLabel="Primary position"
              placeholder="Search position..."
              options={posOptions(primary)}
              value={primary}
              onChange={(v) => set({ primaryPosition: v })}
            />
          ) : (
            ro(primary)
          )}
        </div>
        <div>
          <label className={LABEL}>Secondary position</label>
          {onChange ? (
            <TypeaheadSelect
              ariaLabel="Secondary position"
              placeholder="Search position..."
              options={posOptions(p.secondaryPosition)}
              value={p.secondaryPosition || ""}
              onChange={(v) => set({ secondaryPosition: v })}
            />
          ) : (
            ro(p.secondaryPosition)
          )}
        </div>
        <div>
          <label className={LABEL}>Jersey number</label>
          {onChange ? (
            <input
              type="number"
              min={0}
              max={999}
              inputMode="numeric"
              aria-label="Jersey number"
              className={INPUT}
              value={p.jerseyNumber ?? ""}
              placeholder="e.g. 7"
              onChange={(e) =>
                set({
                  jerseyNumber:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          ) : (
            ro(p.jerseyNumber)
          )}
        </div>
      </div>
      <PlayerStatsGrid stats={stats} />
    </div>
  );
}
