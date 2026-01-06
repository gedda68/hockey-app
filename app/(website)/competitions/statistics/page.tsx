"use client";

import React, { useMemo, useState } from "react";
import playerListData from "../../../../data/playerlist.json";
import matchStatsData from "../../../../data/matchstats.json";

type SortKeys =
  | "playerName"
  | "goals"
  | "goalPercent"
  | "greenCards"
  | "yellowCards"
  | "redCards"
  | "shootoutRate"
  | "clutch"
  | "goalContrib"
  | "totalGames";
type ClubSortKeys =
  | "clubName"
  | "gp"
  | "wins"
  | "losses"
  | "draws"
  | "winRate"
  | "gf"
  | "ga";
type GkSortKeys = "playerName" | "soSavePercent" | "totalGames" | "shutouts";

export default function StatisticsPage() {
  const initialFieldFilters = { club: "All", year: "All", division: "All" };
  const initialGkFilters = { club: "All", year: "All", division: "All" };
  const initialClubFilters = { year: "All", division: "All" };

  const [fieldFilters, setFieldFilters] = useState(initialFieldFilters);
  const [gkFilters, setGkFilters] = useState(initialGkFilters);
  const [clubFilters, setClubFilters] = useState(initialClubFilters);

  const [fieldSort, setFieldSort] = useState<{
    key: SortKeys;
    dir: "asc" | "desc";
  }>({ key: "goals", dir: "desc" });
  const [clubSort, setClubSort] = useState<{
    key: ClubSortKeys;
    dir: "asc" | "desc";
  }>({ key: "winRate", dir: "desc" });
  const [gkSort, setGkSort] = useState<{
    key: GkSortKeys;
    dir: "asc" | "desc";
  }>({ key: "soSavePercent", dir: "desc" });

  const { fieldStats, goalkeeperStats, clubStats, options } = useMemo(() => {
    const years = new Set<string>(["All"]);
    const divisions = new Set<string>(["All"]);
    const clubTotals: Record<string, number> = {};

    const matchesArray = Object.entries(matchStatsData.stats)
      .map(([id, match]: [string, any]) => {
        const year = id.substring(0, 4);
        const div =
          id.substring(4, 7) === "PLM"
            ? "Premier"
            : `BHL D${id.substring(7, 8) || "1"}`;
        years.add(year);
        divisions.add(div);
        const scores: Record<string, number> = {};
        match.goals.forEach((g: any) => {
          scores[g.team] = (scores[g.team] || 0) + 1;
        });
        return {
          id,
          year,
          division: div,
          match,
          scores,
          teams: Object.keys(scores),
        };
      })
      .filter((m) => m.teams.length >= 2);

    const calculatePlayer = (player: any, f: any, isGk: boolean) => {
      const res = {
        ...player,
        goals: 0,
        greenCards: 0,
        yellowCards: 0,
        redCards: 0,
        wins: 0,
        totalGames: 0,
        shutouts: 0,
        goalsAgainst: 0,
        soSaves: 0,
        soFaced: 0,
        clutch: 0,
      };
      const eligible = matchesArray.filter((m) => {
        if (f.year !== "All" && m.year !== f.year) return false;
        if (f.division !== "All" && m.division !== f.division) return false;
        if (f.club && f.club !== "All" && player.club !== f.club) return false;
        return m.teams.includes(player.club);
      });

      eligible.forEach((m: any) => {
        const pGoals = m.match.goals.filter(
          (g: any) => g.playerName === player.playerName
        );
        if (
          pGoals.length > 0 ||
          isGk ||
          m.match.cards?.some((c: any) => c.playerName === player.playerName)
        ) {
          res.totalGames++;
          res.goals += pGoals.length;
          res.clutch += pGoals.filter((g: any) => g.minute >= 55).length;
          clubTotals[player.club] =
            (clubTotals[player.club] || 0) + (m.scores[player.club] || 0);

          m.match.cards
            ?.filter((c: any) => c.playerName === player.playerName)
            .forEach((c: any) => {
              if (c.type === "Green") res.greenCards++;
              if (c.type === "Yellow") res.yellowCards++;
              if (c.type === "Red") res.redCards++;
            });

          if (isGk) {
            const opp = m.teams.find((t: any) => t !== player.club);
            res.goalsAgainst += m.scores[opp] || 0;
            if ((m.scores[opp] || 0) === 0) res.shutouts++;
            if (m.match.shootout) {
              const shots =
                player.club === m.teams[0]
                  ? m.match.shootout.away
                  : m.match.shootout.home;
              res.soFaced += shots.length;
              res.soSaves += shots.filter(
                (s: any) => s.result !== "Goal"
              ).length;
            }
          }
        }
      });
      return {
        ...res,
        goalPercent:
          res.totalGames > 0 ? (res.goals / res.totalGames) * 100 : 0,
        soSavePercent: res.soFaced > 0 ? (res.soSaves / res.soFaced) * 100 : 0,
      };
    };

    const fs = playerListData.players
      .filter((p) => !p.isGoalkeeper)
      .map((p) => {
        const b = calculatePlayer(p, fieldFilters, false);
        return {
          ...b,
          goalContrib:
            clubTotals[p.club] > 0 ? (b.goals / clubTotals[p.club]) * 100 : 0,
        };
      })
      .filter((p) => p.totalGames > 0);

    const gs = playerListData.players
      .filter((p) => p.isGoalkeeper)
      .map((p) => calculatePlayer(p, gkFilters, true))
      .filter((p) => p.totalGames > 0);

    const cs = Array.from(new Set(playerListData.players.map((p) => p.club)))
      .map((cName) => {
        const stats = {
          clubName: cName,
          wins: 0,
          losses: 0,
          draws: 0,
          gp: 0,
          gf: 0,
          ga: 0,
          form: [] as string[],
        };
        matchesArray.forEach((m) => {
          if (
            (clubFilters.year !== "All" && m.year !== clubFilters.year) ||
            (clubFilters.division !== "All" &&
              m.division !== clubFilters.division) ||
            !m.teams.includes(cName)
          )
            return;
          stats.gp++;
          const opp = m.teams.find((t: any) => t !== cName);
          const tS = m.scores[cName] || 0;
          const oS = m.scores[opp] || 0;
          const res = tS > oS ? "W" : oS > tS ? "L" : "D";
          if (res === "W") stats.wins++;
          else if (res === "L") stats.losses++;
          else stats.draws++;
          stats.gf += tS;
          stats.ga += oS;
          stats.form.push(res);
        });
        return {
          ...stats,
          form: stats.form.slice(-5),
          winRate: stats.gp > 0 ? (stats.wins / stats.gp) * 100 : 0,
        };
      })
      .filter((c) => c.gp > 0);

    return {
      fieldStats: fs,
      goalkeeperStats: gs,
      clubStats: cs,
      options: {
        years,
        divisions,
        clubs: new Set(["All", ...playerListData.players.map((p) => p.club)]),
      },
    };
  }, [fieldFilters, gkFilters, clubFilters]);

  const applySort = (current: any, key: string, setFn: any) => {
    setFn((prev: any) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  const getSortIcon = (
    key: string,
    current: { key: string; dir: "asc" | "desc" }
  ) => (
    <span
      className={`ml-1 text-[10px] ${
        current.key === key ? "text-white" : "opacity-20"
      }`}
    >
      {current.key === key ? (current.dir === "desc" ? "↓" : "↑") : "↕"}
    </span>
  );

  const FilterBadges = ({ filters, resetFn }: any) => {
    const active = Object.entries(filters).filter(([_, v]) => v !== "All");
    if (active.length === 0) return <div className="h-6" />;
    return (
      <div className="flex flex-wrap gap-2 mb-4 h-6">
        {active.map(([k, v]) => (
          <span
            key={k}
            className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"
          >
            {v as string}{" "}
            <button
              onClick={() => resetFn({ ...filters, [k]: "All" })}
              className="hover:text-red-300 ml-1"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  };

  const sortedField = useMemo(
    () =>
      [...fieldStats].sort((a, b) =>
        fieldSort.dir === "desc"
          ? b[fieldSort.key] > a[fieldSort.key]
            ? 1
            : -1
          : a[fieldSort.key] > b[fieldSort.key]
          ? 1
          : -1
      ),
    [fieldStats, fieldSort]
  );
  const sortedClubs = useMemo(
    () =>
      [...clubStats].sort((a, b) =>
        clubSort.dir === "desc"
          ? b[clubSort.key] > a[clubSort.key]
            ? 1
            : -1
          : a[clubSort.key] > b[clubSort.key]
          ? 1
          : -1
      ),
    [clubStats, clubSort]
  );
  const sortedGks = useMemo(
    () =>
      [...goalkeeperStats].sort((a, b) =>
        gkSort.dir === "desc"
          ? b[gkSort.key] > a[gkSort.key]
            ? 1
            : -1
          : a[gkSort.key] > b[gkSort.key]
          ? 1
          : -1
      ),
    [goalkeeperStats, gkSort]
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 bg-[#f8fafc] min-h-screen text-slate-900 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter">
          Analytics v2.6.7
        </h1>
        <button
          onClick={() => {
            setFieldFilters(initialFieldFilters);
            setGkFilters(initialGkFilters);
            setClubFilters(initialClubFilters);
          }}
          className="bg-slate-900 text-white text-[10px] font-black px-6 py-3 rounded-full uppercase hover:bg-blue-600 transition-all shadow-xl"
        >
          Reset All Dashboards
        </button>
      </div>

      {/* FIELD PERFORMANCE */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-2xl font-black uppercase text-slate-700">
            Field Performance
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFieldFilters(initialFieldFilters)}
              className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 mr-2"
            >
              Reset Section
            </button>
            {["club", "year", "division"].map((k) => (
              <select
                key={k}
                className="bg-white border-2 border-slate-200 rounded-full px-4 py-1 text-[10px] font-black uppercase shadow-sm"
                value={(fieldFilters as any)[k]}
                onChange={(e) =>
                  setFieldFilters({ ...fieldFilters, [k]: e.target.value })
                }
              >
                {Array.from((options as any)[k + "s"])
                  .sort()
                  .map((opt: any) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            ))}
          </div>
        </div>
        <FilterBadges filters={fieldFilters} resetFn={setFieldFilters} />
        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
              <tr>
                {[
                  { k: "playerName", l: "Player" },
                  { k: "goals", l: "G" },
                  { k: "goalPercent", l: "Goal %" },
                  { k: "goalContrib", l: "GC%" },
                  { k: "greenCards", l: "Gr" },
                  { k: "yellowCards", l: "Ye" },
                  { k: "redCards", l: "Rd" },
                  { k: "clutch", l: "Clutch" },
                  { k: "totalGames", l: "GP" },
                ].map((col) => (
                  <th
                    key={col.k}
                    className="p-5 cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() =>
                      applySort(fieldSort, col.k as SortKeys, setFieldSort)
                    }
                  >
                    {col.l} {getSortIcon(col.k, fieldSort)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-black text-sm">
              {sortedField.map((p) => (
                <tr key={p.playerName} className="hover:bg-blue-50/40">
                  <td className="p-5 uppercase border-r">
                    {p.playerName}
                    <div className="text-[9px] text-blue-600">{p.club}</div>
                  </td>
                  <td className="p-5 text-center font-mono text-2xl border-r">
                    {p.goals}
                  </td>
                  <td className="p-5 text-center font-mono border-r">
                    {p.goalPercent.toFixed(0)}%
                  </td>
                  <td className="p-5 text-center font-mono border-r text-indigo-700 bg-indigo-50/5">
                    {p.goalContrib.toFixed(1)}%
                  </td>
                  <td className="p-5 text-center text-green-600 font-mono border-r">
                    {p.greenCards}
                  </td>
                  <td className="p-5 text-center text-yellow-500 font-mono border-r">
                    {p.yellowCards}
                  </td>
                  <td className="p-5 text-center text-red-600 font-mono border-r">
                    {p.redCards}
                  </td>
                  <td className="p-5 text-center font-mono border-r text-orange-600 bg-orange-50/5">
                    {p.clutch}
                  </td>
                  <td className="p-5 text-center text-slate-300 font-mono">
                    {p.totalGames}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* GK RADAR */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-2xl font-black uppercase text-blue-600 italic border-l-8 border-blue-600 pl-4">
              GK Radar
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setGkFilters(initialGkFilters)}
                className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 mr-2"
              >
                Reset
              </button>
              {["year", "division"].map((k) => (
                <select
                  key={k}
                  className="text-[10px] font-black border-2 rounded-full px-3 py-1 bg-white"
                  value={(gkFilters as any)[k]}
                  onChange={(e) =>
                    setGkFilters({ ...gkFilters, [k]: e.target.value })
                  }
                >
                  {Array.from((options as any)[k + "s"]).map((opt: any) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
          <FilterBadges filters={gkFilters} resetFn={setGkFilters} />
          <div className="bg-white rounded-[24px] shadow-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[9px] uppercase font-black">
                <tr>
                  <th
                    className="p-4"
                    onClick={() => applySort(gkSort, "playerName", setGkSort)}
                  >
                    Keeper {getSortIcon("playerName", gkSort)}
                  </th>
                  <th
                    className="p-4 text-center"
                    onClick={() => applySort(gkSort, "totalGames", setGkSort)}
                  >
                    GP {getSortIcon("totalGames", gkSort)}
                  </th>
                  <th
                    className="p-4 text-center"
                    onClick={() => applySort(gkSort, "shutouts", setGkSort)}
                  >
                    SO {getSortIcon("shutouts", gkSort)}
                  </th>
                  <th
                    className="p-4 text-center bg-blue-800"
                    onClick={() =>
                      applySort(gkSort, "soSavePercent", setGkSort)
                    }
                  >
                    SO Save % {getSortIcon("soSavePercent", gkSort)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-black">
                {sortedGks.map((p) => (
                  <tr
                    key={p.playerName}
                    className="text-sm hover:bg-blue-50/30"
                  >
                    <td className="p-4 uppercase border-r">
                      {p.playerName}
                      <div className="text-[8px] text-blue-600">{p.club}</div>
                    </td>
                    <td className="p-4 text-center font-mono border-r">
                      {p.totalGames}
                    </td>
                    <td className="p-4 text-center font-mono border-r text-indigo-600">
                      {p.shutouts}
                    </td>
                    <td className="p-4 text-center font-mono bg-blue-50/20 text-blue-700">
                      {p.soSavePercent.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CLUB RANK */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-2xl font-black uppercase text-slate-700 italic border-l-8 border-slate-700 pl-4">
              Club Rank
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setClubFilters(initialClubFilters)}
                className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 mr-2"
              >
                Reset
              </button>
              <select
                className="text-[10px] font-black border-2 rounded-full px-3 py-1 bg-white"
                value={clubFilters.year}
                onChange={(e) =>
                  setClubFilters({ ...clubFilters, year: e.target.value })
                }
              >
                {Array.from(options.years).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FilterBadges filters={clubFilters} resetFn={setClubFilters} />
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[9px] uppercase font-black">
                <tr>
                  <th
                    className="p-3"
                    onClick={() => applySort(clubSort, "clubName", setClubSort)}
                  >
                    Club {getSortIcon("clubName", clubSort)}
                  </th>
                  <th
                    className="p-3 text-center"
                    onClick={() => applySort(clubSort, "wins", setClubSort)}
                  >
                    W {getSortIcon("wins", clubSort)}
                  </th>
                  <th
                    className="p-3 text-center"
                    onClick={() => applySort(clubSort, "draws", setClubSort)}
                  >
                    D {getSortIcon("draws", clubSort)}
                  </th>
                  <th
                    className="p-3 text-center"
                    onClick={() => applySort(clubSort, "losses", setClubSort)}
                  >
                    L {getSortIcon("losses", clubSort)}
                  </th>
                  <th
                    className="p-3 text-center"
                    onClick={() => applySort(clubSort, "gf", setClubSort)}
                  >
                    GF {getSortIcon("gf", clubSort)}
                  </th>
                  <th
                    className="p-3 text-center"
                    onClick={() => applySort(clubSort, "ga", setClubSort)}
                  >
                    GA {getSortIcon("ga", clubSort)}
                  </th>
                  <th className="p-3 text-center">Form</th>
                  <th
                    className="p-3 text-center bg-blue-800"
                    onClick={() => applySort(clubSort, "winRate", setClubSort)}
                  >
                    Win % {getSortIcon("winRate", clubSort)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-black text-[10px]">
                {sortedClubs.map((c, idx) => (
                  <tr key={c.clubName} className="hover:bg-blue-50/30">
                    <td className="p-3 uppercase border-r flex items-center gap-1">
                      <span className="w-3 text-slate-300">{idx + 1}</span>{" "}
                      {c.clubName}
                    </td>
                    <td className="p-3 text-center border-r font-mono text-green-600">
                      {c.wins}
                    </td>
                    <td className="p-3 text-center border-r font-mono text-slate-400">
                      {c.draws}
                    </td>
                    <td className="p-3 text-center border-r font-mono text-red-400">
                      {c.losses}
                    </td>
                    <td className="p-3 text-center border-r font-mono">
                      {c.gf}
                    </td>
                    <td className="p-3 text-center border-r font-mono">
                      {c.ga}
                    </td>
                    <td className="p-3 border-r">
                      <div className="flex justify-center gap-1">
                        {c.form.map((res, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              res === "W"
                                ? "bg-green-500"
                                : res === "L"
                                ? "bg-red-500"
                                : "bg-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-blue-600 bg-blue-50/20">
                      {c.winRate.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
