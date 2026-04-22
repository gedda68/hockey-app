"use client";

/**
 * components/admin/shared/FeeScheduleEditor.tsx
 *
 * Reusable table editor for the per-club / per-association registration fee
 * schedule.  Renders one row per FeeScheduleEntry with:
 *   • Role     — dropdown (all roles that go through the request approval workflow)
 *   • Season   — dropdown (currentYear-2 … currentYear+3)
 *   • Amount   — dollar input (stored internally as cents)
 *   • Delete   — removes the row
 *
 * The editor enforces no duplicate (role, seasonYear) combinations within the
 * same schedule.
 *
 * Usage:
 *   <FeeScheduleEditor
 *     schedule={formData.feeSchedule}
 *     onChange={(rows) => handleChange("feeSchedule", rows)}
 *   />
 */

import { DollarSign, Plus, Trash2, AlertCircle, Info } from "lucide-react";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { UserRole } from "@/lib/types/roles";
import type { FeeScheduleEntry } from "@/types/feeSchedule";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Roles that require approval (so a fee schedule makes sense for them). */
const APPROVABLE_ROLES = (
  Object.entries(ROLE_DEFINITIONS) as [UserRole, (typeof ROLE_DEFINITIONS)[UserRole]][]
)
  .filter(([, def]) => def.requiresApproval && def.role !== "public")
  .map(([role, def]) => ({ role, label: def.label }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** Year range for the season selector. */
function buildYearOptions(): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => String(current - 2 + i));
}

const YEAR_OPTIONS = buildYearOptions();
const DEFAULT_YEAR = String(new Date().getFullYear());

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert dollar string → integer cents. "12.50" → 1250. */
function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/** Convert integer cents → dollar string. 1250 → "12.50". */
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** True when two entries share the same (role, seasonYear) key. */
function isDuplicate(
  entries: FeeScheduleEntry[],
  idx: number,
  role: string,
  seasonYear: string,
): boolean {
  return entries.some(
    (e, i) => i !== idx && e.role === role && e.seasonYear === seasonYear,
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FeeScheduleEditorProps {
  schedule: FeeScheduleEntry[];
  onChange: (schedule: FeeScheduleEntry[]) => void;
  /** Optional description label, e.g. "club" or "association". */
  scopeLabel?: string;
}

export default function FeeScheduleEditor({
  schedule,
  onChange,
  scopeLabel = "this organisation",
}: FeeScheduleEditorProps) {

  // ── Mutation helpers ────────────────────────────────────────────────────────

  const addRow = () => {
    // Default to the first role that doesn't already have the current year
    const usedKeys = new Set(schedule.map((e) => `${e.role}::${e.seasonYear}`));
    const defaultRole =
      APPROVABLE_ROLES.find(
        (r) => !usedKeys.has(`${r.role}::${DEFAULT_YEAR}`),
      )?.role ?? APPROVABLE_ROLES[0]?.role ?? ("player" as UserRole);

    onChange([
      ...schedule,
      {
        role:        defaultRole,
        seasonYear:  DEFAULT_YEAR,
        amountCents: 0,
        currency:    "AUD",
        gstIncluded: true,
      },
    ]);
  };

  const removeRow = (idx: number) => {
    onChange(schedule.filter((_, i) => i !== idx));
  };

  const updateRow = (
    idx: number,
    patch: Partial<FeeScheduleEntry>,
  ) => {
    onChange(
      schedule.map((entry, i) =>
        i === idx ? { ...entry, ...patch } : entry,
      ),
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">
            Registration fee schedule for {scopeLabel}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <Info size={12} />
            Fees are resolved at submission time when a role-request is created.
            Club schedules take priority over the parent association.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all text-sm"
        >
          <Plus size={16} />
          Add Row
        </button>
      </div>

      {/* Empty state */}
      {schedule.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <DollarSign size={44} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-bold">No fee schedule entries</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;Add Row&rdquo; to define a registration fee for a role
            and season year.
          </p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[1fr_140px_140px_72px_40px] gap-3 px-4">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wide">Role</span>
            <span className="text-xs font-black uppercase text-slate-400 tracking-wide">Season Year</span>
            <span className="text-xs font-black uppercase text-slate-400 tracking-wide">Amount (AUD)</span>
            <span className="text-xs font-black uppercase text-slate-400 tracking-wide text-center">GST inc.</span>
            <span />
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {schedule.map((entry, idx) => {
              const hasDuplicate = isDuplicate(
                schedule,
                idx,
                entry.role,
                entry.seasonYear,
              );

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_140px_140px_72px_40px] gap-3 items-center p-4 rounded-2xl border-2 transition-colors ${
                    hasDuplicate
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  {/* Role */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1.5 md:hidden">
                      Role
                    </label>
                    <select
                      value={entry.role}
                      onChange={(e) =>
                        updateRow(idx, { role: e.target.value as UserRole })
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-yellow-400 outline-none"
                    >
                      {APPROVABLE_ROLES.map(({ role, label }) => (
                        <option key={role} value={role}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Season Year */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1.5 md:hidden">
                      Season Year
                    </label>
                    <select
                      value={entry.seasonYear}
                      onChange={(e) =>
                        updateRow(idx, { seasonYear: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-yellow-400 outline-none"
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1.5 md:hidden">
                      Amount (AUD $)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={centsToDollars(entry.amountCents)}
                        onChange={(e) =>
                          updateRow(idx, {
                            amountCents: dollarsToCents(e.target.value),
                          })
                        }
                        className="w-full pl-7 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-yellow-400 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* GST included toggle */}
                  <div className="flex flex-col items-start md:items-center gap-1">
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1 md:hidden">
                      GST inc.
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entry.gstIncluded ?? true}
                        onChange={(e) =>
                          updateRow(idx, { gstIncluded: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-yellow-400 transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                    </label>
                    <span className="text-xs text-slate-400 md:hidden">
                      {(entry.gstIncluded ?? true) ? "GST incl." : "GST-free"}
                    </span>
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end md:justify-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove row"
                      aria-label="Remove fee schedule row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Duplicate warning */}
                  {hasDuplicate && (
                    <div className="md:col-span-5 flex items-center gap-2 text-xs font-bold text-red-600 px-1 -mt-1">
                      <AlertCircle size={14} />
                      Duplicate role + season year — only the first matching entry
                      will be used. Remove the duplicate.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <p className="text-xs text-slate-400 font-bold text-right">
            {schedule.length} {schedule.length === 1 ? "entry" : "entries"} in
            schedule
          </p>
        </>
      )}
    </div>
  );
}
