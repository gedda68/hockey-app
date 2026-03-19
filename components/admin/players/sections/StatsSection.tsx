// components/admin/players/sections/StatsSection.tsx
// Per-season goals, assists and hockey stats — reads/writes formData.playHistory
// Position-aware: Goalkeeper view swaps attack stats for clean sheets / saves / goals conceded.

"use client";

import { useState } from "react";
import { BaseSectionProps, PlayerHistory } from "@/types/player.types";
import {
  BarChart2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Target,
  Handshake,
  ShieldCheck,
  Star,
  Flag,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const POSITIONS = [
  "Forward",
  "Midfielder",
  "Defender",
  "Goalkeeper",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const SEASON_OPTIONS = Array.from({ length: 20 }, (_, i) =>
  String(CURRENT_YEAR - i),
);

type StatForm = Omit<PlayerHistory, "id">;

const EMPTY_FORM: StatForm = {
  season: String(CURRENT_YEAR),
  clubName: "",
  teamName: "",
  division: "",
  position: "Forward",
  gamesPlayed: undefined,
  goals: undefined,
  assists: undefined,
  penaltyCorners: undefined,
  penaltyStrokeGoals: undefined,
  minutesPlayed: undefined,
  greenCards: undefined,
  yellowCards: undefined,
  redCards: undefined,
  cleanSheets: undefined,
  goalsConceded: undefined,
  saves: undefined,
  playerOfMatch: undefined,
  notes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: number | undefined): number { return v ?? 0; }
function dash(v: number | undefined): string { return v !== undefined ? String(v) : "—"; }
function isGK(position?: string): boolean {
  return !!position && position.toLowerCase().includes("goalkeeper");
}

function sumField(records: PlayerHistory[], field: keyof PlayerHistory): number {
  return records.reduce((acc, r) => acc + n(r[field] as number | undefined), 0);
}

/** Percentage bar — width capped at 100% of the max value in the set */
function TrendBar({
  value,
  max,
  colour = "bg-[#06054e]",
}: {
  value: number;
  max: number;
  colour?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-black text-slate-500 w-5 text-right">{value}</span>
    </div>
  );
}

// ── Stat input ─────────────────────────────────────────────────────────────────

function StatInput({
  label,
  value,
  onChange,
  placeholder = "0",
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Math.max(0, parseInt(raw, 10)));
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-center font-black focus:border-[#06054e] focus:outline-none bg-white"
      />
    </div>
  );
}

// ── Season card ───────────────────────────────────────────────────────────────

function SeasonCard({
  record,
  maxGoals,
  maxGames,
  onEdit,
  onDelete,
}: {
  record: PlayerHistory;
  maxGoals: number;
  maxGames: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const gk = isGK(record.position);
  const hasAnyStats =
    record.gamesPlayed !== undefined ||
    record.goals !== undefined ||
    record.assists !== undefined ||
    record.cleanSheets !== undefined;

  const goalPoints = n(record.goals) + n(record.assists);
  const hasCards = n(record.greenCards) + n(record.yellowCards) + n(record.redCards) > 0;

  return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all">
      {/* Card header */}
      <div className="flex items-center gap-4 p-4">
        {/* Season badge */}
        <div className="w-14 h-14 rounded-xl bg-[#06054e] text-white flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs font-black leading-none">{record.season}</span>
          <span className="text-[9px] font-bold text-white/60 mt-0.5 uppercase">Season</span>
        </div>

        {/* Club / team info */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#06054e] text-sm leading-tight truncate">
            {record.clubName || <span className="text-slate-400 font-bold">No club</span>}
          </p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {record.teamName && (
              <span className="text-xs text-slate-500 font-semibold">{record.teamName}</span>
            )}
            {record.division && (
              <span className="text-xs text-slate-400 font-semibold">{record.division}</span>
            )}
            {record.position && (
              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                gk
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-[#06054e]/5 text-[#06054e] border-[#06054e]/10"
              }`}>
                {record.position}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors rounded-lg"
            title="Edit stats"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors rounded-lg"
            title="Toggle details"
          >
            {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete record"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Stat summary strip */}
      {hasAnyStats && (
        <div className={`grid gap-px border-t border-slate-100 ${gk ? "grid-cols-4" : "grid-cols-4"}`}>
          <div className="px-3 py-2 text-center">
            <p className="text-lg font-black text-[#06054e]">{dash(record.gamesPlayed)}</p>
            <p className="text-[9px] font-black uppercase text-slate-400">Games</p>
          </div>
          {gk ? (
            <>
              <div className="px-3 py-2 text-center border-l border-slate-100">
                <p className="text-lg font-black text-amber-600">{dash(record.cleanSheets)}</p>
                <p className="text-[9px] font-black uppercase text-slate-400">Clean Sheets</p>
              </div>
              <div className="px-3 py-2 text-center border-l border-slate-100">
                <p className="text-lg font-black text-slate-600">{dash(record.saves)}</p>
                <p className="text-[9px] font-black uppercase text-slate-400">Saves</p>
              </div>
              <div className="px-3 py-2 text-center border-l border-slate-100">
                <p className="text-lg font-black text-red-500">{dash(record.goalsConceded)}</p>
                <p className="text-[9px] font-black uppercase text-slate-400">Conceded</p>
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-2 text-center border-l border-slate-100">
                <p className="text-lg font-black text-[#06054e]">{dash(record.goals)}</p>
                <p className="text-[9px] font-black uppercase text-slate-400">Goals</p>
              </div>
              <div className="px-3 py-2 text-center border-l border-slate-100">
                <p className="text-lg font-black text-[#06054e]">{dash(record.assists)}</p>
                <p className="text-[9px] font-black uppercase text-slate-400">Assists</p>
              </div>
              <div className="px-3 py-2 text-center border-l border-slate-100">
                <p className="text-lg font-black text-[#06054e]">{goalPoints > 0 ? goalPoints : "—"}</p>
                <p className="text-[9px] font-black uppercase text-slate-400">Pts (G+A)</p>
              </div>
            </>
          )}
        </div>
      )}

      {!hasAnyStats && (
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-xs text-slate-400 font-semibold italic">No stats recorded yet — click edit to add.</p>
        </div>
      )}

      {/* Goals trend bar (outfield only, when games exist) */}
      {!gk && hasAnyStats && maxGoals > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase text-slate-400">Goals this season vs best</span>
          </div>
          <TrendBar value={n(record.goals)} max={maxGoals} />
        </div>
      )}

      {/* Expanded details */}
      {showMore && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {/* Cards row */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Cards</span>
            {hasCards ? (
              <div className="flex gap-3">
                {n(record.greenCards) > 0 && (
                  <span className="flex items-center gap-1 text-xs font-black text-green-700">
                    <span className="inline-block w-3 h-4 bg-green-500 rounded-sm" />
                    {record.greenCards}
                  </span>
                )}
                {n(record.yellowCards) > 0 && (
                  <span className="flex items-center gap-1 text-xs font-black text-yellow-700">
                    <span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" />
                    {record.yellowCards}
                  </span>
                )}
                {n(record.redCards) > 0 && (
                  <span className="flex items-center gap-1 text-xs font-black text-red-700">
                    <span className="inline-block w-3 h-4 bg-red-500 rounded-sm" />
                    {record.redCards}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-semibold">None</span>
            )}
          </div>

          {/* Other outfield extras */}
          {!gk && (
            <div className="grid grid-cols-3 gap-3">
              {record.penaltyCorners !== undefined && (
                <div className="text-center">
                  <p className="text-base font-black text-slate-700">{record.penaltyCorners}</p>
                  <p className="text-[9px] font-black uppercase text-slate-400">Pen. Corners</p>
                </div>
              )}
              {record.penaltyStrokeGoals !== undefined && (
                <div className="text-center">
                  <p className="text-base font-black text-slate-700">{record.penaltyStrokeGoals}</p>
                  <p className="text-[9px] font-black uppercase text-slate-400">Stroke Goals</p>
                </div>
              )}
              {record.minutesPlayed !== undefined && (
                <div className="text-center">
                  <p className="text-base font-black text-slate-700">{record.minutesPlayed}</p>
                  <p className="text-[9px] font-black uppercase text-slate-400">Minutes</p>
                </div>
              )}
            </div>
          )}

          {/* Awards */}
          {n(record.playerOfMatch) > 0 && (
            <div className="flex items-center gap-2">
              <Star size={12} className="text-yellow-500" />
              <span className="text-xs font-black text-slate-700">
                Player of the Match ×{record.playerOfMatch}
              </span>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">{record.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsSection({ formData, onChange }: BaseSectionProps) {
  const playHistory: PlayerHistory[] = formData.playHistory ?? [];

  // Sort newest first
  const sorted = [...playHistory].sort((a, b) => b.season.localeCompare(a.season));

  // Add / edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StatForm>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateHistory(updated: PlayerHistory[]) {
    onChange("playHistory", updated);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(record: PlayerHistory) {
    setEditingId(record.id);
    setForm({ ...record });
    setFormError("");
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  function handleSave() {
    if (!form.season.trim()) { setFormError("Season year is required."); return; }
    if (!form.clubName.trim()) { setFormError("Club name is required."); return; }

    if (editingId) {
      updateHistory(
        playHistory.map((r) => (r.id === editingId ? { ...r, ...form, id: editingId } : r)),
      );
    } else {
      const newRecord: PlayerHistory = {
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...form,
      };
      updateHistory([newRecord, ...playHistory]);
    }

    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  function handleDelete(id: string) {
    updateHistory(playHistory.filter((r) => r.id !== id));
  }

  function setField<K extends keyof StatForm>(key: K, value: StatForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Career aggregates ─────────────────────────────────────────────────────
  const totalGames   = sumField(playHistory, "gamesPlayed");
  const totalGoals   = sumField(playHistory, "goals");
  const totalAssists = sumField(playHistory, "assists");
  const totalCS      = sumField(playHistory, "cleanSheets");
  const totalPOM     = sumField(playHistory, "playerOfMatch");
  const totalCards   = sumField(playHistory, "yellowCards") + sumField(playHistory, "redCards");
  const careerSeasons = playHistory.length;

  // Are most records for a GK?
  const gkCount = playHistory.filter((r) => isGK(r.position)).length;
  const isMainlyGK = gkCount > playHistory.length / 2;

  // For trend bars
  const maxGoals = Math.max(...playHistory.map((r) => n(r.goals)), 1);
  const maxGames = Math.max(...playHistory.map((r) => n(r.gamesPlayed)), 1);

  // Form GK check
  const formIsGK = isGK(form.position);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Career summary ─────────────────────────────────────────────────── */}
      {playHistory.length > 0 && (
        <div className="rounded-2xl bg-[#06054e] p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4">Career Totals</p>
          <div className={`grid gap-4 ${isMainlyGK ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
            <div className="text-center">
              <p className="text-4xl font-black">{careerSeasons}</p>
              <p className="text-[10px] font-black uppercase text-white/50 mt-1">Seasons</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">{totalGames || "—"}</p>
              <p className="text-[10px] font-black uppercase text-white/50 mt-1">Games</p>
            </div>
            {isMainlyGK ? (
              <>
                <div className="text-center">
                  <p className="text-4xl font-black text-yellow-400">{totalCS || "—"}</p>
                  <p className="text-[10px] font-black uppercase text-white/50 mt-1">Clean Sheets</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-yellow-400">{totalPOM || "—"}</p>
                  <p className="text-[10px] font-black uppercase text-white/50 mt-1">POM Awards</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-4xl font-black text-yellow-400">{totalGoals || "—"}</p>
                  <p className="text-[10px] font-black uppercase text-white/50 mt-1">Goals</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-yellow-400">{totalAssists || "—"}</p>
                  <p className="text-[10px] font-black uppercase text-white/50 mt-1">Assists</p>
                </div>
              </>
            )}
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            {!isMainlyGK && (
              <div className="text-center">
                <p className="text-xl font-black text-white/80">
                  {totalGames > 0 ? (totalGoals / totalGames).toFixed(2) : "—"}
                </p>
                <p className="text-[9px] font-black uppercase text-white/40">Goals/Game</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xl font-black text-white/80">{totalCards || "—"}</p>
              <p className="text-[9px] font-black uppercase text-white/40">Cards (Y+R)</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-white/80">{totalPOM || "—"}</p>
              <p className="text-[9px] font-black uppercase text-white/40">POM Awards</p>
            </div>
            {isMainlyGK && totalGames > 0 && (
              <div className="text-center">
                <p className="text-xl font-black text-white/80">
                  {(totalCS / totalGames * 100).toFixed(0)}%
                </p>
                <p className="text-[9px] font-black uppercase text-white/40">Clean Sheet %</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Goals trend chart ───────────────────────────────────────────────── */}
      {!isMainlyGK && sorted.length > 1 && sorted.some((r) => n(r.goals) > 0) && (
        <div className="rounded-2xl border-2 border-slate-100 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
            <BarChart2 size={11} />
            Goals by Season
          </p>
          <div className="space-y-2">
            {sorted.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-[11px] font-black text-slate-500 w-12 text-right">{r.season}</span>
                <div className="flex-1">
                  <TrendBar value={n(r.goals)} max={maxGoals} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add button ──────────────────────────────────────────────────────── */}
      {!showForm && (
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:text-[#06054e] hover:border-[#06054e]/40 rounded-2xl text-sm font-black uppercase transition-colors"
        >
          <Plus size={16} />
          Add Season Stats
        </button>
      )}

      {/* ── Add / Edit form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="border-2 border-[#06054e]/20 rounded-2xl p-5 bg-[#06054e]/5 space-y-5">
          <p className="text-xs font-black uppercase text-[#06054e] tracking-widest">
            {editingId ? "Edit Season Stats" : "New Season Stats"}
          </p>

          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold">
              <AlertCircle size={13} />
              {formError}
            </div>
          )}

          {/* ── Identity ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Season <span className="text-red-500">*</span>
              </label>
              <select
                value={form.season}
                onChange={(e) => setField("season", e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#06054e] focus:outline-none bg-white"
              >
                {SEASON_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Club <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.clubName}
                onChange={(e) => setField("clubName", e.target.value)}
                placeholder="Club name"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Team</label>
              <input
                type="text"
                value={form.teamName ?? ""}
                onChange={(e) => setField("teamName", e.target.value)}
                placeholder="e.g. Under 16s"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Division</label>
              <input
                type="text"
                value={form.division ?? ""}
                onChange={(e) => setField("division", e.target.value)}
                placeholder="e.g. State League Div 1"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Position</label>
              <select
                value={form.position ?? "Forward"}
                onChange={(e) => setField("position", e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#06054e] focus:outline-none bg-white"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Core stats ── */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">
              {formIsGK ? "Goalkeeper Stats" : "Outfield Stats"}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <StatInput label="Games Played" value={form.gamesPlayed} onChange={(v) => setField("gamesPlayed", v)} />

              {formIsGK ? (
                <>
                  <StatInput label="Clean Sheets" value={form.cleanSheets} onChange={(v) => setField("cleanSheets", v)} />
                  <StatInput label="Goals Conceded" value={form.goalsConceded} onChange={(v) => setField("goalsConceded", v)} />
                  <StatInput label="Saves" value={form.saves} onChange={(v) => setField("saves", v)} />
                </>
              ) : (
                <>
                  <StatInput label="Goals" value={form.goals} onChange={(v) => setField("goals", v)} />
                  <StatInput label="Assists" value={form.assists} onChange={(v) => setField("assists", v)} />
                  <StatInput label="Pen. Corners" value={form.penaltyCorners} onChange={(v) => setField("penaltyCorners", v)} />
                  <StatInput label="Stroke Goals" value={form.penaltyStrokeGoals} onChange={(v) => setField("penaltyStrokeGoals", v)} />
                  <StatInput label="Minutes Played" value={form.minutesPlayed} onChange={(v) => setField("minutesPlayed", v)} />
                </>
              )}
            </div>
          </div>

          {/* ── Discipline ── */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Discipline</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-4 bg-green-500 rounded-sm" /> Green
                </label>
                <input type="number" min={0} value={form.greenCards ?? ""}
                  onChange={(e) => setField("greenCards", e.target.value === "" ? undefined : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-center font-black focus:border-[#06054e] focus:outline-none bg-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" /> Yellow
                </label>
                <input type="number" min={0} value={form.yellowCards ?? ""}
                  onChange={(e) => setField("yellowCards", e.target.value === "" ? undefined : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-center font-black focus:border-[#06054e] focus:outline-none bg-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-4 bg-red-500 rounded-sm" /> Red
                </label>
                <input type="number" min={0} value={form.redCards ?? ""}
                  onChange={(e) => setField("redCards", e.target.value === "" ? undefined : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-center font-black focus:border-[#06054e] focus:outline-none bg-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* ── Awards + notes ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatInput
              label="Player of Match Awards"
              value={form.playerOfMatch}
              onChange={(v) => setField("playerOfMatch", v)}
            />
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="e.g. Competed at State Championships"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-sm rounded-2xl transition-all"
            >
              <Check size={15} />
              {editingId ? "Update Stats" : "Save Stats"}
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {playHistory.length === 0 && !showForm && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <BarChart2 size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="font-black text-slate-400 uppercase text-sm">No stats recorded</p>
          <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
            Use the button above to record goals, assists and other per-season stats for this player.
          </p>
        </div>
      )}

      {/* ── Season cards ─────────────────────────────────────────────────────── */}
      {sorted.length > 0 && !showForm && (
        <div className="space-y-3">
          {sorted.map((record) => (
            <SeasonCard
              key={record.id}
              record={record}
              maxGoals={maxGoals}
              maxGames={maxGames}
              onEdit={() => openEdit(record)}
              onDelete={() => handleDelete(record.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
