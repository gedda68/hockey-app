"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * HELPER: Renders club icon only if valid club and icon path exist
 */
const ClubIcon = ({ club, icon }: { club: string; icon?: string }) => {
  if (!icon || club === "TBA" || club === "—" || !club || club === "")
    return null;
  return (
    <div className="relative w-5 h-5 flex-shrink-0">
      <Image src={icon} alt={club} fill className="object-contain" />
    </div>
  );
};

/**
 * HELPER: Table component for Trial and Training (Time & Venue focus)
 */
const ScheduleTable = ({ data, type }: { data: any; type: string }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-slate-700">
      <thead className="bg-slate-100">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            {type}
          </th>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            Time
          </th>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            Venue
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data?.schedule?.length > 0 ? (
          data.schedule.map((item: any, idx: number) => (
            <tr
              key={idx}
              className={item.isSpecial ? "bg-red-50" : "hover:bg-slate-50"}
            >
              <td
                className={`px-4 py-3 font-bold ${
                  item.isSpecial ? "text-red-600 italic" : "text-[#06054e]"
                }`}
              >
                {item.name}
              </td>
              <td className="px-4 py-3 text-sm">{item.date}</td>
              <td className="px-4 py-3 text-sm">{item.time}</td>
              <td className="px-4 py-3 text-sm font-bold">{item.venue}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={4}
              className="px-4 py-8 text-center text-sm italic text-slate-400"
            >
              No {type.toLowerCase()} dates scheduled.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

/**
 * HELPER: Table component for Tournament (City & Link focus)
 */
const TournamentTable = ({ data }: { data: any }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-slate-700">
      <thead className="bg-slate-100">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            Tournament
          </th>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#06054e]">
            City
          </th>
          <th className="px-4 py-3 text-center text-xs font-black uppercase text-[#06054e]">
            Info
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data?.schedule?.length > 0 ? (
          data.schedule.map((item: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-bold text-[#06054e]">
                {item.name}
              </td>
              <td className="px-4 py-3 text-sm">{item.date}</td>
              <td className="px-4 py-3 text-sm">{item.city}</td>
              <td className="px-4 py-3 text-center">
                {item.tournamentlink ? (
                  <a
                    href={item.tournamentlink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-1 bg-[#06054e] text-white rounded-full text-xs font-black uppercase hover:bg-[#0a0870] transition-all"
                  >
                    Link
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={4}
              className="px-4 py-8 text-center text-sm italic text-slate-400"
            >
              No tournament information listed.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const AGE_GROUPS = ["Under 12", "Under 14", "Under 16", "Under 18", "Open"];

const TEAM_THEMES: Record<string, { bg: string; text: string }> = {
  "Green Team": { bg: "#15803d", text: "white" },
  "Yellow Team": { bg: "#facc15", text: "black" },
  "Blue Team": { bg: "#1d4ed8", text: "white" },
  "Red Team": { bg: "#b91c1c", text: "white" },
  "White Team": { bg: "#f8fafc", text: "black" },
  "Brisbane 1": { bg: "#06054e", text: "white" },
  "Brisbane 2": { bg: "#0a0870", text: "white" },
  Default: { bg: "#06054e", text: "white" },
};

export default function RepresentativePage() {
  const [activeAge, setActiveAge] = useState("Under 12");
  const [rosterData, setRosterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);

  useEffect(() => {
    console.log("Attempting to fetch rosters data...");

    fetch("../../data/rosters.json")
      .then((res) => {
        console.log("Fetch response status:", res.status, res.statusText);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Rosters data loaded successfully:", data);
        console.log("Available age groups:", Object.keys(data));
        setRosterData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading rosters:", err);
        console.error("Error message:", err.message);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06054e]">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-white mt-4">
          Loading Teams...
        </p>
        <p className="text-xs text-white/60 mt-2">
          Fetching from: /data/rosters.json
        </p>
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-12 border-4 border-red-500">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-3xl font-black uppercase text-red-600 mb-4">
              Data Loading Error
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              Unable to load representatives data
            </p>
          </div>

          <div className="bg-red-50 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-black uppercase text-red-900 mb-2">
              Error Details:
            </h3>
            <p className="text-sm text-red-800 font-mono">{error}</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-black uppercase text-slate-900 mb-4">
              Troubleshooting Steps:
            </h3>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#06054e] text-white rounded-full flex items-center justify-center text-xs font-black">
                  1
                </span>
                <span>
                  <strong>Check file location:</strong> Ensure rosters.json is
                  at{" "}
                  <code className="bg-slate-200 px-2 py-1 rounded text-xs">
                    public/data/rosters.json
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#06054e] text-white rounded-full flex items-center justify-center text-xs font-black">
                  2
                </span>
                <span>
                  <strong>Test direct access:</strong> Open{" "}
                  <code className="bg-slate-200 px-2 py-1 rounded text-xs">
                    http://localhost:3000/data/rosters.json
                  </code>{" "}
                  in your browser
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#06054e] text-white rounded-full flex items-center justify-center text-xs font-black">
                  3
                </span>
                <span>
                  <strong>Validate JSON:</strong> Check for syntax errors in the
                  JSON file
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#06054e] text-white rounded-full flex items-center justify-center text-xs font-black">
                  4
                </span>
                <span>
                  <strong>Clear cache:</strong> Run{" "}
                  <code className="bg-slate-200 px-2 py-1 rounded text-xs">
                    rm -rf .next
                  </code>{" "}
                  and restart server
                </span>
              </li>
            </ol>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-4 bg-[#06054e] text-white rounded-full font-black uppercase hover:bg-[#0a0870] transition-all"
            >
              Retry
            </button>
            <Link
              href="/"
              className="flex-1 px-6 py-4 bg-slate-200 text-slate-900 rounded-full font-black uppercase hover:bg-slate-300 transition-all text-center"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentAgeData = rosterData?.[activeAge] || {};

  // Component for the Dynamic Alert with HTML support
  const ModalAlert = ({ info }: { info: any }) => {
    if (!info?.details) return null;
    return (
      <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
        <h3 className="text-sm font-black text-amber-900 uppercase italic tracking-tight mb-2">
          Important Notice:
        </h3>
        <div
          className="text-xs font-bold text-amber-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: info.details }}
        />
      </div>
    );
  };

  const availableTeams = Object.keys(currentAgeData).filter(
    (key) =>
      ![
        "shadowPlayers",
        "withdrawn",
        "lastUpdated",
        "trialInfo",
        "trainingInfo",
        "tournamentInfo",
      ].includes(key)
  );

  // Check if trials, training, or tournament info exists
  const hasTrialInfo =
    currentAgeData.trialInfo && currentAgeData.trialInfo.schedule?.length > 0;
  const hasTrainingInfo =
    currentAgeData.trainingInfo &&
    currentAgeData.trainingInfo.schedule?.length > 0;
  const hasTournamentInfo =
    currentAgeData.tournamentInfo &&
    currentAgeData.tournamentInfo.schedule?.length > 0;

  console.log("Current age data:", currentAgeData);
  console.log("Available teams:", availableTeams);
  console.log("Has trial info:", hasTrialInfo);
  console.log("Has training info:", hasTrainingInfo);
  console.log("Has tournament info:", hasTournamentInfo);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Link
          href="/"
          className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group"
        >
          <span className="transition-transform group-hover:-translate-x-1">
            ←
          </span>
          Back to Home
        </Link>
      </div>

      {/* HEADER HERO */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div
          className="relative text-center mb-12 p-12 rounded-3xl shadow-xl overflow-hidden border-4 border-[#06054e]"
          style={{
            backgroundImage: `url('/icons/bne-rep-16-2.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-[#06054e]/70 z-0"></div>

          {/* CONTENT */}
          <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl font-black text-yellow-200 uppercase tracking-tighter leading-none drop-shadow-md mb-4">
              2026 Brisbane Representative Teams
            </h1>

            <div className="inline-block px-6 py-2 bg-black/40 backdrop-blur-sm rounded-full text-xs font-bold text-white uppercase tracking-widest border border-white/20 shadow-lg">
              Last Updated: {currentAgeData.lastUpdated || "TBA"}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showTrialModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTrialModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b-4 border-yellow-400 px-8 py-6 flex justify-between items-start rounded-t-3xl">
              <div>
                <h3 className="text-3xl font-black uppercase text-[#06054e]">
                  {currentAgeData.trialInfo?.header || `${activeAge} Trials`}
                </h3>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase">
                  Updated: {currentAgeData.lastUpdated}
                </div>
              </div>
              <button
                onClick={() => setShowTrialModal(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-8">
              <ScheduleTable data={currentAgeData.trialInfo} type="Trial" />
              <ModalAlert info={currentAgeData.trialInfo} />
              <div className="mt-8">
                <button
                  onClick={() => setShowTrialModal(false)}
                  className="w-full px-8 py-4 bg-[#06054e] text-white rounded-full font-black uppercase hover:bg-[#0a0870] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTrainingModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTrainingModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b-4 border-blue-400 px-8 py-6 flex justify-between items-start rounded-t-3xl">
              <div>
                <h3 className="text-3xl font-black uppercase text-[#06054e]">
                  {currentAgeData.trainingInfo?.header ||
                    `${activeAge} Training`}
                </h3>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase">
                  Updated: {currentAgeData.lastUpdated}
                </div>
              </div>
              <button
                onClick={() => setShowTrainingModal(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-8">
              <ScheduleTable
                data={currentAgeData.trainingInfo}
                type="Session"
              />
              <ModalAlert info={currentAgeData.trainingInfo} />
              <div className="mt-8">
                <button
                  onClick={() => setShowTrainingModal(false)}
                  className="w-full px-8 py-4 bg-[#06054e] text-white rounded-full font-black uppercase hover:bg-[#0a0870] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTournamentModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTournamentModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b-4 border-indigo-400 px-8 py-6 flex justify-between items-start rounded-t-3xl">
              <div>
                <h3 className="text-3xl font-black uppercase text-[#06054e]">
                  {currentAgeData.tournamentInfo?.header ||
                    `${activeAge} Tournament`}
                </h3>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase">
                  Updated: {currentAgeData.lastUpdated}
                </div>
              </div>
              <button
                onClick={() => setShowTournamentModal(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-8">
              <TournamentTable data={currentAgeData.tournamentInfo} />
              <ModalAlert info={currentAgeData.tournamentInfo} />
              <div className="mt-8">
                <button
                  onClick={() => setShowTournamentModal(false)}
                  className="w-full px-8 py-4 bg-[#06054e] text-white rounded-full font-black uppercase hover:bg-[#0a0870] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {AGE_GROUPS.map((age) => (
            <button
              key={age}
              onClick={() => setActiveAge(age)}
              className={`px-8 py-3 rounded-full font-black uppercase text-sm transition-all ${
                activeAge === age
                  ? "bg-[#06054e] text-white shadow-xl scale-105"
                  : "bg-white text-[#06054e] shadow-sm hover:shadow-md"
              }`}
            >
              {age}
            </button>
          ))}
        </div>

        {/* Action Buttons - Only show if data exists */}
        {(hasTrialInfo || hasTrainingInfo || hasTournamentInfo) && (
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {hasTrialInfo && (
              <button
                onClick={() => setShowTrialModal(true)}
                className="group transition-transform hover:scale-105 active:scale-95"
              >
                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-2 drop-shadow-md group-hover:drop-shadow-xl transition-all">
                  <Image
                    src="/icons/trials.png"
                    alt="Trials"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-sm font-black uppercase text-slate-600">
                  Trials
                </div>
              </button>
            )}
            {hasTrainingInfo && (
              <button
                onClick={() => setShowTrainingModal(true)}
                className="group transition-transform hover:scale-105 active:scale-95"
              >
                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-2 drop-shadow-md group-hover:drop-shadow-xl transition-all">
                  <Image
                    src="/icons/training.png"
                    alt="Training"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-sm font-black uppercase text-slate-600">
                  Training
                </div>
              </button>
            )}
            {hasTournamentInfo && (
              <button
                onClick={() => setShowTournamentModal(true)}
                className="group transition-transform hover:scale-105 active:scale-95"
              >
                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-2 drop-shadow-md group-hover:drop-shadow-xl transition-all">
                  <Image
                    src="/icons/tournamentinfo.png"
                    alt="Tournament Info"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-sm font-black uppercase text-slate-600">
                  Tournaments
                </div>
              </button>
            )}
          </div>
        )}

        {/* Dynamic Team Grid */}
        {availableTeams.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {availableTeams.map((teamName) => {
              const teamInfo = currentAgeData[teamName];
              const theme = TEAM_THEMES[teamName] || TEAM_THEMES["Default"];
              const players = teamInfo.players || [];

              // Skip teams with no players
              if (players.length === 0) return null;

              return (
                <div
                  key={teamName}
                  className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden"
                >
                  <div
                    className="px-6 py-4 font-black text-center uppercase text-lg"
                    style={{ backgroundColor: theme.bg, color: theme.text }}
                  >
                    {activeAge} — {teamName}
                  </div>
                  <div className="p-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="pb-3 text-left text-xs uppercase text-slate-400 font-black">
                            Player Name
                          </th>
                          <th className="pb-3 text-right text-xs uppercase text-slate-400 font-black">
                            Club
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {players.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-3 font-bold text-sm">{p.name}</td>
                            <td className="py-3 flex items-center justify-end gap-2">
                              <span className="text-xs uppercase font-medium text-slate-600">
                                {p.club}
                              </span>
                              <ClubIcon club={p.club} icon={p.icon} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Staff Block */}
                    {teamInfo.staff &&
                      Object.keys(teamInfo.staff).length > 0 && (
                        <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="grid grid-cols-1 gap-3">
                            {["coach", "asstCoach", "manager", "umpire"].map(
                              (role) => {
                                const person = teamInfo.staff?.[role];
                                if (!person || !person.name) return null;

                                const labels: any = {
                                  coach: "Coach",
                                  asstCoach: "Asst Coach",
                                  manager: "Manager",
                                  umpire: "Umpire",
                                };
                                return (
                                  <div
                                    key={role}
                                    className="flex items-center justify-between border-l-4 border-[#06054e] pl-4 py-2 bg-white rounded-r-lg"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-xs uppercase text-slate-400 font-black">
                                        {labels[role]}
                                      </span>
                                      <span className="font-bold text-sm">
                                        {person.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500 font-medium">
                                        {person.club}
                                      </span>
                                      <ClubIcon
                                        club={person.club}
                                        icon={person.icon}
                                      />
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-8 bg-slate-100 rounded-3xl">
              <p className="text-xl font-black uppercase text-slate-400">
                No Teams Selected Yet
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Team selections will be announced soon
              </p>
            </div>
          </div>
        )}

        {/* SHADOWS & WITHDRAWN */}
        {(currentAgeData.shadowPlayers?.length > 0 ||
          currentAgeData.withdrawn?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {currentAgeData.shadowPlayers?.length > 0 && (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 shadow-sm p-8">
                <h3 className="text-2xl font-black uppercase text-slate-600 mb-6 flex items-center gap-3">
                  <span className="w-2 h-8 bg-slate-400 rounded-full"></span>{" "}
                  Shadow Players
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {currentAgeData.shadowPlayers.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <span className="font-bold text-sm text-slate-700">
                        {p.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-slate-500">
                          {p.club}
                        </span>
                        <ClubIcon club={p.club} icon={p.icon} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentAgeData.withdrawn?.length > 0 && (
              <div className="bg-red-50 rounded-3xl border-2 border-red-200 shadow-sm p-8">
                <h3 className="text-2xl font-black uppercase text-red-700 mb-6 flex items-center gap-3">
                  <span className="w-2 h-8 bg-red-400 rounded-full"></span>{" "}
                  Withdrawn
                </h3>
                <div className="space-y-3">
                  {currentAgeData.withdrawn.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-100 shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-red-900">
                          {p.name}
                        </span>
                        <span className="text-xs text-red-500 font-bold uppercase">
                          {p.reason || "Withdrawn"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-slate-500">
                          {p.club}
                        </span>
                        <ClubIcon club={p.club} icon={p.icon} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
