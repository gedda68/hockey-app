// app/players/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  Target,
  ScrollText,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function PlayerProfile() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${id}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      });
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!data?.bio)
    return <div className="text-center p-20 font-bold">Player not found.</div>;

  const { bio, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Bio Hero Section */}
      <div className="bg-[#06054e] text-white pt-16 pb-32 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-white/10 rounded-full border-4 border-yellow-400 flex items-center justify-center text-5xl font-black">
            {bio.name.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2">
              {bio.name}
            </h1>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <span className="px-3 py-1 bg-yellow-400 text-[#06054e] rounded-full text-xs font-black uppercase">
                {bio.primaryPosition}
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/20">
                {bio.club}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 -mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Specs */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">
              Technical Bio
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold text-sm">
                  Secondary Position
                </span>
                <span className="font-black text-[#06054e]">
                  {bio.secondaryPosition || "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold text-sm">
                  Player ID
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {bio.playerId.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Statistics History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
              <Target size={18} className="text-[#06054e]" />
              <h2 className="font-black uppercase text-sm tracking-tighter">
                Career Statistics
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Season</th>
                    <th className="px-6 py-4 text-center">Games</th>
                    <th className="px-6 py-4 text-center text-green-600">
                      Goals
                    </th>
                    <th className="px-6 py-4 text-center">Assists</th>
                    <th className="px-6 py-4 text-center">Cards (G/Y/R)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.map((s: any) => (
                    <tr
                      key={s.season}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-black text-[#06054e]">
                        {s.season}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {s.numberOfGames}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-green-600">
                        {s.goals}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {s.assists}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1 font-mono text-xs">
                          <span className="text-green-500">
                            {s.cards.green}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-yellow-500">
                            {s.cards.yellow}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-red-500">{s.cards.red}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-400 italic text-sm"
                      >
                        No statistical data recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
