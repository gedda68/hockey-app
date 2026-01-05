"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * HELPER: Renders club icon only if valid club and icon path exist
 */
const ClubIcon = ({ club, icon }: { club: string; icon?: string }) => {
  if (!icon || club === "TBA" || club === "—" || !club) return null;
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
    <table className="table table-zebra w-full text-slate-700">
      <thead className="bg-slate-100 text-[#06054e]">
        <tr>
          <th className="font-black uppercase">{type}</th>
          <th className="font-black uppercase">Date</th>
          <th className="font-black uppercase">Time</th>
          <th className="font-black uppercase">Venue</th>
        </tr>
      </thead>
      <tbody className="font-medium">
        {data?.schedule?.length > 0 ? (
          data.schedule.map((item: any, idx: number) => (
            <tr key={idx} className={item.isSpecial ? "bg-red-50" : ""}>
              <td
                className={`font-bold ${
                  item.isSpecial ? "text-red-600 italic" : "text-indigo-600"
                }`}
              >
                {item.name}
              </td>
              <td>{item.date}</td>
              <td>{item.time}</td>
              <td className="font-bold">{item.venue}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="text-center py-4 italic opacity-50">
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
    <table className="table table-zebra w-full text-slate-700">
      <thead className="bg-slate-100 text-[#06054e]">
        <tr>
          <th className="font-black uppercase">Tournament</th>
          <th className="font-black uppercase">Date</th>
          <th className="font-black uppercase">City</th>
          <th className="font-black uppercase text-center">Info</th>
        </tr>
      </thead>
      <tbody className="font-medium">
        {data?.schedule?.length > 0 ? (
          data.schedule.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="font-bold text-indigo-600">{item.name}</td>
              <td>{item.date}</td>
              <td>{item.city}</td>
              <td className="text-center">
                {item.tournamentlink ? (
                  <Link
                    href={item.tournamentlink}
                    target="_blank"
                    className="btn btn-xs bg-[#06054e] text-white border-none hover:bg-indigo-700"
                  >
                    Link
                  </Link>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="text-center py-4 italic opacity-50">
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
  Default: { bg: "#475569", text: "white" },
};

export default function RepresentativePage() {
  const [activeAge, setActiveAge] = useState("Under 12");
  const [rosterData, setRosterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/rosters.json")
      .then((res) => res.json())
      .then((data) => {
        setRosterData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading rosters:", err);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06054e]">
        <span className="loading loading-ring loading-lg text-yellow-400"></span>
        <p className="text-sm font-bold uppercase tracking-widest text-white mt-4">
          Syncing Rosters...
        </p>
      </div>
    );

  const currentAgeData = rosterData?.[activeAge] || {};

  // Component for the Dynamic Alert with HTML support
  const ModalAlert = ({ info }: { info: any }) => {
    if (!info?.details) return null;
    return (
      <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
        <h3 className="text-sm font-black text-amber-900 uppercase italic tracking-tight mb-1">
          Important Notice:
        </h3>
        <div
          className="text-xs font-bold text-amber-800 leading-relaxed prose-sm"
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

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* HEADER HERO */}
      <div className="py-2 px-4">
        <div
          className="relative text-center mb-6 p-8 rounded-lg mx-4 shadow-lg overflow-hidden border-b-4 border-black/20"
          style={{
            backgroundImage: `url('/icons/bne-rep-16-2.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* DARK OVERLAY: ensures text is readable */}
          <div className="absolute inset-0 bg-[#06054e]/60 z-0"></div>

          {/* CONTENT: Positioned relative/z-10 to sit above the image/overlay */}
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black text-yellow-200 uppercase tracking-tighter leading-none drop-shadow-md">
              2026 Brisbane <br className="md:hidden" /> Representative Teams
            </h1>

            <div className="mt-4 inline-block px-4 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-[11px] font-bold text-white uppercase tracking-widest border border-white/10 shadow-lg">
              Section Last Updated: {currentAgeData.lastUpdated || "TBA"}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* TRIAL MODAL */}
      <dialog id="trial_modal" className="modal">
        <div className="modal-box bg-white border-2 border-yellow-400 max-w-2xl">
          <div className="flex justify-between items-start border-b pb-2 mb-4">
            <h3 className="font-black text-2xl uppercase text-[#06054e]">
              {activeAge} Trials
            </h3>
            <div className="badge bg-slate-100 border-none text-[10px] font-bold text-slate-500 uppercase p-3">
              Updated: {currentAgeData.lastUpdated}
            </div>
          </div>
          <ScheduleTable data={currentAgeData.trialInfo} type="Trial" />
          <ModalAlert info={currentAgeData.trialInfo} />
          <div className="modal-action">
            <form method="dialog">
              <button className="btn bg-[#06054e] text-white px-8 border-none hover:bg-slate-800">
                Close
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* TRAINING MODAL */}
      <dialog id="training_modal" className="modal">
        <div className="modal-box bg-white border-2 border-blue-400 max-w-2xl">
          <div className="flex justify-between items-start border-b pb-2 mb-4">
            <h3 className="font-black text-2xl uppercase text-[#06054e]">
              {activeAge} Training
            </h3>
            <div className="badge bg-slate-100 border-none text-[10px] font-bold text-slate-500 uppercase p-3">
              Updated: {currentAgeData.lastUpdated}
            </div>
          </div>
          <ScheduleTable data={currentAgeData.trainingInfo} type="Session" />
          <ModalAlert info={currentAgeData.trainingInfo} />
          <div className="modal-action">
            <form method="dialog">
              <button className="btn bg-[#06054e] text-white px-8 border-none hover:bg-slate-800">
                Close
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* TOURNAMENT MODAL */}
      <dialog id="tournament_modal" className="modal">
        <div className="modal-box bg-white border-2 border-indigo-400 max-w-2xl">
          <div className="flex justify-between items-start border-b pb-2 mb-4">
            <h3 className="font-black text-2xl uppercase text-[#06054e]">
              {activeAge} Tournament
            </h3>
            <div className="badge bg-slate-100 border-none text-[10px] font-bold text-slate-500 uppercase p-3">
              Updated: {currentAgeData.lastUpdated}
            </div>
          </div>
          <TournamentTable data={currentAgeData.tournamentInfo} />
          <ModalAlert info={currentAgeData.tournamentInfo} />
          <div className="modal-action">
            <form method="dialog">
              <button className="btn bg-[#06054e] text-white px-8 border-none hover:bg-slate-800">
                Close
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-[1600px] mx-auto px-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {AGE_GROUPS.map((age) => (
            <button
              key={age}
              onClick={() => setActiveAge(age)}
              className={`btn btn-md rounded-full px-8 transition-all ${
                activeAge === age
                  ? "bg-[#06054e] text-white shadow-xl scale-105"
                  : "bg-base-200 text-[#06054e]"
              }`}
            >
              {age}
            </button>
          ))}
        </div>

        {/* Action Buttons using Custom Icons */}
        <div className="flex flex-wrap justify-center gap-8 mb-16 items-center">
          <button
            onClick={() => (window as any).trial_modal.showModal()}
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
          </button>
          <button
            onClick={() => (window as any).training_modal.showModal()}
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
          </button>
          <button
            onClick={() => (window as any).tournament_modal.showModal()}
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
          </button>
        </div>

        {/* Dynamic Team Grid */}
        <div className="flex flex-wrap justify-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {availableTeams.map((teamName) => {
            const teamInfo = currentAgeData[teamName];
            const theme = TEAM_THEMES[teamName] || TEAM_THEMES["Default"];
            const players = (teamInfo.players || []).slice(0, 18);

            return (
              <div
                key={teamName}
                className="w-full md:w-[380px] card bg-base-100 shadow-2xl border border-base-200 overflow-hidden"
              >
                <div
                  className="px-6 py-4 font-black text-center uppercase text-lg"
                  style={{ backgroundColor: theme.bg, color: theme.text }}
                >
                  {activeAge} — {teamName}
                </div>
                <div className="p-2">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="text-[11px] uppercase opacity-60">
                          Player Name
                        </th>
                        <th className="text-[11px] uppercase opacity-60 text-right">
                          Club
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p: any, i: number) => (
                        <tr
                          key={i}
                          className="hover:bg-base-200/50 border-b border-base-100 last:border-0"
                        >
                          <td className="font-bold text-[13px] py-2">
                            {p.name}
                          </td>
                          <td className="flex items-center justify-end gap-2">
                            <span className="text-[10px] uppercase font-medium">
                              {p.club}
                            </span>
                            <ClubIcon club={p.club} icon={p.icon} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Staff Block */}
                  <div className="mt-4 p-4 bg-[#06054e]/5 rounded-xl border border-[#06054e]/10">
                    <div className="grid grid-cols-1 gap-2">
                      {["coach", "asstCoach", "manager", "umpire"].map(
                        (role) => {
                          const person = teamInfo.staff?.[role] || {
                            name: "TBA",
                            club: "TBA",
                          };
                          const labels: any = {
                            coach: "Coach",
                            asstCoach: "Asst Coach",
                            manager: "Manager",
                            umpire: "Umpire",
                          };
                          return (
                            <div
                              key={role}
                              className="flex items-center justify-between border-l-4 border-indigo-500 pl-3 py-1 bg-white/50 rounded-r-md"
                            >
                              <div className="flex flex-col">
                                <span className="font-black opacity-40 text-[9px] uppercase">
                                  {labels[role]}
                                </span>
                                <span className="font-bold text-xs">
                                  {person.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] opacity-40 font-medium">
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
                </div>
              </div>
            );
          })}
        </div>

        {/* SHADOWS & WITHDRAWN */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card bg-base-100 border border-dashed border-slate-300 shadow-sm p-6">
            <h3 className="text-xl font-black uppercase text-slate-600 mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-slate-400 rounded-full"></span> Shadow
              Players
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentAgeData.shadowPlayers?.length > 0 ? (
                currentAgeData.shadowPlayers.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <span className="font-bold text-sm text-slate-700">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase opacity-60">
                        {p.club}
                      </span>
                      <ClubIcon club={p.club} icon={p.icon} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm italic opacity-40">None listed.</p>
              )}
            </div>
          </div>

          <div className="card bg-red-50 border border-red-100 shadow-sm p-6">
            <h3 className="text-xl font-black uppercase text-red-700 mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-red-400 rounded-full"></span>{" "}
              Withdrawn
            </h3>
            <div className="space-y-2">
              {currentAgeData.withdrawn?.length > 0 ? (
                currentAgeData.withdrawn.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100 shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-red-900">
                        {p.name}
                      </span>
                      <span className="text-[9px] text-red-500 font-bold uppercase">
                        {p.reason || "Withdrawn"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase opacity-60">
                        {p.club}
                      </span>
                      <ClubIcon club={p.club} icon={p.icon} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm italic opacity-40">None listed.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
