// app/admin/dashboard/page.tsx
// Role-aware dashboard — super-admin sees global scope, association-admin sees
// their association, club-admin/coach/registrar sees their club.
// All stats come from the real analytics API.

"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand } from "@/lib/contexts/BrandContext";
import { filterMenuForRole } from "@/app/(admin)/admin/global-config/menuConfig";
import {
  Users, Building2, TrendingUp, Shield, Trophy,
  AlertCircle, Loader2, ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Analytics {
  totals: {
    totalMembers:        number;
    activeMembers:       number;
    players:             number;
    umpires:             number;
    technicalOfficials:  number;
    coaches:             number;
    admins:              number;
  };
  entityCounts: { associations?: number; clubs?: number; teams?: number };
  byGender:    Record<string, number>;
  byAgeGroup:  { ageGroup: string; male: number; female: number; other: number; total: number }[];
  byRole:      Record<string, number>;
  byMonth:     Record<string, number>;
  clubTable:   { name: string; total: number; active: number; players: number }[];
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, sub, href, accent,
}: {
  label: string; value: number | string; icon: string;
  sub?: string; href?: string; accent?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent ?? "bg-slate-100"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-slate-400 tracking-wide truncate">{label}</p>
        <p className="text-3xl font-black text-[#06054e] mt-0.5 leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {sub && <p className="text-xs text-slate-400 font-bold mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-600">{label}</span>
        <span className="text-xs font-black text-slate-800">{value.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Quick access tile ─────────────────────────────────────────────────────────

function QuickTile({ item }: { item: { label: string; href: string; icon: string; description?: string; color?: string } }) {
  return (
    <Link
      href={item.href}
      className="group bg-white rounded-2xl shadow-sm border-2 border-slate-100 hover:border-[#06054e] p-5 flex items-start gap-4 transition-all hover:shadow-md"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${item.color ?? "from-slate-400 to-slate-500"}`}>
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-sm text-[#06054e] group-hover:text-yellow-600 transition-colors">{item.label}</p>
        {item.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>}
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-[#06054e] transition-colors mt-0.5 flex-shrink-0" />
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }  = useAuth();
  const { brand } = useBrand();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [season] = useState(new Date().getFullYear().toString());

  // Determine scope from the user's role
  const CLUB_ROLES  = ["club-admin","club-committee","registrar","coach","manager","team-selector","volunteer","umpire","technical-official"];
  const ASSOC_ROLES = ["association-admin","assoc-committee","assoc-coach","assoc-selector","assoc-registrar","media-marketing"];
  const isClub      = CLUB_ROLES.includes(user?.role  ?? "");
  const isAssoc     = ASSOC_ROLES.includes(user?.role ?? "");
  const isSuperAdmin= user?.role === "super-admin";

  const scope   = isClub ? "club" : isAssoc ? "association" : "global";
  const scopeId = isClub ? (user?.clubId ?? null) : isAssoc ? (user?.associationId ?? null) : null;
  const scopeLabel = isClub
    ? (brand?.name ?? user?.clubName ?? "Club")
    : isAssoc
    ? (brand?.name ?? "Association")
    : "Global";

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ scope, season });
      if (scopeId) params.set("scopeId", scopeId);
      const res  = await fetch(`/api/admin/analytics?${params}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      setAnalytics(await res.json());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, season]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Role-filtered quick-access tiles
  const quickTiles = user
    ? filterMenuForRole(user.role).filter(i => i.color && i.href !== "/admin/dashboard")
    : [];

  const totals = analytics?.totals;
  const ec     = analytics?.entityCounts ?? {};

  const primary   = brand?.primaryColor   ?? "#06054e";
  const secondary = brand?.secondaryColor ?? "#1a1870";
  const headerBg  = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Brand banner */}
      <div className="text-white px-8 py-8 shadow-lg" style={{ background: headerBg }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/70 text-sm font-bold uppercase tracking-widest">
                {scopeLabel} Dashboard
              </p>
              <h1 className="text-3xl font-black mt-1">
                {brand?.name ?? "Hockey Admin"}
              </h1>
              <p className="text-white/60 text-sm mt-1">
                {new Date().toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                {" · "}{season} Season
              </p>
            </div>
            <Link
              href="/admin/reports"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all"
            >
              <TrendingUp size={16} />
              Full Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-700 font-bold text-sm">{error}</p>
            <button onClick={fetchAnalytics} className="ml-auto text-red-600 font-bold text-sm hover:underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#06054e]" size={40} />
          </div>
        ) : (
          <>
            {/* ── Entity counts (associations/clubs/teams) ───────────────── */}
            {(isSuperAdmin || isAssoc) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isSuperAdmin && ec.associations !== undefined && (
                  <StatCard label="Associations" value={ec.associations} icon="🏛️" href="/admin/associations" accent="bg-violet-100" />
                )}
                {ec.clubs !== undefined && (
                  <StatCard label="Clubs" value={ec.clubs} icon="🏢" href="/admin/clubs" accent="bg-blue-100" />
                )}
                {ec.teams !== undefined && (
                  <StatCard label="Teams" value={ec.teams} icon="👥" href="/admin/teams" accent="bg-green-100" />
                )}
              </div>
            )}

            {/* ── Core member stats ─────────────────────────────────────── */}
            <div>
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Members · {season} Season</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Total Members"  value={totals?.totalMembers  ?? 0} icon="👤" href="/admin/members"  accent="bg-slate-100"  />
                <StatCard label="Active Members" value={totals?.activeMembers ?? 0} icon="✅" accent="bg-green-100"  />
                <StatCard label="Players"        value={totals?.players       ?? 0} icon="⭐" href="/admin/players"  accent="bg-yellow-100" />
                <StatCard label="Umpires"        value={totals?.umpires       ?? 0} icon="🏑" accent="bg-orange-100" />
                <StatCard label="Tech Officials" value={totals?.technicalOfficials ?? 0} icon="📋" accent="bg-red-100" />
                <StatCard label="Coaches"        value={totals?.coaches       ?? 0} icon="🎓" accent="bg-teal-100"   />
              </div>
            </div>

            {/* ── Gender + Age group + Role breakdowns ──────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Gender */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                  <Users size={14} />
                  By Gender
                </h3>
                {analytics && Object.keys(analytics.byGender).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.byGender)
                      .sort((a, b) => b[1] - a[1])
                      .map(([gender, count]) => (
                        <MiniBar
                          key={gender}
                          label={gender}
                          value={count}
                          max={totals?.activeMembers ?? 1}
                          color={gender === "Male" ? "bg-blue-400" : gender === "Female" ? "bg-pink-400" : "bg-purple-400"}
                        />
                      ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No data</p>
                )}
              </div>

              {/* Role */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                  <Shield size={14} />
                  By Primary Role
                </h3>
                {analytics && Object.keys(analytics.byRole).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.byRole)
                      .sort((a, b) => b[1] - a[1])
                      .map(([role, count]) => (
                        <MiniBar
                          key={role}
                          label={role}
                          value={count}
                          max={totals?.activeMembers ?? 1}
                          color="bg-indigo-400"
                        />
                      ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No data</p>
                )}
              </div>

              {/* Top clubs (assoc/global scope) or age groups (club scope) */}
              {isClub ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-sm font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                    <Trophy size={14} />
                    By Age Group
                  </h3>
                  {analytics?.byAgeGroup && analytics.byAgeGroup.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.byAgeGroup.slice(0, 8).map(ag => (
                        <div key={ag.ageGroup} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{ag.ageGroup}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-500 font-bold">{ag.male}M</span>
                            <span className="text-pink-500 font-bold">{ag.female}F</span>
                            <span className="font-black text-slate-800">{ag.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No data</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                      <Building2 size={14} />
                      Top Clubs
                    </h3>
                    <Link href="/admin/reports?scope=club" className="text-xs text-[#06054e] font-bold hover:underline">
                      All →
                    </Link>
                  </div>
                  {analytics?.clubTable && analytics.clubTable.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.clubTable.slice(0, 6).map(club => (
                        <div key={club.name} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 truncate max-w-[140px]">{club.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-slate-500">{club.players} players</span>
                            <span className="font-black text-slate-800">{club.active}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No data</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Age group breakdown (assoc + global views) ────────────── */}
            {!isClub && analytics?.byAgeGroup && analytics.byAgeGroup.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                    <Trophy size={14} />
                    Player Breakdown by Age Group · {season}
                  </h3>
                  <Link href="/admin/reports" className="text-xs text-[#06054e] font-bold hover:underline">
                    Full report →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-100">
                        <th className="text-left py-2 px-3 text-xs font-black uppercase text-slate-400">Age Group</th>
                        <th className="text-center py-2 px-3 text-xs font-black uppercase text-blue-400">Male</th>
                        <th className="text-center py-2 px-3 text-xs font-black uppercase text-pink-400">Female</th>
                        <th className="text-center py-2 px-3 text-xs font-black uppercase text-slate-400">Other</th>
                        <th className="text-right py-2 px-3 text-xs font-black uppercase text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {analytics.byAgeGroup.map(ag => (
                        <tr key={ag.ageGroup} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-700">{ag.ageGroup}</td>
                          <td className="py-2 px-3 text-center font-bold text-blue-600">{ag.male}</td>
                          <td className="py-2 px-3 text-center font-bold text-pink-600">{ag.female}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{ag.other}</td>
                          <td className="py-2 px-3 text-right font-black text-slate-800">{ag.total}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="py-2 px-3 font-black text-slate-800">Total</td>
                        <td className="py-2 px-3 text-center font-black text-blue-700">
                          {analytics.byAgeGroup.reduce((s, r) => s + r.male, 0)}
                        </td>
                        <td className="py-2 px-3 text-center font-black text-pink-700">
                          {analytics.byAgeGroup.reduce((s, r) => s + r.female, 0)}
                        </td>
                        <td className="py-2 px-3 text-center font-black text-slate-600">
                          {analytics.byAgeGroup.reduce((s, r) => s + r.other, 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">
                          {totals?.players ?? 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Quick access tiles ─────────────────────────────────────── */}
            <div>
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Quick Access</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {quickTiles.map(item => (
                  <QuickTile key={item.href} item={item} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
