"use client";

/**
 * /admin/role-expiry
 *
 * Role expiry dashboard (R7).
 *
 * ── What it shows ─────────────────────────────────────────────────────────────
 *   Two sections in a sortable table:
 *     1. Already expired — active role assignments past their expiresAt date.
 *     2. Expiring within N days — upcoming expirations in the warning window.
 *
 * ── Actions ───────────────────────────────────────────────────────────────────
 *   • Per-row "Send Reminder" — fires a single-row email immediately.
 *   • Row checkboxes + "Send Reminder (N)" bulk action — batch email selected rows.
 *   • "Export CSV" — streams the full dataset as a downloadable CSV.
 *   • "Run Cleanup" — marks all expired-but-still-active roles as inactive
 *     (dry-run preview before committing). Super-admin / assoc-admin only.
 *   • Warning window selector — 30 / 60 / 90 days.
 *
 * ── Visible to ───────────────────────────────────────────────────────────────
 *   super-admin, association-admin, club-admin, registrar, assoc-registrar
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { RoleExpirySummary } from "@/app/api/admin/roles/expiring/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function daysLabel(days: number): string {
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  return `${days}d`;
}

function rowKey(r: RoleExpirySummary): string {
  return `${r.memberId}::${r.role}::${r.scopeId ?? ""}`;
}

type SortKey = "memberName" | "roleLabel" | "scopeName" | "seasonYear" | "expiresAt" | "daysUntilExpiry";
type SortDir = "asc" | "desc";

function sortRows(rows: RoleExpirySummary[], key: SortKey, dir: SortDir): RoleExpirySummary[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Urgency helpers ───────────────────────────────────────────────────────────

function urgencyClasses(row: RoleExpirySummary, variant: "expiring" | "expired"): string {
  if (variant === "expired") return "bg-red-50";
  if (row.daysUntilExpiry <= 14) return "bg-orange-50";
  return "";
}

function daysPillClasses(row: RoleExpirySummary, variant: "expiring" | "expired"): string {
  if (variant === "expired")              return "bg-red-100 text-red-700";
  if (row.daysUntilExpiry <= 14)          return "bg-orange-100 text-orange-700";
  if (row.daysUntilExpiry <= 30)          return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

// ── Sortable column header ────────────────────────────────────────────────────

function Th({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey;
  current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-800 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === "asc"
            ? <ChevronUp size={12} className="text-indigo-500" />
            : <ChevronDown size={12} className="text-indigo-500" />
          : <ChevronUp size={12} className="opacity-20" />}
      </span>
    </th>
  );
}

// ── Expiry table ──────────────────────────────────────────────────────────────

function ExpiryTable({
  rows,
  variant,
  selected,
  onToggle,
  onToggleAll,
  onSendOne,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: RoleExpirySummary[];
  variant: "expiring" | "expired";
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], check: boolean) => void;
  onSendOne: (row: RoleExpirySummary) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const keys      = rows.map(rowKey);
  const allChecked = keys.length > 0 && keys.every((k) => selected.has(k));
  const someChecked = keys.some((k) => selected.has(k));

  if (rows.length === 0) return null;

  const sorted = sortRows(rows, sortKey, sortDir);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {/* Checkbox — select all in this section */}
            <th className="px-3 py-2.5 w-9">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={(e) => onToggleAll(keys, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                aria-label="Select all"
              />
            </th>
            <Th label="Member"      sortKey="memberName"       current={sortKey} dir={sortDir} onSort={onSort} />
            <Th label="Role"        sortKey="roleLabel"        current={sortKey} dir={sortDir} onSort={onSort} />
            <Th label="Scope"       sortKey="scopeName"        current={sortKey} dir={sortDir} onSort={onSort} />
            <Th label="Season"      sortKey="seasonYear"       current={sortKey} dir={sortDir} onSort={onSort} />
            <Th label="Expires"     sortKey="expiresAt"        current={sortKey} dir={sortDir} onSort={onSort} />
            <Th label="Days"        sortKey="daysUntilExpiry"  current={sortKey} dir={sortDir} onSort={onSort} />
            <th className="px-3 py-2.5 w-28" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row) => {
            const key     = rowKey(row);
            const checked = selected.has(key);
            return (
              <tr
                key={key}
                className={`transition-colors ${checked ? "bg-indigo-50" : urgencyClasses(row, variant)} hover:bg-indigo-50/60`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(key)}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                    aria-label={`Select ${row.memberName}`}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-slate-900 truncate max-w-[160px]" title={row.memberName}>
                    {row.memberName}
                  </p>
                  {row.email && (
                    <p className="text-xs text-slate-400 truncate max-w-[160px]" title={row.email}>
                      {row.email}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                  {row.roleLabel}
                </td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                  {row.scopeName ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                  {row.seasonYear ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                  {formatDate(row.expiresAt)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${daysPillClasses(row, variant)}`}>
                    {daysLabel(row.daysUntilExpiry)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {row.email ? (
                    <button
                      onClick={() => onSendOne(row)}
                      title="Send re-registration reminder"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-200 hover:border-indigo-400"
                    >
                      <Mail size={12} />
                      Remind
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300 px-2 py-1">No email</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Cleanup preview modal ─────────────────────────────────────────────────────

interface CleanupResult {
  deactivated: number;
  details: { memberId: string; memberName: string; role: string; scopeName?: string; expiresAt: string }[];
}

function CleanupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [preview, setPreview] = useState<CleanupResult | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/admin/roles/expire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    })
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => toast.error("Failed to load preview"));
  }, []);

  async function runCleanup() {
    setRunning(true);
    try {
      const res  = await fetch("/api/admin/roles/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const data: CleanupResult = await res.json();
      if (!res.ok) throw new Error("Cleanup failed");
      setPreview(data);
      setDone(true);
      toast.success(`${data.deactivated} expired role${data.deactivated !== 1 ? "s" : ""} deactivated`);
      onDone();
    } catch {
      toast.error("Cleanup failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-gray-900">
              {done ? "Cleanup Complete" : "Expire Roles — Preview"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {!preview ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : preview.deactivated === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Nothing to clean up</p>
              <p className="text-sm text-gray-500 mt-1">All expired roles are already deactivated.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                {done
                  ? `${preview.deactivated} role${preview.deactivated !== 1 ? "s" : ""} deactivated.`
                  : `${preview.deactivated} expired role${preview.deactivated !== 1 ? "s" : ""} will be marked inactive:`}
              </p>
              <div className="space-y-1.5">
                {preview.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-gray-50 border rounded-lg px-3 py-2">
                    <div>
                      <span className="font-medium">{d.memberName}</span>
                      <span className="text-gray-500"> — {d.role}</span>
                      {d.scopeName && <span className="text-gray-400"> ({d.scopeName})</span>}
                    </div>
                    <span className="text-xs text-red-500 shrink-0 ml-2">{formatDate(d.expiresAt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!done ? (
          <div className="p-5 border-t flex gap-2">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={runCleanup}
              disabled={running || !preview || preview.deactivated === 0}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Deactivate {preview?.deactivated ?? "…"} Role{preview?.deactivated !== 1 ? "s" : ""}
            </button>
          </div>
        ) : (
          <div className="p-5 border-t">
            <button onClick={onClose} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reminder result modal ─────────────────────────────────────────────────────

interface ReminderResult {
  sent: number; skipped: number; failed: number;
  results: Array<{ memberId: string; memberName: string; status: "sent" | "skipped" | "failed"; reason?: string }>;
}

function ReminderResultModal({ result, onClose }: { result: ReminderResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Reminder Send Results</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Summary pills */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-2xl font-black text-green-700">{result.sent}</p>
              <p className="text-xs text-green-600">Sent</p>
            </div>
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-2xl font-black text-slate-500">{result.skipped}</p>
              <p className="text-xs text-slate-400">Skipped</p>
            </div>
            {result.failed > 0 && (
              <div className="flex-1 rounded-xl bg-red-50 border border-red-200 p-3 text-center">
                <p className="text-2xl font-black text-red-700">{result.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            )}
          </div>

          {/* Per-row results */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {result.results.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-slate-50 border rounded-lg px-3 py-2">
                <span className="font-medium text-slate-800 truncate">{r.memberName}</span>
                <span className={`text-xs font-semibold ml-2 shrink-0 ${
                  r.status === "sent"    ? "text-green-600" :
                  r.status === "failed"  ? "text-red-600"   : "text-slate-400"
                }`}>
                  {r.status === "sent"    ? "✓ Sent"    :
                   r.status === "failed"  ? "✗ Failed"  : "— Skipped"}
                </span>
              </div>
            ))}
          </div>

          {result.skipped > 0 && (
            <p className="text-xs text-slate-400">
              Skipped members have no email address on their profile.
            </p>
          )}
        </div>

        <div className="p-5 border-t">
          <button onClick={onClose} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoleExpiryPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [expiringSoon, setExpiringSoon] = useState<RoleExpirySummary[]>([]);
  const [expired,      setExpired]      = useState<RoleExpirySummary[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [warnDays,     setWarnDays]     = useState(60);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sort (shared across both tables)
  const [sortKey, setSortKey] = useState<SortKey>("daysUntilExpiry");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Modals
  const [showCleanup,      setShowCleanup]      = useState(false);
  const [sendingReminder,  setSendingReminder]  = useState(false);
  const [reminderResult,   setReminderResult]   = useState<ReminderResult | null>(null);

  const isSuperOrAssocAdmin =
    user?.role === "super-admin" || user?.role === "association-admin";

  // ── Data load ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res  = await fetch(`/api/admin/roles/expiring?days=${warnDays}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExpiringSoon(data.expiringSoon ?? []);
      setExpired(data.expired ?? []);
    } catch {
      toast.error("Failed to load expiry data");
    } finally {
      setLoading(false);
    }
  }, [warnDays]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  // ── Sort handler ─────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Selection handlers ────────────────────────────────────────────────────────

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAll(keys: string[], check: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (check) next.add(k); else next.delete(k);
      }
      return next;
    });
  }

  // ── CSV export ────────────────────────────────────────────────────────────────

  function handleExportCSV() {
    const qs = new URLSearchParams({ days: String(warnDays), format: "csv" });
    window.open(`/api/admin/roles/expiring?${qs}`, "_blank");
  }

  // ── Reminder send ─────────────────────────────────────────────────────────────

  const allRows = [...expired, ...expiringSoon];

  async function sendReminders(rows: RoleExpirySummary[]) {
    if (rows.length === 0) return;
    setSendingReminder(true);
    try {
      const res  = await fetch("/api/admin/roles/expiry-reminder", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows }),
      });
      const data: ReminderResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Send failed");
      setReminderResult(data);
      setSelected(new Set());
      toast.success(`${data.sent} reminder${data.sent !== 1 ? "s" : ""} sent`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSendingReminder(false);
    }
  }

  const selectedRows = allRows.filter((r) => selected.has(rowKey(r)));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Role Expiry Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Seasonal roles expiring soon — send renewal reminders or run database cleanup.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-lg transition disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-400 px-3 py-2 rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {isSuperOrAssocAdmin && (
            <button
              onClick={() => setShowCleanup(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Run Cleanup
            </button>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{expired.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Expired (active)</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Expiring ≤ {warnDays}d</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">{selected.size}</p>
            <p className="text-xs text-gray-500 mt-0.5">Selected</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-700">{expired.length + expiringSoon.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Needs attention</p>
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 font-medium whitespace-nowrap">Show expiring within:</span>
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setWarnDays(d)}
              className={`px-3 py-1 rounded-lg border font-medium transition text-sm ${
                warnDays === d
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk action toolbar (appears when rows selected) ── */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 bg-indigo-600 text-white rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="font-bold">{selected.size} row{selected.size !== 1 ? "s" : ""} selected</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-indigo-200 hover:text-white text-xs underline"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => void sendReminders(selectedRows)}
            disabled={sendingReminder}
            className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition disabled:opacity-50"
          >
            {sendingReminder
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
              : <><Mail className="w-4 h-4" /> Send Reminder ({selected.size})</>
            }
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* ── Already expired ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-gray-800">
                Already Expired — Still Active ({expired.length})
              </h2>
            </div>

            {expired.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                No expired roles still marked active. Database is clean.
              </div>
            ) : (
              <>
                <ExpiryTable
                  rows={expired} variant="expired"
                  selected={selected} onToggle={toggleRow} onToggleAll={toggleAll}
                  onSendOne={(row) => void sendReminders([row])}
                  sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                />
                {isSuperOrAssocAdmin && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    These roles are already excluded from new login sessions. Run Cleanup to mark them inactive.
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── Expiring soon ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-800">
                Expiring Within {warnDays} Days ({expiringSoon.length})
              </h2>
            </div>

            {expiringSoon.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-400 text-center">
                No roles expiring in the next {warnDays} days.
              </div>
            ) : (
              <>
                <ExpiryTable
                  rows={expiringSoon} variant="expiring"
                  selected={selected} onToggle={toggleRow} onToggleAll={toggleAll}
                  onSendOne={(row) => void sendReminders([row])}
                  sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                />
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-800">
                  <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  Members with expiring roles see renewal prompts on their My Registrations page and
                  receive automated cron reminders at 6 weeks and 2 weeks (if enabled in the
                  association Communications Hub).
                </div>
              </>
            )}
          </section>

          {/* ── How it works ── */}
          <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shield className="w-4 h-4" />
              How role expiry works
            </div>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Seasonal roles (player, coach, manager, etc.) expire on 31 Dec of their season year.</li>
              <li>Expired roles are excluded from new login sessions — members lose access immediately on next sign-in.</li>
              <li>The database still holds the record with <code>active:true</code> until cleanup runs.</li>
              <li>Cron reminders fire automatically at 6-week and 2-week windows when enabled in the Communications Hub.</li>
              <li>Use <strong>Send Reminder</strong> to send an ad-hoc email to selected members now.</li>
              <li>Use <strong>Run Cleanup</strong> to mark all past-expired seasonal roles as inactive.</li>
            </ul>
          </section>
        </>
      )}

      {/* ── Modals ── */}
      {showCleanup && (
        <CleanupModal
          onClose={() => setShowCleanup(false)}
          onDone={() => { setShowCleanup(false); void load(); }}
        />
      )}

      {reminderResult && (
        <ReminderResultModal
          result={reminderResult}
          onClose={() => setReminderResult(null)}
        />
      )}
    </div>
  );
}
