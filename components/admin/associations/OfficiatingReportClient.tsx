"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

type ReportPayload = {
  associationId: string;
  seasonCompetitionId: string | null;
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
  paymentLinesByStatus: Record<string, number>;
  topUmpiresByFixtureCoverage: Array<{
    umpireId: string;
    displayName: string;
    fixturesCovered: number;
  }>;
  activeOfficialRegisterCount: number;
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

  const loadReport = useCallback(() => {
    startTransition(async () => {
      const q = seasonCompetitionId
        ? `?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`
        : "";
      const res = await fetch(
        `/api/admin/associations/${associationId}/officiating-report${q}`,
      );
      if (!res.ok) {
        toast.error("Could not load report");
        return;
      }
      setData(await res.json());
    });
  }, [associationId, seasonCompetitionId]);

  useEffect(() => {
    void loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

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
      </div>

      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-black text-[#06054e]">Coverage</h3>
            <ul className="space-y-2 text-sm font-bold text-slate-700">
              <li>Fixtures in scope: {data.fixtureCount}</li>
              <li>Umpire slots total: {data.appointmentSlots.total}</li>
              <li>
                Allocation: assigned {data.appointmentSlots.allocationStatus.assigned},
                accepted {data.appointmentSlots.allocationStatus.accepted}, declined{" "}
                {data.appointmentSlots.allocationStatus.declined}
              </li>
              <li>
                Active officials in register: {data.activeOfficialRegisterCount}
              </li>
            </ul>
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
