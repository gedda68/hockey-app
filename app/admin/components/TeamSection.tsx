// app/admin/components/TeamSection.tsx

import Image from "next/image";
import { Team, Player, Staff } from "../types";
import StaffSection from "./StaffSection";
import SelectorsSection from "./SelectorsSection";

interface TeamSectionProps {
  team: Team;
  ageGroup: string;
  onAddPlayer: () => void;
  onEditPlayer: (playerIndex: number, player: Player) => void;
  onDeletePlayer: (playerIndex: number) => void;
  onEditStaff: (role: string, staff: Staff) => void;
  dragDrop: any;
}

export default function TeamSection({
  team,
  ageGroup,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onEditStaff,
  dragDrop,
}: TeamSectionProps) {
  return (
    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase text-[#06054e]">
            {team.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {team.players.length}{" "}
            {team.players.length === 1 ? "player" : "players"}
          </p>
        </div>
        <button
          onClick={onAddPlayer}
          className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-black uppercase hover:bg-blue-700 transition-all"
        >
          + Player
        </button>
      </div>

      {/* Players Drop Zone */}
      <div
        onDragOver={dragDrop.handleDragOver}
        onDrop={(e) => dragDrop.handleDropOnTeam(e, team.name, ageGroup)}
        className="min-h-[100px] p-4 bg-white rounded-xl border-2 border-dashed border-blue-400 mb-6"
      >
        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-blue-900">
          <span>📥 DROP ZONE</span>
          <span className="text-xs text-slate-500">(Drag players here)</span>
        </div>

        {/* Players Table */}
        {team.players.length > 0 ? (
          <div className="space-y-2">
            {team.players.map((player, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) =>
                  dragDrop.handleDragStart(
                    e,
                    player,
                    "team",
                    idx,
                    ageGroup,
                    team.name
                  )
                }
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg text-slate-400">⋮⋮</span>

                  {player.icon && (
                    <div className="w-8 h-8 relative">
                      <Image
                        src={player.icon}
                        alt={player.club}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}

                  <div>
                    <div className="font-bold text-sm">{player.name}</div>
                    <div className="text-xs text-slate-500">{player.club}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditPlayer(idx, player)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-black uppercase hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeletePlayer(idx)}
                    className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm font-bold">No players yet</p>
            <p className="text-xs mt-1">Add a player or drag one here</p>
          </div>
        )}
      </div>

      {/* Staff Section */}
      <StaffSection
        staff={team.staff}
        onEdit={onEditStaff}
        onDelete={(role) => {
          // Delete handler passed from parent
        }}
      />

      <SelectorsSection />
    </div>
  );
}
