"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  UserCheck,
  Activity,
  Trophy,
  ChevronLeft,
  Loader2,
  Calendar,
  Archive,
} from "lucide-react";

// --- DYNAMIC COLOR ENGINE ---
const getTeamTheme = (teamName: string) => {
  const name = teamName.toLowerCase();
  if (name.includes("green")) return { bg: "#15803d", text: "white" };
  if (name.includes("yellow") || name.includes("gold"))
    return { bg: "#facc15", text: "black" };
  if (name.includes("blue")) return { bg: "#1d4ed8", text: "white" };
  if (name.includes("red")) return { bg: "#b91c1c", text: "white" };
  if (name.includes("white")) return { bg: "#ffffff", text: "black" };
  if (name.includes("orange")) return { bg: "#ea580c", text: "white" };
  if (name.includes("purple")) return { bg: "#7c3aed", text: "white" };
  if (name.includes("pink")) return { bg: "#db2777", text: "white" };
  if (name.includes("maroon")) return { bg: "#800000", text: "white" };
  if (name.includes("navy")) return { bg: "#000080", text: "white" };
  if (name.includes("black")) return { bg: "#000000", text: "white" };

  if (name.includes("brisbane 1")) return { bg: "#000080", text: "white" };
  if (name.includes("brisbane 2")) return { bg: "#15803d", text: "white" };
  if (name.includes("brisbane 3")) return { bg: "#facc15", text: "#000080" };
  if (name.includes("brisbane 4")) return { bg: "#1d4ed8", text: "white" };

  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return { bg: `hsl(${h}, 60%, 40%)`, text: "white" };
};

// --- SUB-COMPONENTS ---
const ClubIcon = ({ club, icon }: { club: string; icon?: string }) => {
  if (!icon || ["TBA", "—", ""].includes(club)) return null;
  return (
    <div className="relative w-5 h-5 flex-shrink-0">
      <Image src={icon} alt={club} fill className="object-contain" />
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, borderColor, children }: any) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`sticky top-0 bg-white border-b-4 ${borderColor} px-8 py-6 flex justify-between items-start rounded-t-3xl z-10`}
        >
          <h3 className="text-2xl md:text-3xl font-black uppercase text-[#06054e]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};

const ScheduleTable = ({ data }: { data: any }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full text-slate-700">
      <thead className="bg-slate-50">
        <tr>
          {["Event", "Date", "Time", "Venue"].map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data?.schedule?.map((item: any, idx: number) => (
          <tr
            key={idx}
            className={item.isSpecial ? "bg-red-50" : "hover:bg-slate-50/50"}
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
        ))}
      </tbody>
    </table>
  </div>
);

export default function RepresentativePage() {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [allRosters, setAllRosters] = useState<any[]>([]); // New state for pre-loaded data
  const [activeAge, setActiveAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    trials: false,
    training: false,
    tournament: false,
  });

  // SINGLE FETCH LOGIC: Fetch everything for the selected year
  useEffect(() => {
    async function fetchRosterData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rosters?year=${selectedYear}`, {
          cache: "no-store",
        });
        const json = await res.json();

        setSeasons(json.seasons || []);
        setAllRosters(json.rosters || []);

        // Default to first available age group if not set or not in current list
        const ageList = json.ageGroups || [];
        if (ageList.length > 0) {
          if (!ageList.includes(activeAge)) {
            setActiveAge(ageList[0]);
          }
        } else {
          setActiveAge("");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRosterData();
  }, [selectedYear]);

  // Derived data based on active tab
  const activeData = allRosters.find((r) => r.ageGroup === activeAge);

  const toggleModal = (key: string, val: boolean) =>
    setModals((prev) => ({ ...prev, [key]: val }));

  if (loading && allRosters.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06054e]">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-yellow-100">
      {/* Header */}
      <div className="bg-[#06054e] text-white pt-8 pb-20 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-yellow-400 flex items-center justify-center gap-2 mb-8 group transition-colors"
          >
            <ChevronLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />{" "}
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/20 mb-6 group hover:bg-white/20 transition-all">
            <Calendar size={16} className="text-yellow-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-black uppercase text-xs tracking-widest focus:outline-none cursor-pointer"
            >
              {seasons.map((year) => (
                <option key={year} value={year} className="text-black">
                  {year} Season
                </option>
              ))}
            </select>
            <Archive size={14} className="text-white/40" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-yellow-200 uppercase tracking-tighter mb-4">
            {activeAge || "Rep"} Teams
          </h1>
          <span className="px-4 py-1.5 bg-black/30 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
            Updated: {activeData?.lastUpdated || "TBA"}
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 -mt-10">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-16">
          {allRosters.length > 0
            ? allRosters.map((r) => (
                <button
                  key={r.ageGroup}
                  onClick={() => setActiveAge(r.ageGroup)}
                  className={`px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all shadow-lg ${
                    activeAge === r.ageGroup
                      ? "bg-yellow-400 text-[#06054e] scale-105"
                      : "bg-white text-slate-400 hover:text-[#06054e]"
                  }`}
                >
                  {r.ageGroup}
                </button>
              ))
            : !loading && (
                <div className="bg-white p-8 rounded-3xl shadow-xl text-slate-400 font-bold uppercase text-sm italic">
                  No rosters found for the {selectedYear} season.
                </div>
              )}
        </div>

        {/* Action Icons */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-16 mb-20">
          {[
            {
              id: "trials",
              label: "Trials",
              icon: UserCheck,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              info: activeData?.trialInfo,
            },
            {
              id: "training",
              label: "Training",
              icon: Activity,
              color: "text-blue-500",
              bgColor: "bg-blue-50",
              info: activeData?.trainingInfo,
            },
            {
              id: "tournament",
              label: "Tournament",
              icon: Trophy,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              info: activeData?.tournamentInfo,
            },
          ].map(
            (btn) =>
              btn.info?.schedule?.length > 0 && (
                <button
                  key={btn.id}
                  onClick={() => toggleModal(btn.id, true)}
                  className="group flex flex-col items-center"
                >
                  <div
                    className={`w-20 h-20 md:w-28 md:h-28 mb-3 rounded-[2.5rem] ${btn.bgColor} flex items-center justify-center transition-all group-hover:-translate-y-2 group-hover:shadow-2xl border-2 border-transparent group-hover:border-current`}
                  >
                    <btn.icon
                      size={44}
                      strokeWidth={2.5}
                      className={btn.color}
                    />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-[#06054e]">
                    {btn.label}
                  </span>
                </button>
              )
          )}
        </div>

        {/* Loading overlay for tab switching */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#06054e] animate-spin mb-4" />
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
              Loading Roster...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              {activeData?.teams?.map((team: any, tIdx: number) => {
                const theme = getTeamTheme(team.name);
                return (
                  <div
                    key={tIdx}
                    className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-2xl"
                  >
                    <div
                      className="px-6 py-5 font-black text-center uppercase text-xl"
                      style={{ backgroundColor: theme.bg, color: theme.text }}
                    >
                      {team.name}
                    </div>
                    <div className="p-8 flex-grow">
                      <table className="w-full mb-8">
                        <tbody className="divide-y divide-slate-100">
                          {team.players?.map((p: any, pIdx: number) => (
                            <tr
                              key={pIdx}
                              className="group hover:bg-slate-50/80"
                            >
                              <td className="py-3 font-bold text-sm text-slate-800">
                                {p.name}
                              </td>
                              <td className="py-3 text-right flex items-center justify-end gap-3">
                                <span className="text-[10px] font-black uppercase text-slate-400">
                                  {p.club}
                                </span>
                                <ClubIcon club={p.club} icon={p.icon} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {team.staff && (
                        <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          {Object.entries(team.staff).map(
                            ([role, person]: any) =>
                              person?.name && (
                                <div
                                  key={role}
                                  className="flex justify-between items-center bg-white p-3 px-4 rounded-xl shadow-sm border border-slate-100"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase text-slate-400 mb-1">
                                      {role.replace(/([A-Z])/g, " $1")}
                                    </span>
                                    <span className="text-sm font-bold text-[#06054e]">
                                      {person.name}
                                    </span>
                                  </div>
                                  <ClubIcon
                                    club={person.club}
                                    icon={person.icon}
                                  />
                                </div>
                              )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {["shadowPlayers", "withdrawn"].map((key) => {
                const list = activeData?.[key] || [];
                if (list.length === 0) return null;
                const isWithdrawn = key === "withdrawn";
                return (
                  <div
                    key={key}
                    className={`rounded-[2.5rem] border-2 border-dashed p-10 ${
                      isWithdrawn
                        ? "bg-red-50 border-red-100"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <h3
                      className={`text-3xl font-black uppercase mb-8 flex items-center gap-4 ${
                        isWithdrawn ? "text-red-700" : "text-[#06054e]"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-10 rounded-full ${
                          isWithdrawn ? "bg-red-400" : "bg-slate-300"
                        }`}
                      />
                      {key.replace(/([A-Z])/g, " $1")}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {list.map((p: any, i: number) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-5 rounded-2xl border ${
                            isWithdrawn
                              ? "bg-white border-red-50"
                              : "bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span
                              className={`font-bold text-sm ${
                                isWithdrawn ? "line-through opacity-50" : ""
                              }`}
                            >
                              {p.name}
                            </span>
                            {isWithdrawn && p.reason && (
                              <span className="text-[10px] font-black text-red-500 uppercase">
                                {p.reason}
                              </span>
                            )}
                          </div>
                          <ClubIcon club={p.club} icon={p.icon} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <Modal
        isOpen={modals.trials}
        onClose={() => toggleModal("trials", false)}
        title={activeData?.trialInfo?.header || "Trials"}
        borderColor="border-yellow-400"
      >
        <ScheduleTable data={activeData?.trialInfo} />
        {activeData?.trialInfo?.details && (
          <div
            className="mt-8 p-6 bg-amber-50 rounded-2xl text-sm font-bold border-l-4 border-amber-400"
            dangerouslySetInnerHTML={{ __html: activeData.trialInfo.details }}
          />
        )}
      </Modal>

      <Modal
        isOpen={modals.training}
        onClose={() => toggleModal("training", false)}
        title={activeData?.trainingInfo?.header || "Training"}
        borderColor="border-blue-400"
      >
        <ScheduleTable data={activeData?.trainingInfo} />
        {activeData?.trainingInfo?.details && (
          <div
            className="mt-8 p-6 bg-blue-50 rounded-2xl text-sm font-bold border-l-4 border-blue-400"
            dangerouslySetInnerHTML={{
              __html: activeData.trainingInfo.details,
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={modals.tournament}
        onClose={() => toggleModal("tournament", false)}
        title={activeData?.tournamentInfo?.header || "Tournament"}
        borderColor="border-indigo-400"
      >
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-slate-700">
            <thead className="bg-slate-50">
              <tr>
                {["Tournament", "Date", "City", "Link"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeData?.tournamentInfo?.schedule?.map(
                (t: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-[#06054e]">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.date}</td>
                    <td className="px-4 py-3 text-sm">{t.city}</td>
                    <td className="px-4 py-3 text-center">
                      {t.tournamentlink && (
                        <a
                          href={t.tournamentlink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-2 bg-[#06054e] text-white rounded-full text-xs font-black uppercase"
                        >
                          Link
                        </a>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {activeData?.tournamentInfo?.details && (
          <div
            className="mt-8 p-6 bg-indigo-50 rounded-2xl text-sm font-bold border-l-4 border-indigo-400"
            dangerouslySetInnerHTML={{
              __html: activeData.tournamentInfo.details,
            }}
          />
        )}
      </Modal>
    </div>
  );
}
