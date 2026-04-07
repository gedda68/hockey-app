// app/admin/reports/page.tsx
// Filterable analytics reports — member/player breakdowns by scope, season,
// gender, age group, role, and club. Includes historic year-on-year trends.
// Access: REPORTING_ROLES (see menuConfig.ts)

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand } from "@/lib/contexts/BrandContext";
import {
  Users, TrendingUp, Shield, ChevronDown,
  Download, AlertCircle, Loader2, Building2,
  BarChart2, RefreshCw,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgeGroupRow {
  ageGroup: string;
  male: number;
  female: number;
  other: number;
  total: number;
}

interface ClubRow {
  name: string;
  total: number;
  active: number;
  players: number;
}

interface HistoricRow {
  season: number;
  totalMembers: number;
  players: number;
}

interface Analytics {
  scope: string;
  scopeId: string | null;
  season: string;
  totals: {
    totalMembers: number;
    activeMembers: number;
    players: number;
    umpires: number;
    technicalOfficials: number;
    coaches: number;
    admins: number;
  };
  entityCounts: { associations?: number; clubs?: number; teams?: number };
  byGender: Record<string, number>;
  byAgeGroup: AgeGroupRow[];
  byRole: Record<string, number>;
  byMonth: Record<string, number>;
  clubTable: ClubRow[];
  historic: HistoricRow[];
}

interface Association {
  associationId: string;
  name: string;
}

interface Club {
  id?: string;
  clubId?: string;
  name: string;
}

// ── Role sets ─────────────────────────────────────────────────────────────────

const CLUB_ROLES = new Set([
  "club-admin", "club-committee", "registrar", "coach",
  "manager", "team-selector", "volunteer", "umpire", "technical-official",
]);

const ASSOC_ROLES = new Set([
  "association-admin", "assoc-committee", "assoc-coach",
  "assoc-selector", "assoc-registrar", "media-marketing",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function seasonOptions(): number[] {
  const year = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => year - i);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-slate-500">{icon}</span>
      <h2 className="text-base font-black text-slate-700 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: number | string; sub?: string;
  icon: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-slate-400 tracking-wide truncate">{label}</p>
        <p className="text-3xl font-black text-[#06054e] mt-0.5 leading-none">
          {typeof value === "number" ? fmt(value) : value}
        </p>
        {sub && <p className="text-xs text-slate-400 font-bold mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function HBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const p = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-600">{label}</span>
        <span className="text-xs font-black text-slate-800">
          {fmt(value)} <span className="text-slate-400 font-normal">({p}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function Select({
  label, value, onChange, children, disabled,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-black uppercase text-slate-400 tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(data: Analytics, scopeLabel: string) {
  const rows: string[][] = [];

  rows.push(["Hockey Analytics Report"]);
  rows.push(["Scope", scopeLabel, "Season", data.season]);
  rows.push([]);

  rows.push(["Summary"]);
  rows.push(["Metric", "Value"]);
  rows.push(["Total Members",          String(data.totals.totalMembers)]);
  rows.push(["Active Members",         String(data.totals.activeMembers)]);
  rows.push(["Players",                String(data.totals.players)]);
  rows.push(["Umpires",                String(data.totals.umpires)]);
  rows.push(["Technical Officials",    String(data.totals.technicalOfficials)]);
  rows.push(["Coaches",                String(data.totals.coaches)]);
  rows.push([]);

  rows.push(["By Gender"]);
  rows.push(["Gender", "Count"]);
  Object.entries(data.byGender).forEach(([g, c]) => rows.push([g, String(c)]));
  rows.push([]);

  rows.push(["By Age Group (Active Players)"]);
  rows.push(["Age Group", "Male", "Female", "Other", "Total"]);
  data.byAgeGroup.forEach((r) =>
    rows.push([r.ageGroup, String(r.male), String(r.female), String(r.other), String(r.total)])
  );
  rows.push([]);

  rows.push(["By Role"]);
  rows.push(["Role", "Count"]);
  Object.entries(data.byRole).forEach(([r, c]) => rows.push([r, String(c)]));
  rows.push([]);

  if (data.clubTable.length > 0) {
    rows.push(["By Club"]);
    rows.push(["Club", "Total", "Active", "Players"]);
    data.clubTable.forEach((c) =>
      rows.push([c.name, String(c.total), String(c.active), String(c.players)])
    );
    rows.push([]);
  }

  if (data.historic.length > 0) {
    rows.push(["Historic Trends"]);
    rows.push(["Season", "Total Members", "Players"]);
    data.historic.forEach((h) =>
      rows.push([String(h.season), String(h.totalMembers), String(h.players)])
    );
  }

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${scopeLabel.replace(/\s+/g, "-").toLowerCase()}-${data.season}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const primaryColor = brand?.primaryColor ?? "#06054e";
  const secondaryColor = brand?.secondaryColor ?? "#1e3a8a";

  const role = user?.role ?? "";
  const isSuper   = role === "super-admin";
  const isAssoc   = ASSOC_ROLES.has(role);
  const isClub    = CLUB_ROLES.has(role);

  // Default scope based on user role
  const defaultScope: "global" | "association" | "club" =
    isSuper ? "global" : isAssoc ? "association" : "club";

  const [scope,         setScope]         = useState<"global" | "association" | "club">(defaultScope);
  const [season,        setSeason]        = useState<string>(String(new Date().getFullYear()));
  const [showHistoric,  setShowHistoric]  = useState(false);
  const [associationId, setAssociationId] = useState<string>(user?.associationId ?? "");
  const [clubId,        setClubId]        = useState<string>(user?.clubId ?? "");
  const [associations,  setAssociations]  = useState<Association[]>([]);
  const [clubs,         setClubs]         = useState<Club[]>([]);

  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch selector lists ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSuper) return;
    fetch("/api/admin/associations?limit=200")
      .then((r) => r.json())
      .then((d) => setAssociations(d.associations ?? []))
      .catch(() => {});
  }, [isSuper]);

  useEffect(() => {
    if (!isSuper && !isAssoc) return;
    const assocParam = isSuper && associationId ? `&associationId=${associationId}` : "";
    const myAssoc    = isAssoc ? `&associationId=${user?.associationId ?? ""}` : "";
    fetch(`/api/admin/clubs?limit=200${assocParam}${myAssoc}`)
      .then((r) => r.json())
      .then((d) => setClubs(d.clubs ?? []))
      .catch(() => {});
  }, [isSuper, isAssoc, associationId, user?.associationId]);

  // ── Fetch analytics ────────────────────────────────────────────────────────

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    setLoading(true);
    setError(null);

    let scopeId: string = "";
    if (scope === "association") scopeId = isSuper ? associationId : (user?.associationId ?? "");
    if (scope === "club")        scopeId = isSuper || isAssoc ? clubId : (user?.clubId ?? "");

    const params = new URLSearchParams({
      scope,
      season,
      historic: showHistoric ? "true" : "false",
    });
    if (scopeId) params.set("scopeId", scopeId);

    fetch(`/api/admin/analytics?${params.toString()}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [scope, season, showHistoric, associationId, clubId, isSuper, isAssoc, user]);

  // Fetch on filter change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Scope label ─────────────────────────────────────────────────────────────

  const scopeLabel = (() => {
    if (scope === "global") return "All Associations";
    if (scope === "association") {
      const name = associations.find((a) => a.associationId === associationId)?.name;
      return name ?? (isAssoc ? "My Association" : "Association");
    }
    const name = clubs.find((c) => (c.id ?? c.clubId) === clubId)?.name;
    return name ?? (isClub ? "My Club" : "Club");
  })();

  // ── Gender colours ──────────────────────────────────────────────────────────
  const genderColors: Record<string, string> = {
    Male:       "bg-blue-500",
    Female:     "bg-pink-500",
    "Non-binary": "bg-purple-500",
    Unknown:    "bg-slate-300",
  };

  // ── Role colours ────────────────────────────────────────────────────────────
  const roleColors: Record<string, string> = {
    Player:               "bg-emerald-500",
    Umpire:               "bg-amber-500",
    "Technical Official": "bg-orange-500",
    Coach:                "bg-cyan-500",
    Administrator:        "bg-violet-500",
    Member:               "bg-slate-400",
  };

  const totalActive = data?.totals.activeMembers ?? 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Member Analytics</h1>
              <p className="text-white/70 text-sm mt-1">
                Detailed reports — filter by scope, season, and more.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              {data && (
                <button
                  onClick={() => exportCsv(data, scopeLabel)}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-sm font-bold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end">

          {/* Scope */}
          <Select label="Scope" value={scope} onChange={(v) => setScope(v as typeof scope)}>
            {isSuper  && <option value="global">All Associations</option>}
            {(isSuper || isAssoc) && <option value="association">By Association</option>}
            <option value="club">By Club</option>
          </Select>

          {/* Association selector (super-admin only, when not global) */}
          {isSuper && scope !== "global" && (
            <Select
              label="Association"
              value={associationId}
              onChange={setAssociationId}
            >
              <option value="">— All —</option>
              {associations.map((a) => (
                <option key={a.associationId} value={a.associationId}>{a.name}</option>
              ))}
            </Select>
          )}

          {/* Club selector (super-admin or assoc-admin, when club scope) */}
          {(isSuper || isAssoc) && scope === "club" && (
            <Select
              label="Club"
              value={clubId}
              onChange={setClubId}
            >
              <option value="">— All clubs —</option>
              {clubs.map((c) => {
                const id = c.id ?? c.clubId ?? "";
                return <option key={id} value={id}>{c.name}</option>;
              })}
            </Select>
          )}

          {/* Season */}
          <Select label="Season" value={season} onChange={setSeason}>
            {seasonOptions().map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </Select>

          {/* Historic toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wide">Historic</label>
            <button
              onClick={() => setShowHistoric((v) => !v)}
              className={`rounded-xl px-4 py-2 text-sm font-bold border transition-colors ${
                showHistoric
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {showHistoric ? "Showing 5-yr" : "Show 5-yr trend"}
            </button>
          </div>

        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Failed to load analytics</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {data && (
        <div className={`space-y-6 ${loading ? "opacity-60 pointer-events-none" : ""} transition-opacity`}>

          {/* ── Summary stat cards ────────────────────────────────────────── */}
          <div>
            <SectionHeading icon={<Users className="w-4 h-4" />} title="Summary" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <StatCard label="Total Members"   value={data.totals.totalMembers}      icon="👤" color="bg-slate-100" />
              <StatCard label="Active Members"  value={data.totals.activeMembers}     icon="✅" color="bg-emerald-50" sub={pct(data.totals.activeMembers, data.totals.totalMembers) + " of total"} />
              <StatCard label="Players"         value={data.totals.players}           icon="🏑" color="bg-blue-50"    sub={pct(data.totals.players, data.totals.activeMembers) + " of active"} />
              <StatCard label="Umpires"         value={data.totals.umpires}           icon="🟡" color="bg-amber-50"   sub={pct(data.totals.umpires, data.totals.activeMembers) + " of active"} />
              <StatCard label="Tech Officials"  value={data.totals.technicalOfficials} icon="📋" color="bg-orange-50" sub={pct(data.totals.technicalOfficials, data.totals.activeMembers) + " of active"} />
              <StatCard label="Coaches"         value={data.totals.coaches}           icon="📣" color="bg-cyan-50"    sub={pct(data.totals.coaches, data.totals.activeMembers) + " of active"} />
              <StatCard label="Administrators"  value={data.totals.admins}            icon="🛡️" color="bg-violet-50"  sub={pct(data.totals.admins, data.totals.activeMembers) + " of active"} />
            </div>
          </div>

          {/* ── Entity counts ─────────────────────────────────────────────── */}
          {Object.keys(data.entityCounts).length > 0 && (
            <div>
              <SectionHeading icon={<Building2 className="w-4 h-4" />} title="Entities" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data.entityCounts.associations !== undefined && (
                  <StatCard label="Associations" value={data.entityCounts.associations} icon="🏛️" color="bg-indigo-50" />
                )}
                {data.entityCounts.clubs !== undefined && (
                  <StatCard label="Clubs" value={data.entityCounts.clubs} icon="🏒" color="bg-sky-50" />
                )}
                {data.entityCounts.teams !== undefined && (
                  <StatCard label="Teams" value={data.entityCounts.teams} icon="👥" color="bg-teal-50" />
                )}
              </div>
            </div>
          )}

          {/* ── Gender + Role breakdowns side-by-side ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gender */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <SectionHeading icon={<BarChart2 className="w-4 h-4" />} title="By Gender (Active)" />
              {Object.keys(data.byGender).length === 0
                ? <p className="text-slate-400 text-sm">No data for this scope.</p>
                : (
                  <div className="space-y-3">
                    {Object.entries(data.byGender)
                      .sort((a, b) => b[1] - a[1])
                      .map(([g, c]) => (
                        <HBar
                          key={g}
                          label={g}
                          value={c}
                          max={data.totals.activeMembers}
                          color={genderColors[g] ?? "bg-slate-400"}
                        />
                      ))}
                  </div>
                )}
            </div>

            {/* Role */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <SectionHeading icon={<Shield className="w-4 h-4" />} title="By Primary Role (Active)" />
              {Object.keys(data.byRole).length === 0
                ? <p className="text-slate-400 text-sm">No data for this scope.</p>
                : (
                  <div className="space-y-3">
                    {Object.entries(data.byRole)
                      .sort((a, b) => b[1] - a[1])
                      .map(([r, c]) => (
                        <HBar
                          key={r}
                          label={r}
                          value={c}
                          max={totalActive}
                          color={roleColors[r] ?? "bg-slate-400"}
                        />
                      ))}
                  </div>
                )}
            </div>
          </div>

          {/* ── Age group table ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 pb-3">
              <SectionHeading icon={<Users className="w-4 h-4" />} title="Age Group Breakdown (Active Players)" />
            </div>
            {data.byAgeGroup.length === 0
              ? <p className="text-slate-400 text-sm px-6 pb-6">No player data for this scope / season.</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-t border-slate-100">
                        <th className="text-left px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Age Group</th>
                        <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide text-blue-600">Male</th>
                        <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide text-pink-600">Female</th>
                        <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide text-purple-600">Other</th>
                        <th className="text-right px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Total</th>
                        <th className="text-right px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.byAgeGroup.map((row) => (
                        <tr key={row.ageGroup} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-700">{row.ageGroup}</td>
                          <td className="px-4 py-3 text-right text-blue-700 font-semibold">{fmt(row.male)}</td>
                          <td className="px-4 py-3 text-right text-pink-700 font-semibold">{fmt(row.female)}</td>
                          <td className="px-4 py-3 text-right text-purple-700 font-semibold">{fmt(row.other)}</td>
                          <td className="px-6 py-3 text-right font-black text-slate-800">{fmt(row.total)}</td>
                          <td className="px-6 py-3 text-right text-slate-400 text-xs">
                            {pct(row.total, data.totals.players)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="px-6 py-3 font-black text-slate-700 uppercase text-xs tracking-wide">Total</td>
                        <td className="px-4 py-3 text-right font-black text-blue-700">
                          {fmt(data.byAgeGroup.reduce((s, r) => s + r.male, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-pink-700">
                          {fmt(data.byAgeGroup.reduce((s, r) => s + r.female, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-purple-700">
                          {fmt(data.byAgeGroup.reduce((s, r) => s + r.other, 0))}
                        </td>
                        <td className="px-6 py-3 text-right font-black text-slate-900">
                          {fmt(data.totals.players)}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-400 text-xs">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
          </div>

          {/* ── Monthly registrations ─────────────────────────────────────── */}
          {Object.keys(data.byMonth).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <SectionHeading icon={<TrendingUp className="w-4 h-4" />} title={`Monthly Registrations (${season})`} />
              <div className="flex items-end gap-1.5 h-24 mt-2">
                {(() => {
                  const entries = Object.entries(data.byMonth).sort(([a], [b]) => a.localeCompare(b));
                  const maxVal  = Math.max(...entries.map(([, v]) => v), 1);
                  const months  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  return entries.map(([key, val]) => {
                    const mo = parseInt(key.split("-")[1], 10) - 1;
                    const h  = Math.max(4, Math.round((val / maxVal) * 88));
                    return (
                      <div key={key} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{ height: `${h}px`, background: primaryColor, opacity: 0.85 }}
                          title={`${months[mo]}: ${val}`}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">{months[mo]}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ── Club breakdown table ──────────────────────────────────────── */}
          {data.clubTable.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 pb-3">
                <SectionHeading icon={<Building2 className="w-4 h-4" />} title="Breakdown by Club" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <th className="text-left px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Club</th>
                      <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Total</th>
                      <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Active</th>
                      <th className="text-right px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Players</th>
                      <th className="px-6 py-3 w-40 font-black text-slate-500 uppercase text-xs tracking-wide">Active %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.clubTable.map((c, i) => (
                      <tr key={`${c.name}-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-bold text-slate-700">{c.name}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(c.active)}</td>
                        <td className="px-6 py-3 text-right text-emerald-700 font-bold">{fmt(c.players)}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: pct(c.active, c.total),
                                  background: primaryColor,
                                  opacity: 0.75,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-9 text-right shrink-0">
                              {pct(c.active, c.total)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Historic trend ────────────────────────────────────────────── */}
          {showHistoric && data.historic.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 pb-3">
                <SectionHeading icon={<TrendingUp className="w-4 h-4" />} title="5-Year Historic Trend" />
              </div>

              {/* Visual bar comparison */}
              <div className="px-6 pb-4">
                {(() => {
                  const maxVal = Math.max(...data.historic.map((h) => h.totalMembers), 1);
                  return (
                    <div className="space-y-3">
                      {data.historic.map((h) => (
                        <div key={h.season}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-slate-600">Season {h.season}</span>
                            <span className="text-xs font-black text-slate-800">
                              {fmt(h.totalMembers)} members &middot; {fmt(h.players)} players
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            {/* Total members bar */}
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: pct(h.totalMembers, maxVal),
                                  background: primaryColor,
                                  opacity: 0.85,
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-0.5">
                            {/* Players sub-bar */}
                            <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-emerald-500"
                                style={{ width: pct(h.players, maxVal) }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: primaryColor }} />
                    <span className="text-xs text-slate-500 font-bold">Total Members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-500 font-bold">Players</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Season</th>
                      <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">Total Members</th>
                      <th className="text-right px-4 py-3 font-black text-slate-500 uppercase text-xs tracking-wide text-emerald-600">Players</th>
                      <th className="text-right px-6 py-3 font-black text-slate-500 uppercase text-xs tracking-wide">YoY Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.historic.map((h, idx) => {
                      const prev = data.historic[idx - 1];
                      const delta = prev ? h.totalMembers - prev.totalMembers : null;
                      return (
                        <tr key={h.season} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-black text-slate-700">{h.season}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(h.totalMembers)}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-bold">{fmt(h.players)}</td>
                          <td className="px-6 py-3 text-right">
                            {delta === null ? (
                              <span className="text-slate-300 text-xs">—</span>
                            ) : (
                              <span className={`text-xs font-black ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-slate-400"}`}>
                                {delta > 0 ? "+" : ""}{fmt(delta)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showHistoric && data.historic.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-bold">No historic data available for this scope.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
