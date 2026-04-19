"use client";

/**
 * N3 — Fixture operations console: filters, bulk publish, CSV export,
 * deep links to match events / result APIs (same permissions as underlying routes).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calendar,
  CheckSquare,
  Download,
  Loader2,
  Square,
  ExternalLink,
  Wrench,
} from "lucide-react";

type SeasonOption = {
  seasonCompetitionId: string;
  season: string;
  status: string;
};

type TeamRow = {
  teamId: string;
  name: string;
  clubId: string;
  clubName: string;
};

type LeagueFixtureRow = {
  fixtureId: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  venueName?: string | null;
  addressLine?: string | null;
  scheduledStart?: string | null;
  published?: boolean;
  status?: string;
  result?: {
    homeScore?: number | null;
    awayScore?: number | null;
    resultType?: string;
  } | null;
  resultStatus?: string | null;
};

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" });
}

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function FixtureOperationsConsole({
  associationId,
  associationName,
  primaryColor = "#06054e",
  initialSeasonCompetitionId = null,
}: {
  associationId: string;
  associationName: string;
  primaryColor?: string;
  initialSeasonCompetitionId?: string | null;
}) {
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([]);
  const [seasonCompetitionId, setSeasonCompetitionId] = useState("");
  const [seasonMeta, setSeasonMeta] = useState<{
    displayName?: string | null;
    competitionName?: string | null;
    resultApprovalRequired?: boolean;
  } | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [fixtures, setFixtures] = useState<LeagueFixtureRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [roundFilter, setRoundFilter] = useState<string>(""); // "" = all
  const [clubFilter, setClubFilter] = useState<string>(""); // clubId or ""
  const [venueQ, setVenueQ] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // yyyy-mm-dd local
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scoreDraft, setScoreDraft] = useState<Record<string, { h: string; a: string }>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const teamById = useMemo(() => {
    const m = new Map<string, TeamRow>();
    for (const t of teams) m.set(t.teamId, t);
    return m;
  }, [teams]);

  const teamLabel = useCallback(
    (id: string) => teamById.get(id)?.name ?? id,
    [teamById],
  );

  const clubOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) {
      if (t.clubId) m.set(t.clubId, t.clubName || t.clubId);
    }
    return [...m.entries()]
      .map(([clubId, clubName]) => ({ clubId, clubName }))
      .sort((a, b) => a.clubName.localeCompare(b.clubName, undefined, { sensitivity: "base" }));
  }, [teams]);

  const filteredFixtures = useMemo(() => {
    const rq = roundFilter.trim();
    const roundN = rq === "" ? null : parseInt(rq, 10);
    const vq = venueQ.trim().toLowerCase();
    const cf = clubFilter.trim();

    const inDateWindow = (iso: string | null | undefined) => {
      if (!dateFrom && !dateTo) return true;
      if (!iso) return !dateFrom && !dateTo;
      const day = iso.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    };

    return fixtures.filter((f) => {
      if (roundN != null && !Number.isNaN(roundN) && Number(f.round) !== roundN) return false;
      if (cf) {
        const hc = teamById.get(f.homeTeamId)?.clubId;
        const ac = teamById.get(f.awayTeamId)?.clubId;
        if (hc !== cf && ac !== cf) return false;
      }
      if (vq) {
        const vn = (f.venueName ?? "").toLowerCase();
        const al = (f.addressLine ?? "").toLowerCase();
        if (!vn.includes(vq) && !al.includes(vq)) return false;
      }
      if (!inDateWindow(f.scheduledStart ?? null)) return false;
      return true;
    });
  }, [fixtures, roundFilter, clubFilter, venueQ, dateFrom, dateTo, teamById]);

  const filteredIds = useMemo(
    () => new Set(filteredFixtures.map((f) => f.fixtureId)),
    [filteredFixtures],
  );

  const allFilteredSelected =
    filteredFixtures.length > 0 &&
    filteredFixtures.every((f) => selected.has(f.fixtureId));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/associations/${encodeURIComponent(associationId)}/season-competitions`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load seasons");
        const list = (data.seasonCompetitions ?? []) as SeasonOption[];
        if (!cancelled) setSeasonOptions(list);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [associationId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/associations/${encodeURIComponent(associationId)}/league-builder-teams`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load teams");
        const list = (data.teams ?? []) as TeamRow[];
        if (!cancelled) setTeams(list);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [associationId]);

  const appliedInitialSeason = useRef(false);
  useEffect(() => {
    appliedInitialSeason.current = false;
  }, [initialSeasonCompetitionId]);

  useEffect(() => {
    if (appliedInitialSeason.current) return;
    const want = initialSeasonCompetitionId?.trim();
    if (!want || !seasonOptions.some((s) => s.seasonCompetitionId === want)) return;
    setSeasonCompetitionId(want);
    appliedInitialSeason.current = true;
  }, [seasonOptions, initialSeasonCompetitionId]);

  const loadSeasonAndFixtures = useCallback(async (scId: string) => {
    if (!scId) {
      setFixtures([]);
      setSeasonMeta(null);
      return;
    }
    setLoadingList(true);
    try {
      const [scRes, fxRes] = await Promise.all([
        fetch(`/api/admin/season-competitions/${encodeURIComponent(scId)}`, {
          credentials: "include",
        }),
        fetch(`/api/admin/season-competitions/${encodeURIComponent(scId)}/fixtures`, {
          credentials: "include",
        }),
      ]);
      const scJson = await scRes.json();
      if (!scRes.ok) throw new Error(scJson.error || "Season load failed");
      setSeasonMeta({
        displayName: scJson.displayName ?? null,
        competitionName: scJson.competitionName ?? null,
        resultApprovalRequired: Boolean(scJson.resultApprovalRequired),
      });

      const fxJson = await fxRes.json();
      if (!fxRes.ok) throw new Error(fxJson.error || "Fixtures load failed");
      const list = (fxJson.fixtures ?? []) as LeagueFixtureRow[];
      setFixtures(list);
      setSelected(new Set());
      const nextDraft: Record<string, { h: string; a: string }> = {};
      for (const f of list) {
        const hs = f.result?.homeScore;
        const as = f.result?.awayScore;
        nextDraft[f.fixtureId] = {
          h: hs == null ? "" : String(hs),
          a: as == null ? "" : String(as),
        };
      }
      setScoreDraft(nextDraft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setFixtures([]);
      setSeasonMeta(null);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSeasonAndFixtures(seasonCompetitionId);
  }, [seasonCompetitionId, loadSeasonAndFixtures]);

  const toggleOne = (fixtureId: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(fixtureId);
      else n.delete(fixtureId);
      return n;
    });
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const id of filteredIds) n.delete(id);
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const id of filteredIds) n.add(id);
        return n;
      });
    }
  };

  const patchPublishedBulk = async (published: boolean) => {
    const ids = [...selected].filter((id) => filteredIds.has(id));
    if (!seasonCompetitionId || ids.length === 0) {
      toast.message("Select at least one fixture in the current filter.");
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const fixtureId of ids) {
        try {
          const res = await fetch(
            `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/${encodeURIComponent(fixtureId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ published }),
            },
          );
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(typeof j.error === "string" ? j.error : "PATCH failed");
          }
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success(`Updated ${ok} fixture(s)${fail ? `, ${fail} failed` : ""}.`);
      await loadSeasonAndFixtures(seasonCompetitionId);
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = () => {
    const rows = filteredFixtures;
    if (!rows.length) {
      toast.message("No rows to export for the current filters.");
      return;
    }
    const header = [
      "fixtureId",
      "round",
      "scheduledStart",
      "venueName",
      "addressLine",
      "homeTeamId",
      "awayTeamId",
      "homeTeamName",
      "awayTeamName",
      "published",
      "status",
      "homeScore",
      "awayScore",
      "resultStatus",
    ];
    const lines = [header.join(",")];
    for (const f of rows) {
      lines.push(
        [
          csvEscape(f.fixtureId),
          String(f.round),
          csvEscape(f.scheduledStart ?? ""),
          csvEscape(f.venueName ?? ""),
          csvEscape(f.addressLine ?? ""),
          csvEscape(f.homeTeamId),
          csvEscape(f.awayTeamId),
          csvEscape(teamLabel(f.homeTeamId)),
          csvEscape(teamLabel(f.awayTeamId)),
          f.published ? "true" : "false",
          csvEscape(f.status ?? ""),
          f.result?.homeScore == null ? "" : String(f.result.homeScore),
          f.result?.awayScore == null ? "" : String(f.result.awayScore),
          csvEscape(f.resultStatus ?? ""),
        ].join(","),
      );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixtures-${seasonCompetitionId || "season"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded.");
  };

  const saveResult = async (f: LeagueFixtureRow) => {
    if (!seasonCompetitionId) return;
    const d = scoreDraft[f.fixtureId] ?? { h: "", a: "" };
    const homeScore = parseInt(d.h, 10);
    const awayScore = parseInt(d.a, 10);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      toast.error("Enter numeric scores.");
      return;
    }
    setRowBusy(f.fixtureId);
    try {
      const res = await fetch(
        `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/${encodeURIComponent(f.fixtureId)}/result`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            result: {
              resultType: "normal",
              homeScore,
              awayScore,
            },
            setMatchStatusCompleted: true,
          }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      toast.success(
        seasonMeta?.resultApprovalRequired
          ? "Result submitted for approval."
          : "Result saved.",
      );
      await loadSeasonAndFixtures(seasonCompetitionId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRowBusy(null);
    }
  };

  const approveResult = async (f: LeagueFixtureRow) => {
    if (!seasonCompetitionId) return;
    setRowBusy(f.fixtureId);
    try {
      const res = await fetch(
        `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/${encodeURIComponent(f.fixtureId)}/result`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            result: {},
            status: "approved",
            setMatchStatusCompleted: true,
          }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Approve failed");
      toast.success("Result approved.");
      await loadSeasonAndFixtures(seasonCompetitionId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRowBusy(null);
    }
  };

  const seasonTitle =
    seasonMeta?.displayName?.trim() ||
    seasonMeta?.competitionName?.trim() ||
    (seasonCompetitionId ? seasonCompetitionId.slice(0, 14) + "…" : "");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div
              className="rounded-xl p-3 text-white shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#06054e]">Fixture operations</h1>
              <p className="text-sm font-bold text-slate-600 mt-1">
                {associationName} — filter the draw, bulk-publish fixtures, export CSV, and jump to
                match events or score entry. Schedules can still be edited in{" "}
                <Link
                  href={`/admin/associations/${associationId}/competitions`}
                  className="text-[#06054e] underline font-black"
                >
                  League setup
                </Link>
                .
              </p>
              {seasonMeta?.resultApprovalRequired ? (
                <p className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 max-w-2xl">
                  This season requires <span className="font-mono">results.approve</span> before
                  scores show publicly. Use <strong>Save scores</strong> then{" "}
                  <strong>Approve</strong> where shown.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Season competition
            <select
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 font-bold"
              value={seasonCompetitionId}
              onChange={(e) => setSeasonCompetitionId(e.target.value)}
            >
              <option value="">Select…</option>
              {seasonOptions.map((s) => (
                <option key={s.seasonCompetitionId} value={s.seasonCompetitionId}>
                  {String(s.season)} · {s.status} · {s.seasonCompetitionId.slice(0, 10)}…
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm font-bold text-slate-600 flex items-end">
            {seasonCompetitionId ? (
              <span>
                Active: <span className="text-slate-900">{seasonTitle}</span>
              </span>
            ) : (
              <span className="text-slate-400">Choose a season to load fixtures.</span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <label className="block text-xs font-black uppercase text-slate-500">
            Round
            <select
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-bold"
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
            >
              <option value="">All rounds</option>
              {Array.from(new Set(fixtures.map((f) => Number(f.round) || 0)))
                .sort((a, b) => a - b)
                .map((r) => (
                  <option key={r} value={String(r)}>
                    Round {r}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-xs font-black uppercase text-slate-500">
            Club (home or away)
            <select
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-bold"
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
            >
              <option value="">All clubs</option>
              {clubOptions.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.clubName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black uppercase text-slate-500">
            Venue contains
            <input
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-bold"
              value={venueQ}
              onChange={(e) => setVenueQ(e.target.value)}
              placeholder="Field name…"
            />
          </label>
          <label className="block text-xs font-black uppercase text-slate-500">
            From date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-bold font-mono"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="block text-xs font-black uppercase text-slate-500">
            To date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-bold font-mono"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!seasonCompetitionId || bulkBusy || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-40"
            style={{ backgroundColor: primaryColor }}
            onClick={() => void patchPublishedBulk(true)}
          >
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publish selected
          </button>
          <button
            type="button"
            disabled={!seasonCompetitionId || bulkBusy || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-black text-slate-800 disabled:opacity-40"
            onClick={() => void patchPublishedBulk(false)}
          >
            Unpublish selected
          </button>
          <button
            type="button"
            disabled={!filteredFixtures.length}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-black text-slate-800 disabled:opacity-40"
            onClick={exportCsv}
          >
            <Download className="h-4 w-4" />
            Export CSV (filtered)
          </button>
          <span className="text-xs font-bold text-slate-500 ml-auto">
            Showing {filteredFixtures.length} of {fixtures.length} fixtures
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loadingList ? (
          <div className="p-12 flex justify-center text-slate-500 font-bold gap-2 items-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading fixtures…
          </div>
        ) : !seasonCompetitionId ? (
          <div className="p-8 text-sm font-bold text-slate-500">Select a season competition above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 font-black uppercase text-[11px] text-slate-600">
                <tr>
                  <th className="px-2 py-2 w-10">
                    <button
                      type="button"
                      className="p-1 rounded border border-slate-300 bg-white"
                      aria-label="Toggle all visible"
                      onClick={toggleAllFiltered}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-2 py-2 text-left">Rd</th>
                  <th className="px-2 py-2 text-left">When</th>
                  <th className="px-2 py-2 text-left">Venue</th>
                  <th className="px-2 py-2 text-left">Match</th>
                  <th className="px-2 py-2 text-left">Pub</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Scores</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFixtures.map((f) => {
                  const draft = scoreDraft[f.fixtureId] ?? { h: "", a: "" };
                  const pendingApproval =
                    f.resultStatus === "submitted" && seasonMeta?.resultApprovalRequired;
                  return (
                    <tr key={f.fixtureId} className="hover:bg-slate-50/80">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(f.fixtureId)}
                          onChange={(e) => toggleOne(f.fixtureId, e.target.checked)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-2 py-2 font-mono font-bold">{f.round}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs font-bold text-slate-700">
                        {fmtWhen(f.scheduledStart ?? null)}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-slate-700 max-w-[140px] truncate">
                        {f.venueName?.trim() || "—"}
                      </td>
                      <td className="px-2 py-2 font-bold text-slate-900 min-w-[200px]">
                        {teamLabel(f.homeTeamId)} vs {teamLabel(f.awayTeamId)}
                      </td>
                      <td className="px-2 py-2">
                        {f.published ? (
                          <span className="text-emerald-700 font-black text-xs">Y</span>
                        ) : (
                          <span className="text-slate-400 font-black text-xs">N</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold uppercase text-slate-600">
                        {f.status ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            className="w-10 rounded border px-1 py-1 text-center font-mono text-xs font-bold"
                            inputMode="numeric"
                            value={draft.h}
                            onChange={(e) =>
                              setScoreDraft((prev) => ({
                                ...prev,
                                [f.fixtureId]: { ...draft, h: e.target.value },
                              }))
                            }
                          />
                          <span className="font-black text-slate-400">–</span>
                          <input
                            className="w-10 rounded border px-1 py-1 text-center font-mono text-xs font-bold"
                            inputMode="numeric"
                            value={draft.a}
                            onChange={(e) =>
                              setScoreDraft((prev) => ({
                                ...prev,
                                [f.fixtureId]: { ...draft, a: e.target.value },
                              }))
                            }
                          />
                        </div>
                        {f.resultStatus ? (
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                            {f.resultStatus}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <button
                            type="button"
                            disabled={rowBusy === f.fixtureId}
                            className="text-left text-xs font-black text-white rounded-lg px-2 py-1.5 disabled:opacity-40"
                            style={{ backgroundColor: primaryColor }}
                            onClick={() => void saveResult(f)}
                          >
                            Save scores
                          </button>
                          {pendingApproval ? (
                            <button
                              type="button"
                              disabled={rowBusy === f.fixtureId}
                              className="text-left text-xs font-black rounded-lg border-2 border-emerald-700 text-emerald-900 px-2 py-1.5 disabled:opacity-40"
                              onClick={() => void approveResult(f)}
                            >
                              Approve result
                            </button>
                          ) : null}
                          <Link
                            href={`/admin/associations/${encodeURIComponent(associationId)}/match-events?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}&fixtureId=${encodeURIComponent(f.fixtureId)}`}
                            className="inline-flex items-center gap-1 text-xs font-black text-[#06054e] underline"
                          >
                            <Calendar className="h-3 w-3" />
                            Match events
                          </Link>
                          <Link
                            href={`/admin/associations/${encodeURIComponent(associationId)}/competitions?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`}
                            className="inline-flex items-center gap-1 text-xs font-black text-slate-600 underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            League setup
                          </Link>
                          <Link
                            href={`/admin/bulk-import?tab=league-fixture-results`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 underline"
                          >
                            CSV results import
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
