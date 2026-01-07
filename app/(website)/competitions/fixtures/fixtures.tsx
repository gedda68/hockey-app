"use client";

import React, { useMemo, useState } from "react";
import fixturesData from "../../../data/fixtures.json";

export default function FixturesPage() {
  const [selectedDivision, setSelectedDivision] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Filter and Grouping Logic
  const groupedFixtures = useMemo(() => {
    let filtered = fixturesData.upcoming.filter((f) => {
      const matchDivision =
        selectedDivision === "All" || f.division === selectedDivision;
      const matchSearch =
        f.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.awayTeam.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDivision && matchSearch;
    });

    // Group by Date
    return filtered.reduce((acc: any, match) => {
      const date = match.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
    }, {});
  }, [selectedDivision, searchTerm]);

  const divisions = [
    "All",
    ...Array.from(new Set(fixturesData.upcoming.map((f) => f.division))),
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 bg-[#f8fafc] min-h-screen text-slate-900 font-sans">
      {/* HEADER & FILTERS */}
      <header className="mb-12 border-b-4 border-slate-900 pb-8">
        <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-6">
          Upcoming Fixtures
        </h1>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Division Toggle */}
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-full w-full md:w-auto overflow-x-auto">
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  selectedDivision === div
                    ? "bg-slate-900 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {div}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="SEARCH TEAM..."
              className="w-full bg-white border-2 border-slate-200 rounded-full px-5 py-2 text-[10px] font-black uppercase focus:border-blue-600 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* FIXTURE LIST */}
      <div className="space-y-16">
        {Object.keys(groupedFixtures).length > 0 ? (
          Object.keys(groupedFixtures)
            .sort()
            .map((date) => (
              <div key={date}>
                {/* DATE HEADER */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-xl transform -rotate-2">
                    <span className="text-2xl font-black italic uppercase">
                      {new Date(date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {new Date(date).toLocaleDateString("en-GB", {
                        weekday: "long",
                      })}
                    </h3>
                    <div className="h-1 w-12 bg-slate-900 mt-1"></div>
                  </div>
                </div>

                {/* MATCH CARDS */}
                <div className="grid gap-6">
                  {groupedFixtures[date].map((match: any) => (
                    <div
                      key={match.id}
                      className={`bg-white rounded-3xl border-2 transition-all p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 ${
                        match.isFeatureGame
                          ? "border-blue-600 shadow-[8px_8px_0px_0px_rgba(37,99,235,1)]"
                          : "border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300"
                      }`}
                    >
                      {/* TIME & VENUE */}
                      <div className="md:w-1/4 text-center md:text-left">
                        <div className="text-3xl font-black italic text-slate-900 mb-1">
                          {match.time}
                        </div>
                        <div className="text-[10px] font-black uppercase text-blue-600 mb-2">
                          {match.division}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase leading-tight">
                          {match.venue}
                        </div>
                      </div>

                      {/* THE MATCH UP */}
                      <div className="flex-1 flex items-center justify-center gap-4 md:gap-12 w-full">
                        <div className="flex-1 text-center md:text-right">
                          <p className="text-lg md:text-2xl font-black uppercase tracking-tighter">
                            {match.homeTeam}
                          </p>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center text-[12px] font-black italic outline outline-offset-4 outline-slate-100">
                            VS
                          </div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                          <p className="text-lg md:text-2xl font-black uppercase tracking-tighter">
                            {match.awayTeam}
                          </p>
                        </div>
                      </div>

                      {/* ACTION / ADD TO CALENDAR */}
                      <div className="md:w-1/4 flex justify-center md:justify-end">
                        <button className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 px-6 py-3 rounded-full text-[10px] font-black uppercase transition-all">
                          Match Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase italic text-2xl">
              No fixtures found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
