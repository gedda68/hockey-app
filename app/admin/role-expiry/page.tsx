"use client";

/**
 * /admin/role-expiry
 *
 * Admin dashboard for role expiry management.
 *
 * Shows:
 *   - Roles expiring within the warning window (configurable, default 60 days)
 *   - Roles already expired but still marked active:true in the database
 *   - "Run Cleanup" button — marks all expired seasonal roles as active:false
 *   - Dry-run preview before committing
 *
 * Visible to: super-admin, association-admin, club-admin, registrar, assoc-registrar
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { RoleExpirySummary } from "@/app/api/admin/roles/expiring/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "today";
  return `in ${days}d`;
}

// ── Expiry row ────────────────────────────────────────────────────────────────

function ExpiryRow({ row, variant }: { row: RoleExpirySummary; variant: "expiring" | "expired" }) {
  const urgency =
    variant === "expired"
      ? "bg-red-50 border-red-200"
      : row.daysUntilExpiry <= 14
      ? "bg-orange-50 border-orange-200"
      : "bg-amber-50 border-amber-200";

  const dayColor =
    variant === "expired"
      ? "text-red-600"
      : row.daysUntilExpiry <= 14
      ? "text-orange-600"
      : "text-amber-600";

  return (
    <div className={`flex items-center gap-4 px-4 py-3 border rounded-lg ${urgency}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {row.memberName}
          {row.email && <span className="font-normal text-gray-500 ml-1 text-xs">({row.email})</span>}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          <span className="font-medium">{row.roleLabel}</span>
          {row.scopeName && <span> · {row.scopeName}</span>}
          {row.seasonYear && <span> · {row.seasonYear} season</span>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${dayColor}`}>{daysLabel(row.daysUntilExpiry)}</p>
        <p className="text-xs text-gray-400">{formatDate(row.expiresAt)}</p>
      </div>
    </div>
  );
}

// ── Cleanup preview modal ─────────────────────────────────────────────────────

interface CleanupResult {
  deactivated: number;
  details: { memberId: string; memberName: string; role: string; scopeName?: string; expiresAt: string }[];
}

function CleanupModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<CleanupResult | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Auto-load dry run on open
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
      const res = await fetch("/api/admin/roles/expire", {
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
                  ? `${preview.deactivated} role${preview.deactivated !== 1 ? "s" : ""} have been deactivated.`
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

        {!done && (
          <div className="p-5 border-t flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
            >
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
        )}
        {done && (
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoleExpiryPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [expiringSoon, setExpiringSoon] = useState<RoleExpirySummary[]>([]);
  const [expired, setExpired] = useState<RoleExpirySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [warnDays, setWarnDays] = useState(60);
  const [showCleanup, setShowCleanup] = useState(false);

  const isSuperOrAssocAdmin = user?.role === "super-admin" || user?.role === "association-admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/expiring?days=${warnDays}`);
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
    if (!authLoading) load();
  }, [authLoading, load]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Expiry</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Seasonal roles expiring soon or already expired — review and clean up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{expired.length}</p>
            <p className="text-xs text-gray-500">Expired (active)</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p>
            <p className="text-xs text-gray-500">Expiring within {warnDays}d</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-700">{expired.length + expiringSoon.length}</p>
            <p className="text-xs text-gray-500">Needs attention</p>
          </div>
        </div>
      )}

      {/* Warning window control */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-600 font-medium">Show expiring within:</span>
        {[30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setWarnDays(d)}
            className={`px-3 py-1 rounded-lg border font-medium transition ${
              warnDays === d
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* Expired roles */}
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
              <div className="space-y-2">
                {expired.map((r, i) => (
                  <ExpiryRow key={`exp-${i}`} row={r} variant="expired" />
                ))}
                {isSuperOrAssocAdmin && (
                  <p className="text-xs text-gray-400 pt-1 text-center">
                    These roles are already excluded from sessions at login. Run Cleanup to mark them inactive in the database.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Expiring soon */}
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
              <div className="space-y-2">
                {expiringSoon.map((r, i) => (
                  <ExpiryRow key={`soon-${i}`} row={r} variant="expiring" />
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-800">
                  <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Members with expiring roles will see renewal prompts on their My Registrations page.
                    They can submit a new request before their current role expires.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* How it works */}
          <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shield className="w-4 h-4" />
              How role expiry works
            </div>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Seasonal roles (player, coach, manager, etc.) expire on 31 Dec of their season year.</li>
              <li>Expired roles are automatically excluded from new login sessions — members lose access immediately.</li>
              <li>The database still holds the expired record with <code>active:true</code> until cleanup runs.</li>
              <li>Members see renewal prompts on their My Registrations page starting {warnDays} days before expiry.</li>
              <li>Run Cleanup to set <code>active:false</code> on all expired seasonal roles in the database.</li>
            </ul>
          </section>
        </>
      )}

      {showCleanup && (
        <CleanupModal
          onClose={() => setShowCleanup(false)}
          onDone={() => { setShowCleanup(false); load(); }}
        />
      )}
    </div>
  );
}
