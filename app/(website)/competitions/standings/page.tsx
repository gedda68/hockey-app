import React from "react";
import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: { div?: string };
}) {
  // 1. Load Data
  const filePath = path.join(process.cwd(), "public/data/standings.json");
  const fileContents = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(fileContents);

  // 2. Resolve Filters
  const params = await searchParams;
  const currentSlug = params.div || data.divisions[0].slug;
  const currentDivision =
    data.divisions.find((d: any) => d.slug === currentSlug) ||
    data.divisions[0];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
      <Link
        href="/competitions"
        className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 hover:text-[#06054e] flex items-center gap-2 group"
      >
        <span className="transition-transform group-hover:-translate-x-1">
          ←
        </span>{" "}
        Back to Dashboard
      </Link>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#06054e] uppercase italic tracking-tighter">
          League <span className="text-blue-600">Standings</span>
        </h1>

        {/* Division Tabs */}
        <div className="flex gap-3 mt-6 overflow-x-auto pb-4 scrollbar-hide">
          {data.divisions.map((div: any) => (
            <Link
              key={div.slug}
              href={`/competitions/standings?div=${div.slug}`}
              className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                currentSlug === div.slug
                  ? "bg-[#06054e] text-white shadow-lg ring-4 ring-blue-500/10"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-[#06054e]"
              }`}
            >
              {div.divisionName}
            </Link>
          ))}
        </div>
      </div>

      {/* Standings Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#06054e] text-white uppercase text-[10px] tracking-[0.2em]">
                <th className="p-5 text-center">Pos</th>
                <th className="p-5">Club</th>
                <th className="p-5 text-center">P</th>
                <th className="p-5 text-center">W</th>
                <th className="p-5 text-center">D</th>
                <th className="p-5 text-center">L</th>
                <th className="p-5 text-center">GD</th>
                <th className="p-5 bg-blue-600 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {currentDivision.teams.map((team: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="p-5 text-center font-black text-slate-300 group-hover:text-[#06054e] tabular-nums">
                    {team.pos}
                  </td>
                  <td className="p-5 font-black text-[#06054e] uppercase italic">
                    <div className="flex items-center gap-4">
                      {/* LOGO BOX */}
                      <div className="relative w-10 h-10 flex-shrink-0 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden p-1 flex items-center justify-center group-hover:bg-white transition-colors">
                        <Image
                          src={team.icon || "/images/logos/default-club.png"}
                          alt={`${team.club} logo`}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <span className="tracking-tight">{team.club}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center text-sm font-bold tabular-nums">
                    {team.p}
                  </td>
                  <td className="p-5 text-center text-sm font-bold tabular-nums text-green-600">
                    {team.w}
                  </td>
                  <td className="p-5 text-center text-sm font-bold tabular-nums text-slate-400">
                    {team.d}
                  </td>
                  <td className="p-5 text-center text-sm font-bold tabular-nums text-red-400">
                    {team.l}
                  </td>
                  <td className="p-5 text-center text-sm font-bold tabular-nums text-slate-500">
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </td>
                  <td className="p-5 text-center text-sm font-black bg-blue-50 text-blue-700 tabular-nums">
                    {team.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 p-6 bg-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
          Official BHA Ranking System • {currentDivision.divisionName}
        </p>
        <p className="text-[10px] font-bold text-blue-400 uppercase">
          Last Sync: {new Date(data.lastUpdated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
