"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EventDashboard() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    fetch("/data/events.json")
      .then((res) => res.json())
      .then((data) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextFive = data.events
          .filter((e: any) => new Date(e.startDate) >= today)
          .sort((a: any, b: any) => a.startDate.localeCompare(b.startDate))
          .slice(0, 5);

        setUpcoming(nextFive);
      })
      .catch((err) => console.error("Error loading preview:", err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900 px-4 md:px-8 lg:px-12 w-full">
      {/* 1. WEATHER ALERT BAR */}
      <div className="w-full mt-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </div>
            <p className="text-xs md:text-sm font-bold text-amber-900 tracking-tight">
              <span className="uppercase mr-2 font-black">Field Status:</span>
              All Brisbane Hockey venues currently{" "}
              <span className="text-green-700">OPEN</span>. No weather delays
              reported.
            </p>
          </div>
          <span className="text-[10px] font-black text-amber-600 uppercase hidden md:block">
            Updated: 2 mins ago
          </span>
        </div>
      </div>

      {/* 2. TOP NAVIGATION & HEADER */}
      <div className="w-full mb-10">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">
            ←
          </span>{" "}
          Back
        </button>

        <div className="w-full text-center bg-[#66667e] py-8 rounded-3xl shadow-inner relative overflow-hidden">
          <h1 className="text-5xl font-extrabold text-yellow-200 uppercase tracking-tighter italic sm:text-4xl">
            Match Day Central
          </h1>
          <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.6em] mt-3">
            Brisbane Hockey Association • Season 2026
          </p>
        </div>
      </div>

      {/* 3. GRID CONTAINER (4 Wide on Desktop) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* TILE 1: EVENT CALENDAR */}
        <div className="relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl border border-white/10 flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl">📅</div>
              <div className="bg-red-600/20 px-3 py-1 rounded-full border border-red-600/30">
                <span className="text-[10px] font-black uppercase text-red-500 tracking-tighter italic">
                  Upcoming
                </span>
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-4">
              Calendar
            </h3>
            <div className="space-y-2">
              {upcoming.map((event, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors group/item"
                >
                  <Link
                    href={event.link || "/competitions/events"}
                    target={event.link ? "_blank" : "_self"}
                    className="text-xs font-bold text-white truncate max-w-[150px] hover:text-red-400 transition-colors"
                  >
                    {event.name} {event.link && "↗"}
                  </Link>
                  <span className="text-[10px] font-black text-red-500">
                    {event.startDate.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/competitions/events"
            className="mt-8 flex items-center justify-between pt-4 border-t border-white/5"
          >
            <span className="text-[10px] font-black uppercase text-white/40">
              Full Schedule —
            </span>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <span className="text-black">→</span>
            </div>
          </Link>
        </div>

        {/* TILE 2: LIVESTREAMS */}
        <Link
          href="https://www.livehockey.com.au"
          target="_blank"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-red-500">
                📺
              </div>
              <div className="bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg">
                <span className="text-[10px] font-black uppercase text-white">
                  Live
                </span>
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              BHA Live <br />
              <span className="text-red-600">Coverage</span>
            </h3>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-sm font-bold text-white leading-tight italic">
                Premier League Match Day
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              Watch Now —
            </span>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center group-hover:bg-white transition-all">
              <span className="text-white group-hover:text-red-600">▶</span>
            </div>
          </div>
        </Link>

        {/* TILE 3: MATCHES (NEW) */}
        <Link
          href="/competitions/matches"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-blue-400">
                🏑
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              Fixtures & <br />
              <span className="text-blue-400">Times</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Find match times, field allocations, and division schedules across
              all BHA venues.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              Find Matches —
            </span>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600 transition-all">
              <span className="text-white font-black">F</span>
            </div>
          </div>
        </Link>

        {/* TILE 4: RESULTS */}
        <Link
          href="/competitions/standings"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-yellow-400">
                🏆
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              Ladders & <br />
              <span className="text-yellow-400">Rankings</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Official league standings, win/loss records, and finals
              eligibility tracking.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              View Ladders —
            </span>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white transition-all">
              <span className="text-white group-hover:text-black font-black">
                L
              </span>
            </div>
          </div>
        </Link>

        {/* TILE 5: JUNIOR PORTAL */}
        <Link
          href="/competitions/juniors"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-emerald-400">
                🌱
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              Junior <br />
              <span className="text-emerald-400">Pathways</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Information for U7s to U18s including clinics and representative
              trials.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              Junior Portal —
            </span>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 transition-all">
              <span className="text-white font-black">J</span>
            </div>
          </div>
        </Link>

        {/* TILE 6: STATISTICS (NEW) */}
        <Link
          href="/competitions/stats"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-indigo-400">
                📊
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              Player <br />
              <span className="text-indigo-400">Statistics</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Top goal scorers, clean sheets, and individual performance
              tracking.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              View Stats —
            </span>
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500 transition-all">
              <span className="text-white font-black">S</span>
            </div>
          </div>
        </Link>

        {/* TILE 7: MASTERS */}
        <Link
          href="/competitions/masters"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-orange-400">
                👴
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              Masters <br />
              <span className="text-orange-400">Competition</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Over 34s and veteran hockey details, rules, and schedules.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              Masters Portal —
            </span>
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500 transition-all">
              <span className="text-white font-black">M</span>
            </div>
          </div>
        </Link>

        {/* TILE 8: OFFICIATING */}
        <Link
          href="/competitions/officiating"
          className="group relative overflow-hidden bg-[#06054e] rounded-3xl p-8 shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10 flex flex-col justify-between min-h-[420px]"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="bg-white/10 p-4 rounded-2xl text-2xl text-slate-300">
                🏁
              </div>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-8">
              Officials & <br />
              <span className="text-slate-400">Technical</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Umpire appointments, technical officer duties, and rule updates.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white">
              Umpires Portal —
            </span>
            <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center group-hover:bg-slate-500 transition-all">
              <span className="text-slate-300 font-black">U</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
