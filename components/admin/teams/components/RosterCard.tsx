// components/admin/teams/components/RosterCard.tsx
// Roster card with CLUB COLORS and CLUB PLAYER filtering

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Plus, Users } from "lucide-react";
import type { TeamRoster } from "../types/team.types";

interface RosterCardProps {
  roster: TeamRoster;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onAddTeam: () => void;
  onAddPlayer: (teamName: string) => void;
  onEditPlayer?: (teamName: string, playerIndex: number, player: any) => void;
  onDeletePlayer?: (
    rosterId: string,
    teamName: string,
    playerIndex: number,
  ) => void;
  onEditStaff?: (teamName: string, role: string, staff: any) => void;
}

export default function RosterCard({
  roster,
  isExpanded,
  onToggleExpand,
  onDelete,
  onAddTeam,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onEditStaff,
}: RosterCardProps) {
  // Get club colors (populated from API)
  const primaryColor = roster.clubColors?.primary || "#06054e";
  const secondaryColor = roster.clubColors?.secondary || "#1e40af";

  // Calculate total players across all teams
  const totalPlayers = roster.teams.reduce(
    (sum, team) => sum + team.players.length,
    0,
  );
  const totalShadow = roster.shadowPlayers?.length || 0;
  const totalWithdrawn = roster.withdrawn?.length || 0;

  // Generate roster display name
  const getRosterName = () => {
    const parts = [
      roster.category.charAt(0).toUpperCase() + roster.category.slice(1),
      roster.division,
      roster.gender.charAt(0).toUpperCase() +
        roster.gender.slice(1).replace("s", "'s"),
    ];
    if (roster.grade) parts.push(`(${roster.grade})`);
    return parts.join(" ");
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-900/5 overflow-hidden border border-slate-100">
      {/* Header with Club Colors */}
      <div
        className="relative h-24 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        {/* Club Logo if available */}
        {roster.clubLogo && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <img
              src={roster.clubLogo}
              alt={roster.clubName}
              className="h-16 w-auto object-contain"
            />
          </div>
        )}

        {/* Roster Info */}
        <div className="relative h-full flex items-center justify-between px-8">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-1">
              {getRosterName()}
            </h3>
            <p className="text-white/90 font-bold text-sm">
              {roster.clubName} • {roster.season}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-black text-white">
                {roster.teams.length}
              </div>
              <div className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Teams
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-white">
                {totalPlayers}
              </div>
              <div className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Players
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Expand/Collapse */}
          <button
            onClick={onToggleExpand}
            className="px-4 py-2 bg-white hover:bg-slate-100 rounded-xl font-bold text-sm text-slate-700 transition-all flex items-center gap-2 border border-slate-200"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Expand
              </>
            )}
          </button>

          {/* Shadow Players Badge */}
          {totalShadow > 0 && (
            <div className="px-4 py-2 bg-amber-100 rounded-xl border border-amber-200">
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider">
                {totalShadow} Unallocated
              </span>
            </div>
          )}

          {/* Withdrawn Badge */}
          {totalWithdrawn > 0 && (
            <div className="px-4 py-2 bg-red-100 rounded-xl border border-red-200">
              <span className="text-xs font-black uppercase text-red-700 tracking-wider">
                {totalWithdrawn} Withdrawn
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Add Team */}
          <button
            onClick={onAddTeam}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg shadow-green-900/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Team
          </button>

          {/* Delete Roster */}
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={18} className="text-red-600" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-8">
          {roster.teams.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-black uppercase text-slate-300 tracking-tight mb-2">
                No Teams Yet
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Add a team to get started with this roster.
              </p>
              <button
                onClick={onAddTeam}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg shadow-green-900/20"
              >
                + Add First Team
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {roster.teams.map((team, teamIndex) => (
                <div
                  key={team.name}
                  className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200"
                >
                  {/* Team Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <h4 className="text-xl font-black text-slate-900">
                        {team.name}
                      </h4>
                      <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                        {team.players.length} Players
                      </span>
                    </div>
                    <button
                      onClick={() => onAddPlayer(team.name)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Add Player
                    </button>
                  </div>

                  {/* Coaching Staff */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Head Coach */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                        Head Coach
                      </div>
                      {team.coach ? (
                        <button
                          onClick={() =>
                            onEditStaff?.(team.name, "coach", team.coach)
                          }
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left w-full"
                        >
                          {team.coach.name}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            onEditStaff?.(team.name, "coach", {
                              id: "",
                              name: "",
                              email: "",
                              phone: "",
                            })
                          }
                          className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          + Assign
                        </button>
                      )}
                    </div>

                    {/* Assistant Coach */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                        Assistant
                      </div>
                      {team.assistantCoach ? (
                        <button
                          onClick={() =>
                            onEditStaff?.(
                              team.name,
                              "assistantCoach",
                              team.assistantCoach,
                            )
                          }
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left w-full"
                        >
                          {team.assistantCoach.name}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            onEditStaff?.(team.name, "assistantCoach", {
                              id: "",
                              name: "",
                              email: "",
                              phone: "",
                            })
                          }
                          className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          + Assign
                        </button>
                      )}
                    </div>

                    {/* Manager */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                        Manager
                      </div>
                      {team.manager ? (
                        <button
                          onClick={() =>
                            onEditStaff?.(team.name, "manager", team.manager)
                          }
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left w-full"
                        >
                          {team.manager.name}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            onEditStaff?.(team.name, "manager", {
                              id: "",
                              name: "",
                              email: "",
                              phone: "",
                            })
                          }
                          className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          + Assign
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Players List */}
                  {team.players.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-slate-200">
                      <p className="text-sm text-slate-400 font-medium">
                        No players yet. Click "Add Player" to select from{" "}
                        {roster.clubName} players.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="col-span-1 text-xs font-black uppercase text-slate-400 tracking-wider">
                          #
                        </div>
                        <div className="col-span-5 text-xs font-black uppercase text-slate-400 tracking-wider">
                          Name
                        </div>
                        <div className="col-span-3 text-xs font-black uppercase text-slate-400 tracking-wider">
                          Position
                        </div>
                        <div className="col-span-2 text-xs font-black uppercase text-slate-400 tracking-wider">
                          DOB
                        </div>
                        <div className="col-span-1"></div>
                      </div>
                      {team.players.map((player, playerIndex) => (
                        <div
                          key={player.id}
                          className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-1 text-sm font-black text-slate-900">
                            {player.number || "-"}
                          </div>
                          <div className="col-span-5">
                            <button
                              onClick={() =>
                                onEditPlayer?.(team.name, playerIndex, player)
                              }
                              className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {player.name}
                            </button>
                          </div>
                          <div className="col-span-3 text-sm text-slate-600">
                            {player.position || "-"}
                          </div>
                          <div className="col-span-2 text-xs text-slate-500">
                            {player.dateOfBirth
                              ? new Date(player.dateOfBirth).toLocaleDateString(
                                  "en-AU",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "-"}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              onClick={() =>
                                onDeletePlayer?.(
                                  roster.id || "",
                                  team.name,
                                  playerIndex,
                                )
                              }
                              className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Shadow Players Section */}
          {totalShadow > 0 && (
            <div className="mt-6 p-6 bg-amber-50 rounded-2xl border-2 border-amber-200">
              <h4 className="text-lg font-black text-amber-900 mb-4">
                Unallocated Players ({totalShadow})
              </h4>
              <div className="space-y-2">
                {roster.shadowPlayers?.map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-amber-200"
                  >
                    <span className="font-bold text-slate-900">
                      {player.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      Drag to assign to team
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Withdrawn Players Section */}
          {totalWithdrawn > 0 && (
            <div className="mt-6 p-6 bg-red-50 rounded-2xl border-2 border-red-200">
              <h4 className="text-lg font-black text-red-900 mb-4">
                Withdrawn Players ({totalWithdrawn})
              </h4>
              <div className="space-y-2">
                {roster.withdrawn?.map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-red-200"
                  >
                    <span className="font-bold text-slate-900 line-through opacity-50">
                      {player.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
