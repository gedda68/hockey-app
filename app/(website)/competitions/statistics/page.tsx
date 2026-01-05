"use client";

import React, { useMemo } from "react";
// Using relative paths to import the JSON files
import playerListData from "../../../../data/playerlist.json";
import matchStatsData from "../../../../data/matchstats.json";

interface Player {
  playerName: string;
  playerNum: string;
  club: string;
  gender: string;
  dateOfBirth: string;
  isGoalkeeper: boolean;
}

interface PlayerStats {
  playerName: string;
  playerNum: string;
  club: string;
  isGoalkeeper: boolean;
  goals: number;
  green: number;
  yellow: number;
  red: number;
  wins: number;
  draws: number;
  losses: number;
  shutouts: number;
  goalsAgainst: number;
  years: Set<string>;
  divisions: Set<string>;
}

export default function StatisticsPage() {
  const processedStats = useMemo(() => {
    const statsMap: Record<string, PlayerStats> = {};

    // Initialize map with all players from roster
    playerListData.players.forEach((p: Player) => {
      statsMap[p.playerName] = {
        ...p,
        goals: 0,
        green: 0,
        yellow: 0,
        red: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        shutouts: 0,
        goalsAgainst: 0,
        years: new Set<string>(),
        divisions: new Set<string>(),
      };
    });

    // Process Matches
    Object.entries(matchStatsData.stats).forEach(
      ([matchId, match]: [string, any]) => {
        const year = matchId.substring(0, 4);
        const divCode = matchId.substring(4, 7);
        const division = divCode === "PLM" ? "Premier League" : "BHL";

        // 1. Calculate Team Scores
        const scores: Record<string, number> = {};
        match.goals.forEach((g: any) => {
          scores[g.team] = (scores[g.team] || 0) + 1;
        });

        const teamsInMatch = Object.keys(scores);
        if (teamsInMatch.length < 2) return; // Skip if data is incomplete

        const teamA = teamsInMatch[0];
        const teamB = teamsInMatch[1];

        let winner: string | null = null;
        if (scores[teamA] > scores[teamB]) winner = teamA;
        else if (scores[teamB] > scores[teamA]) winner = teamB;
        else if (match.shootout) {
          // Handle Shootout Tie-breaker
          const hGoal = match.shootout.home.filter(
            (r: any) => r.result === "Goal"
          ).length;
          const aGoal = match.shootout.away.filter(
            (r: any) => r.result === "Goal"
          ).length;
          winner = hGoal > aGoal ? teamA : teamB;
        }

        // 2. Update Stats for Players in this match
        playerListData.players.forEach((p: Player) => {
          const pStats = statsMap[p.playerName];
          // We assume a player is "active" if their club is playing
          if (p.club === teamA || p.club === teamB) {
            const opponent = p.club === teamA ? teamB : teamA;
            const oppScore = scores[opponent] || 0;
            const myScore = scores[p.club] || 0;

            pStats.years.add(year);
            pStats.divisions.add(division);

            // Win/Loss/Draw
            if (winner === p.club) pStats.wins++;
            else if (winner === null) pStats.draws++;
            else pStats.losses++;

            // Goals
            pStats.goals += match.goals.filter(
              (g: any) => g.playerName === p.playerName
            ).length;

            // Cards
            match.cards?.forEach((c: any) => {
              if (c.playerName === p.playerName) {
                if (c.type === "Green") pStats.green++;
                if (c.type === "Yellow") pStats.yellow++;
                if (c.type === "Red") pStats.red++;
              }
            });

            // Goalkeeper Specifics
            if (p.isGoalkeeper) {
              pStats.goalsAgainst += oppScore;
              if (oppScore === 0) pStats.shutouts++;
            }
          }
        });
      }
    );

    return Object.values(statsMap);
  }, []);

  const fieldPlayers = processedStats.filter((p) => !p.isGoalkeeper);
  const goalkeepers = processedStats.filter((p) => p.isGoalkeeper);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          PLAYER STATISTICS
        </h1>
        <p className="text-slate-500 mt-2">
          Historical performance and card discipline tracking.
        </p>
      </div>

      {/* Field Players Table */}
      <div className="mb-16">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
          Field Players
        </h2>
        <div className="overflow-x-auto border rounded-xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-600 text-sm">
                <th className="p-4 font-semibold">Player</th>
                <th className="p-4 font-semibold">Club / Div</th>
                <th className="p-4 font-semibold text-center">Years</th>
                <th className="p-4 font-semibold text-center">Goals</th>
                <th className="p-4 font-semibold text-center text-green-600">
                  G
                </th>
                <th className="p-4 font-semibold text-center text-yellow-600">
                  Y
                </th>
                <th className="p-4 font-semibold text-center text-red-600">
                  R
                </th>
                <th className="p-4 font-semibold text-center">
                  Record (W-D-L)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fieldPlayers.map((p) => (
                <tr
                  key={p.playerName}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4 font-bold text-slate-800">
                    {p.playerName}{" "}
                    <span className="text-slate-400 font-normal">
                      #{p.playerNum}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    {p.club} <br />
                    <span className="text-xs text-blue-600 font-medium uppercase">
                      {Array.from(p.divisions).join(", ")}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm font-mono">
                    {Array.from(p.years).sort().join(", ")}
                  </td>
                  <td className="p-4 text-center font-bold text-lg">
                    {p.goals}
                  </td>
                  <td className="p-4 text-center font-semibold text-green-600">
                    {p.green}
                  </td>
                  <td className="p-4 text-center font-semibold text-yellow-600">
                    {p.yellow}
                  </td>
                  <td className="p-4 text-center font-semibold text-red-600">
                    {p.red}
                  </td>
                  <td className="p-4 text-center font-mono text-sm">
                    {p.wins}-{p.draws}-{p.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goalkeeper Table */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
          Goalkeepers
        </h2>
        <div className="overflow-x-auto border rounded-xl shadow-sm bg-indigo-50/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-900 text-white text-sm">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Club</th>
                <th className="p-4 font-semibold text-center">Years</th>
                <th className="p-4 font-semibold text-center">Shutouts</th>
                <th className="p-4 font-semibold text-center">Goals Against</th>
                <th className="p-4 font-semibold text-center">W-D-L</th>
                <th className="p-4 font-semibold text-center">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {goalkeepers.map((p) => (
                <tr
                  key={p.playerName}
                  className="hover:bg-white transition-colors"
                >
                  <td className="p-4 font-bold text-indigo-900">
                    {p.playerName}
                  </td>
                  <td className="p-4 text-sm font-medium">{p.club}</td>
                  <td className="p-4 text-center text-sm font-mono">
                    {Array.from(p.years).join(", ")}
                  </td>
                  <td className="p-4 text-center font-black text-indigo-600 text-xl">
                    {p.shutouts}
                  </td>
                  <td className="p-4 text-center font-semibold text-slate-600">
                    {p.goalsAgainst}
                  </td>
                  <td className="p-4 text-center font-mono text-sm">
                    {p.wins}-{p.draws}-{p.losses}
                  </td>
                  <td className="p-4 text-center font-bold text-indigo-700">
                    {(
                      (p.wins / (p.wins + p.losses + p.draws || 1)) *
                      100
                    ).toFixed(0)}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
