"use client";

import Image from "next/image";

const GoalIcon = () => (
  <span className="text-blue-500 text-[12px] flex-shrink-0">⚽</span>
);
const GreenCard = () => (
  <div className="w-2.5 h-3.5 bg-green-500 rounded-sm flex-shrink-0 shadow-sm" />
);
const YellowCard = () => (
  <div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm flex-shrink-0 shadow-sm" />
);
const RedCard = () => (
  <div className="w-2.5 h-3.5 bg-red-600 rounded-sm flex-shrink-0 shadow-sm" />
);

export default function MatchModal({
  match,
  stats,
  onClose,
}: {
  match: any;
  stats: any;
  onClose: () => void;
}) {
  if (!match) return null;

  // 1. Combine and Sort Events
  const allEvents = [
    ...(stats?.goals?.map((g: any) => ({ ...g, eventType: "goal" })) || []),
    ...(stats?.cards?.map((c: any) => ({ ...c, eventType: "card" })) || []),
  ].sort((a, b) => a.time - b.time);

  // 2. Define Quarter Logic
  const quarters = [
    { label: "1st Quarter", range: [0, 15] },
    { label: "2nd Quarter", range: [16, 30] },
    { label: "3rd Quarter", range: [31, 45] },
    { label: "4th Quarter", range: [46, 100] }, // 100 to catch injury time
  ];

  const renderIcon = (event: any) => {
    if (event.eventType === "goal") return <GoalIcon />;
    if (event.type === "Green") return <GreenCard />;
    if (event.type === "Yellow") return <YellowCard />;
    return <RedCard />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#06054e] p-6 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
              {match.division} • {match.round}
            </span>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">
              Match Timeline
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-red-600 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-8">
          {/* Scoreboard */}
          <div className="flex items-center justify-between mb-12 border-b border-slate-100 pb-8">
            <div className="flex flex-col items-center w-1/3">
              <div className="relative w-16 h-16 mb-2">
                <Image
                  src={match.homeTeamIcon}
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 text-center leading-tight">
                {match.homeTeam}
              </span>
              <span className="text-5xl font-black text-[#06054e]">
                {match.homeScore}
              </span>
            </div>
            <div className="text-[10px] font-black text-slate-300 italic uppercase">
              Final
            </div>
            <div className="flex flex-col items-center w-1/3">
              <div className="relative w-16 h-16 mb-2">
                <Image
                  src={match.awayTeamIcon}
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 text-center leading-tight">
                {match.awayTeam}
              </span>
              <span className="text-5xl font-black text-[#06054e]">
                {match.awayScore}
              </span>
            </div>
          </div>

          {/* CHRONOLOGICAL TIMELINE WITH QUARTERS */}
          <div className="relative before:absolute before:inset-0 before:left-1/2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
            {quarters.map((q, qIdx) => {
              const quarterEvents = allEvents.filter(
                (e) => e.time >= q.range[0] && e.time <= q.range[1]
              );

              return (
                <div key={q.label} className="mb-12 last:mb-0">
                  {/* Quarter Divider */}
                  <div className="relative z-10 flex justify-center mb-8">
                    <span className="bg-slate-100 text-[#06054e] text-[9px] font-black uppercase px-4 py-1 rounded-full border border-slate-200 tracking-[0.2em]">
                      {q.label}
                    </span>
                  </div>

                  {/* Quarter Events */}
                  <div className="space-y-6">
                    {quarterEvents.length > 0 ? (
                      quarterEvents.map((event, i) => {
                        const isHome = event.team === match.homeTeam;
                        return (
                          <div
                            key={i}
                            className={`relative flex items-center justify-between gap-8 ${
                              isHome ? "flex-row" : "flex-row-reverse"
                            }`}
                          >
                            <div
                              className={`w-[45%] flex items-center gap-4 ${
                                isHome ? "flex-row" : "flex-row-reverse"
                              }`}
                            >
                              <div
                                className={`flex flex-col ${
                                  isHome
                                    ? "items-start text-left"
                                    : "items-end text-right"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isHome && renderIcon(event)}
                                  <span className="text-xs font-black uppercase tracking-tight text-[#06054e]">
                                    #{event.playerNum} {event.playerName}
                                  </span>
                                  {!isHome && renderIcon(event)}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  {event.eventType === "goal"
                                    ? event.type
                                    : `${event.type} Card`}
                                </span>
                              </div>
                            </div>
                            <div className="relative z-10 w-9 h-9 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm">
                              <span className="text-[10px] font-black text-[#06054e]">
                                {event.time}'
                              </span>
                            </div>
                            <div className="w-[45%]" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-slate-200 text-[8px] font-black uppercase tracking-widest">
                        No events in {q.label}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SHOOTOUT SECTION */}
          {match.shootOutRequired && stats?.shootout && (
            <div className="mt-16 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl italic">
                SO
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 text-center mb-8">
                Shootout Sequence
              </h3>
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-3">
                  {stats.shootout.home.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase">
                          #{s.playerNum} {s.playerName}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase">
                          {s.type}
                        </span>
                      </div>
                      <span
                        className={`text-lg leading-none ${
                          s.result === "Goal"
                            ? "text-green-400"
                            : "text-red-500"
                        }`}
                      >
                        {s.result === "Goal" ? "●" : "○"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {stats.shootout.away.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 flex-row-reverse"
                    >
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black uppercase">
                          {s.playerName} #{s.playerNum}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase">
                          {s.type}
                        </span>
                      </div>
                      <span
                        className={`text-lg leading-none ${
                          s.result === "Goal"
                            ? "text-green-400"
                            : "text-red-500"
                        }`}
                      >
                        {s.result === "Goal" ? "●" : "○"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center flex-shrink-0">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            📍 {match.location}
          </p>
        </div>
      </div>
    </div>
  );
}
