// app/admin/components/TeamSection.tsx

import Image from "next/image";
import { Team, Player, Staff } from "../types";
import StaffSection from "./StaffSection";

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
  // Check if a player is currently being dragged to highlight the drop zone
  const isDragging = !!dragDrop.draggedPlayer;
  const isCorrectAgeGroup = dragDrop.draggedPlayer?.ageGroup === ageGroup;

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
        className={`min-h-[120px] p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragging && isCorrectAgeGroup
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-slate-300 bg-white"
        }`}
      >
        <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase tracking-widest text-blue-900">
          <span
            className={isDragging && isCorrectAgeGroup ? "animate-pulse" : ""}
          >
            📥 {isDragging ? "Drop Player Here" : "Team Roster"}
          </span>
        </div>

        {/* Players List */}
        {team.players.length > 0 ? (
          <div className="space-y-2">
            {team.players.map((player, idx) => (
              <div
                key={`${player.name}-${idx}`}
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
                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg text-slate-300 group-hover:text-blue-400 transition-colors">
                    ⋮⋮
                  </span>

                  {player.icon && (
                    <div className="w-8 h-8 relative flex-shrink-0">
                      <Image
                        src={player.icon}
                        alt={player.club || "Club Icon"}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}

                  <div>
                    <div className="font-bold text-sm text-[#06054e]">
                      {player.name}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">
                      {player.club}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditPlayer(idx, player)}
                    className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-blue-600 hover:text-white transition-all"
                    title="Edit Player"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeletePlayer(idx)}
                    className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-red-600 hover:text-white transition-all"
                    title="Delete Player"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs font-bold uppercase tracking-widest">
              Empty Team
            </p>
            <p className="text-[10px] mt-1">
              Add players or drag them from shadows/teams
            </p>
          </div>
        )}
      </div>

      {/* Staff Section */}
      <StaffSection
        staff={team.staff}
        onEdit={onEditStaff}
        onDelete={(role) => {
          // This should trigger the same handleUpdateStaff logic but with null values
          onEditStaff(role, { name: "", email: "", phone: "" });
        }}
      />
    </div>
  );
}
