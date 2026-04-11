"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

type ReportPayload = {
  associationId: string;
  seasonCompetitionId: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  fixtureCount: number;
  appointmentSlots: {
    total: number;
    allocationStatus: {
      assigned: number;
      accepted: number;
      declined: number;
      unspecified: number;
    };
  };
  allocationStatusFractions?: {
    assigned: number;
    accepted: number;
    declined: number;
    unspecified: number;
  };
  paymentLinesByStatus: Record<string, number>;
  topUmpiresByFixtureCoverage: Array<{
    umpireId: string;
    displayName: string;
    fixturesCovered: number;
  }>;
  activeOfficialRegisterCount: number;
  byClub?: Array<{ clubId: string; clubName: string; slotTouches: number }>;
  byRegion?: Array<{ region: string; slotCount: number }>;
};

type SeasonComp = {
  seasonCompetitionId: string;
  season?: string | number;
  status?: string;
};

export default function OfficiatingReportClient({
  associationId,
  primaryColor = "#06054e",
}: {
  associationId: string;
  primaryColor?: string;
}) {
  const [seasonComps, setSeasonComps] = useState<SeasonComp[]>([]);
  const [seasonCompetitionId, setSeasonCompetitionId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<ReportPayload | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSeasons = useCallback(async () => {
    const res = await fetch(
      `/api/admin/associations/${associationId}/season-competitions`,
    );
    if (!res.ok) return;
    const j = await res.json();
    const list = j.seasonCompetitions ?? [];
    setSeasonComps(list);
  }, [associationId]);

  const reportQueryString = useCallback(() => {
    const p = new URLSearchParams();
    if (seasonCompetitionId)
      p.set("seasonCompetitionId", seasonCompetitionId);
    if (dateFrom.trim()) p.set("dateFrom", dateFrom.trim());
    if (dateTo.trim()) p.set("dateTo", dateTo.trim());
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [seasonCompetitionId, dateFrom, dateTo]);

  const loadReport = useCallback(() => {
    startTransition(async () => {
      const q = reportQueryString();
      const res = await fetch(
        `/api/admin/associations/${associationId}/officiating-report${q}`,
      );
      if (!res.ok) {
        toast.error("Could not load report");
        return;
      }
      setData(await res.json());
    });
  }, [associationId, reportQueryString]);

  useEffect(() => {
    void loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const q = reportQueryString();
  const csvHref = `/api/admin/associations/${associationId}/officiating-report${q ? `${q}&` : "?"}format=csv`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-xs font-black uppercase text-slate-500">
          Filter by season competition
          <select
            className="input mt-1 block min-w-[240px] font-bold"
            value={seasonCompetitionId}
            onChange={(e) => setSeasonCompetitionId(e.target.value)}
          >
            <option value="">All seasons</option>
            {seasonComps.map((sc) => (
              <option key={sc.seasonCompetitionId} value={sc.seasonCompetitionId}>
                {String(sc.season ?? "")} · {sc.seasonCompetitionId}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-black uppercase text-slate-500">
          From (scheduled start)
          <input
            type="date"
            className="input mt-1 block font-mono text-sm font-bold"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-xs font-black uppercase text-slate-500">
          To
          <input
            type="date"
            className="input mt-1 block font-mono text-sm font-bold"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
          disabled={isPending}
          onClick={loadReport}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        <a
          href={csvHref}
          className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-[#06054e]"
        >
          Download CSV
        </a>
      </div>

      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-black text-[#06054e]">Coverage</h3>
            <ul className="space-y-2 text-sm font-bold text-slate-700">
              <li>Fixtures in scope: {data.fixtureCount}</li>
              <li>Umpire slots total: {data.appointmentSlots.total}</li>
              {(data.dateFrom || data.dateTo) && (
                <li className="text-slate-500">
                  Date filter: {data.dateFrom ?? "…"} → {data.dateTo ?? "…"} (scheduled
                  start)
                </li>
              )}
              <li>
                Allocation: assigned {data.appointmentSlots.allocationStatus.assigned},
                accepted {data.appointmentSlots.allocationStatus.accepted}, declined{" "}
                {data.appointmentSlots.allocationStatus.declined}
              </li>
              <li>
                Active officials in register: {data.activeOfficialRegisterCount}
              </li>
            </ul>
            {data.allocationStatusFractions &&
              data.appointmentSlots.total > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-black uppercase text-slate-500">
                    Allocation mix (non-standby slots use region/club breakdown below)
                  </p>
                  <div className="flex h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                    {(
                      [
                        ["assigned", "#64748b"],
                        ["accepted", "#059669"],
                        ["declined", "#dc2626"],
                        ["unspecified", "#94a3b8"],
                      ] as const
                    ).map(([key, color]) => {
                      const frac =
                        data.allocationStatusFractions![
                          key as keyof typeof data.allocationStatusFractions
                        ] ?? 0;
                      if (frac <= 0) return null;
                      return (
                        <div
                          key={key}
                          title={`${key}: ${(frac * 100).toFixed(0)}%`}
                          className="h-full min-w-[6px] transition-all"
                          style={{
                            flex: `${Math.max(frac, 0.001)} 1 0%`,
                            backgroundColor: color,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-black text-[#06054e]">
              Honoraria lines
            </h3>
            <ul className="space-y-2 text-sm font-bold text-slate-700">
              {Object.keys(data.paymentLinesByStatus).length === 0 && (
                <li className="text-slate-500">No payment lines in scope.</li>
              )}
              {Object.entries(data.paymentLinesByStatus).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {data && (data.byClub?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#06054e]">
            Involved clubs (slot touches)
          </h3>
          <p className="mb-3 text-xs font-bold text-slate-500">
            Each non-standby appointment increments both home and away club for that
            fixture.
          </p>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-slate-100 font-black uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Club</th>
                  <th className="px-3 py-2 text-right">Touches</th>
                </tr>
              </thead>
              <tbody>
                {(data.byClub ?? []).map((c) => (
                  <tr key={c.clubId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold">{c.clubName}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {c.slotTouches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (data.byRegion?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#06054e]">
            By official home region (register)
          </h3>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-slate-100 font-black uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Region</th>
                  <th className="px-3 py-2 text-right">Non-standby slots</th>
                </tr>
              </thead>
              <tbody>
                {(data.byRegion ?? []).map((r) => (
                  <tr key={r.region} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold">{r.region}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.slotCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.topUmpiresByFixtureCoverage.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#06054e]">
            Umpires by fixture coverage (top 25)
          </h3>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-slate-100 font-black uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Umpire id</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">Fixtures</th>
                </tr>
              </thead>
              <tbody>
                {data.topUmpiresByFixtureCoverage.map((u) => (
                  <tr key={u.umpireId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{u.umpireId}</td>
                    <td className="px-3 py-2 font-bold">
                      {u.displayName || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {u.fixturesCovered}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm font-bold text-slate-500">
        <Link
          href={`/admin/associations/${associationId}/official-register`}
          className="mr-4 text-[#06054e] underline"
        >
          Official register
        </Link>
        <Link
          href={`/admin/associations/${associationId}/umpire-payments`}
          className="text-[#06054e] underline"
        >
          Umpire honoraria
        </Link>
      </p>
    </div>
  );
}
