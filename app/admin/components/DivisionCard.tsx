// app/admin/components/DivisionCard.tsx
// UPDATED: Added SelectorsSection

import { Roster, Player, Staff, Selector } from "../types";
import TeamSection from "./TeamSection";
import ShadowPlayersSection from "./ShadowPlayerSection";
import WithdrawnSection from "./WithdrawnSection";
import SelectorsSection from "./SelectorsSection";

interface DivisionCardProps {
  roster: Roster;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onAddTeam: () => void;
  onAddPlayer: (teamName: string) => void;
  onEditPlayer: (teamName: string, playerIndex: number, player: Player) => void;
  onDeletePlayer: (
    ageGroup: string,
    teamName: string,
    playerIndex: number
  ) => void;
  onEditStaff: (teamName: string, role: string, staff: Staff) => void;
  onEditShadowPlayer: (playerIndex: number, player: Player) => void;
  onAddSelector: () => void;
  onEditSelector: (selectorIndex: number, selector: Selector) => void;
  onDeleteSelector: (selectorIndex: number) => void;
  onSetChair: (selectorIndex: number) => void;
  dragDrop: any;
}

export default function DivisionCard({
  roster,
  isExpanded,
  onToggleExpand,
  onDelete,
  onAddTeam,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onEditStaff,
  onEditShadowPlayer,
  onAddSelector,
  onEditSelector,
  onDeleteSelector,
  onSetChair,
  dragDrop,
}: DivisionCardProps) {
  const totalPlayers = roster.teams.reduce(
    (sum, team) => sum + team.players.length,
    0
  );

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#06054e] to-[#0a0870] p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-black uppercase text-white">
              {roster.ageGroup}
            </h2>
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-slate-300">
                👥 {totalPlayers} players
              </span>
              <span className="text-sm text-slate-300">
                🏆 {roster.teams.length} teams
              </span>
              <span className="text-sm text-slate-300">
                👔 {roster.selectors?.length || 0}/5 selectors
              </span>
              <span className="text-sm text-slate-300">
                📅 {roster.lastUpdated}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onAddTeam}
              className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-black uppercase hover:bg-green-700 transition-all"
            >
              + Team
            </button>

            <button
              onClick={onToggleExpand}
              className="px-4 py-2 bg-white text-[#06054e] rounded-full text-sm font-black uppercase hover:bg-slate-100 transition-all"
            >
              {isExpanded ? "▲ Collapse" : "▼ Expand"}
            </button>

            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-black uppercase hover:bg-red-700 transition-all"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Selectors Section - NEW! */}
          <SelectorsSection
            selectors={roster.selectors || []}
            ageGroup={roster.ageGroup}
            onAdd={onAddSelector}
            onEdit={onEditSelector}
            onDelete={onDeleteSelector}
            onSetChair={onSetChair}
          />

          {/* Teams */}
          <div className="space-y-4">
            {roster.teams.map((team, teamIndex) => (
              <TeamSection
                key={teamIndex}
                team={team}
                ageGroup={roster.ageGroup}
                onAddPlayer={() => onAddPlayer(team.name)}
                onEditPlayer={(playerIndex, player) =>
                  onEditPlayer(team.name, playerIndex, player)
                }
                onDeletePlayer={(playerIndex) =>
                  onDeletePlayer(roster.ageGroup, team.name, playerIndex)
                }
                onEditStaff={(role, staff) =>
                  onEditStaff(team.name, role, staff)
                }
                dragDrop={dragDrop}
              />
            ))}

            {roster.teams.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                <p className="text-slate-400 font-bold">No teams yet</p>
                <button
                  onClick={onAddTeam}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-full font-black uppercase text-sm hover:bg-green-700"
                >
                  + Add First Team
                </button>
              </div>
            )}
          </div>

          {/* Shadow Players */}
          <ShadowPlayersSection
            shadowPlayers={roster.shadowPlayers}
            ageGroup={roster.ageGroup}
            onEdit={onEditShadowPlayer}
            onDelete={dragDrop.handleDeleteShadowPlayer}
            dragDrop={dragDrop}
          />

          {/* Withdrawn */}
          <WithdrawnSection
            withdrawn={roster.withdrawn}
            ageGroup={roster.ageGroup}
            onDelete={dragDrop.handleDeleteWithdrawnPlayer}
            dragDrop={dragDrop}
          />
        </div>
      )}
    </div>
  );
}
