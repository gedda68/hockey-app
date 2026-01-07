import React from "react";
import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import RefreshButton from "../../../components/RefreshButton";
import MatchList from "../../../components/MatchList";
import Image from "next/image";
//import statsPath from "../../data/matchstats.json";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: { div?: string; round?: string; status?: string };
}) {
  // 1. DATA LOADING
  const matchesPath = path.join(process.cwd(), "public/data/matches.json");
  const standingsPath = path.join(process.cwd(), "public/data/standings.json");
  const statsPath = path.join(process.cwd(), "/data/matchstats.json");

  const [matchesData, standingsData, statsData] = await Promise.all([
    fs.readFile(matchesPath, "utf8").then(JSON.parse),
    fs.readFile(standingsPath, "utf8").then(JSON.parse),
    fs.readFile(statsPath, "utf8").then(JSON.parse),
  ]);

  const allMatches = matchesData.matches;

  // 2. PARAMS & FILTERS
  const params = await searchParams;
  const selectedDiv = params.div || "All";
  const selectedRound = params.round || "All";
  const selectedStatus = params.status || "All";

  const divisions = [
    "All",
    ...Array.from(new Set(allMatches.map((m: any) => m.division))),
  ];
  const rounds = [
    "All",
    ...Array.from(new Set(allMatches.map((m: any) => m.round))),
  ];
  const statuses = ["All", "Live", "Final"];

  const filteredMatches = allMatches.filter((match: any) => {
    const divMatch = selectedDiv === "All" || match.division === selectedDiv;
    const roundMatch = selectedRound === "All" || match.round === selectedRound;

    let statusMatch = true;
    if (selectedStatus === "Live") {
      statusMatch =
        match.status.toLowerCase().includes("live") ||
        match.status.toLowerCase().includes("progress");
    } else if (selectedStatus === "Final") {
      statusMatch = match.status.toLowerCase().includes("final");
    }
    return divMatch && roundMatch && statusMatch;
  });

  const currentStandings = standingsData.divisions.find(
    (d: any) => d.divisionName === selectedDiv
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
      <div className="flex justify-between items-center mb-8">
        <Link
          href="/competitions"
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group"
        >
          <span className="transition-transform group-hover:-translate-x-1">
            ←
          </span>{" "}
          Back to Dashboard
        </Link>
        <RefreshButton />
      </div>

      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-4xl font-black text-[#06054e] uppercase italic tracking-tighter">
            Match <span className="text-red-600">Results</span>
          </h1>
          <Link
            href="/competitions/fixtures"
            className="bg-red-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#06054e] transition-all shadow-lg"
          >
            View Upcoming Fixtures
          </Link>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Match Status
            </span>
            <div className="flex gap-2">
              {statuses.map((stat) => (
                <Link
                  key={stat}
                  href={`/competitions/matches?div=${selectedDiv}&round=${selectedRound}&status=${stat}`}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${
                    selectedStatus === stat
                      ? "bg-red-600 text-white border-red-600 shadow-md"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  {stat}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Division
            </span>
            <div className="flex gap-2 flex-wrap">
              {divisions.map((div: any) => (
                <Link
                  key={div}
                  href={`/competitions/matches?div=${div}&round=${selectedRound}&status=${selectedStatus}`}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
                    selectedDiv === div
                      ? "bg-[#06054e] text-white border-[#06054e]"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  {div}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8">
          {/* THIS IS THE CLIENT COMPONENT HANDLING MODALS */}
          <MatchList matches={filteredMatches} stats={statsData.stats} />
        </div>

        <div className="xl:col-span-4">
          <div className="sticky top-8 bg-[#06054e] rounded-3xl p-6 shadow-2xl text-white">
            <h2 className="text-lg font-black uppercase italic mb-6">
              Live Table
            </h2>
            {currentStandings ? (
              <div className="space-y-1">
                {currentStandings.teams.map((team: any) => (
                  <div
                    key={team.club}
                    className="grid grid-cols-12 items-center bg-white/5 p-2 rounded-lg text-xs"
                  >
                    <div className="col-span-2 font-black text-slate-500">
                      {team.pos}
                    </div>
                    <div className="col-span-7 flex items-center gap-2 font-bold uppercase text-[10px]">
                      <Image src={team.icon} alt="" width={16} height={16} />{" "}
                      {team.club}
                    </div>
                    <div className="col-span-3 text-right font-black text-blue-400">
                      {team.pts}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 uppercase">
                Select a division to view table
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
