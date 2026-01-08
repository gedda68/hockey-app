// components/matches/StandingsWidget.tsx
import React from "react";
import Image from "next/image";

interface StandingsWidgetProps {
  standings: any;
  division: string;
}

export default function StandingsWidget({
  standings,
  division,
}: StandingsWidgetProps) {
  const currentStandings = standings.divisions.find(
    (d: any) => d.divisionName === division
  );

  return (
    <div className="sticky top-8 bg-[#06054e] rounded-[32px] p-8 shadow-2xl text-white overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-xl font-black uppercase italic mb-6 border-b border-white/10 pb-4">
          {division === "All" ? "Select Division" : `${division} Table`}
        </h2>

        {currentStandings ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-[8px] font-black uppercase text-blue-400 px-2 mb-2">
              <div className="col-span-2">Pos</div>
              <div className="col-span-7">Club</div>
              <div className="col-span-3 text-right">Pts</div>
            </div>

            {currentStandings.teams.map((team: any) => (
              <div
                key={team.club}
                className="grid grid-cols-12 items-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors text-[10px] font-bold"
              >
                <div className="col-span-2 text-slate-400 font-black">
                  {team.pos}
                </div>
                <div className="col-span-7 flex items-center gap-3 uppercase">
                  <div className="relative w-4 h-4">
                    <Image
                      src={team.icon}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="truncate">{team.club}</span>
                </div>
                <div className="col-span-3 text-right font-black text-blue-400 text-xs">
                  {team.pts}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-black italic">
              Table data will appear when a division is selected
            </p>
          </div>
        )}
      </div>

      {/* Decorative Background Element */}
      <div className="absolute -bottom-10 -right-10 text-white/5 font-black text-9xl italic select-none">
        {division !== "All" ? division.charAt(0) : "H"}
      </div>
    </div>
  );
}
