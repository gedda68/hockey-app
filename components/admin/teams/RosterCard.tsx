// app/admin/teams/components/RosterCard.tsx
// COMPLETE: Player menu + Coaching staff + onRefresh fix

"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortablePlayer from "@/components/teams/SortablePlayer";
import PlayerMenuDropdown from "@/components/admin/teams/PlayerMenuDropdown";
import AddStaffModal from "@/components/admin/teams/modals/AddStaffModal";

import EditPlayerModal from "@/components/admin/teams/modals/EditPlayerModal";
import PlayerHistoryModal from "@/components/admin/teams/modals/PlayerHistoryModal";
import type { TeamRoster, Player } from "@/types/admin/teams.types";

interface RosterCardProps {
  roster: TeamRoster;
  onAddTeam: () => void;
  onAddPlayer: (rosterId: string, teamIndex: number) => void;
  onRefresh?: () => void; // Made optional
}

export default function RosterCard({
  roster,
  onAddTeam,
  onAddPlayer,
  onRefresh,
}: RosterCardProps) {
  const [editingPlayer, setEditingPlayer] = useState<{
    player: Player;
    teamIndex: number;
  } | null>(null);

  const [viewingHistory, setViewingHistory] = useState<Player | null>(null);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const totalPlayers = roster.teams.reduce(
    (sum, team) => sum + team.players.length,
    0,
  );
  const primaryColor = roster.clubColors?.primary || "#06054e";
  const secondaryColor = roster.clubColors?.secondary || "#3b82f6";

  // Helper to refresh data
  const refreshData = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  // Update player leadership
  const handleUpdateLeadership = async (
    player: Player,
    teamIndex: number,
    leadership: any,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/teams/rosters/${roster.id}/teams/${teamIndex}/players/${player.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadership }),
        },
      );

      if (response.ok) {
        refreshData();
      }
    } catch (error) {
      console.error("Error updating leadership:", error);
      alert("Failed to update leadership");
    }
  };

  // Edit player number/position
  const handleEditPlayer = async (
    player: Player,
    teamIndex: number,
    number: string,
    position: string,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/teams/rosters/${roster.id}/teams/${teamIndex}/players/${player.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number, position }),
        },
      );

      if (response.ok) {
        setEditingPlayer(null);
        refreshData();
      } else {
        alert("Failed to update player");
      }
    } catch (error) {
      console.error("Error updating player:", error);
      alert("Failed to update player");
    }
  };

  // Remove player from team
  const handleRemovePlayer = async (player: Player, teamIndex: number) => {
    if (!confirm(`Remove ${player.firstName} ${player.lastName} from team?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/teams/rosters/${roster.id}/teams/${teamIndex}/players/${player.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        refreshData();
      }
    } catch (error) {
      console.error("Error removing player:", error);
      alert("Failed to remove player");
    }
  };

  // Add/update staff
  const handleSaveStaff = async (staffData: any) => {
    if (activeTeamIndex === null) return;

    try {
      const url = editingStaff
        ? `/api/admin/teams/rosters/${roster.id}/teams/${activeTeamIndex}/staff/${editingStaff.id}`
        : `/api/admin/teams/rosters/${roster.id}/teams/${activeTeamIndex}/staff`;

      const method = editingStaff ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffData),
      });

      if (response.ok) {
        setShowAddStaff(false);
        setEditingStaff(null);
        setActiveTeamIndex(null);
        refreshData();
      } else {
        const error = await response.json();
        console.error("Save failed:", error);
        alert(`Failed to save staff: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error("Error saving staff:", error);
      alert("Failed to save staff member");
    }
  };

  // Delete staff
  const handleDeleteStaff = async (staffId: string, teamIndex: number) => {
    if (!confirm("Remove this staff member?")) return;

    try {
      const response = await fetch(
        `/api/admin/teams/rosters/${roster.id}/teams/${teamIndex}/staff/${staffId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        refreshData();
      }
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Failed to delete staff member");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div
        className="relative px-8 py-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        {roster.clubLogo && (
          <div
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20"
            style={{ width: "120px", height: "120px" }}
          >
            <img
              src={roster.clubLogo}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <div className="relative z-10">
          <h3 className="text-3xl font-black uppercase text-white tracking-tight mb-2">
            {roster.clubName || "Club Name"}
          </h3>
          <div className="flex items-center gap-3 text-white/90 text-sm font-bold">
            <span className="px-3 py-1 bg-white/20 rounded-lg">
              {roster.category}
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-lg">
              {roster.division}
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-lg">
              {roster.gender}
            </span>
          </div>
        </div>

        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-6 items-center text-white">
          <div className="text-center">
            <div className="text-4xl font-black">{roster.teams.length}</div>
            <div className="text-xs font-bold uppercase opacity-75">Teams</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black">{totalPlayers}</div>
            <div className="text-xs font-bold uppercase opacity-75">
              Players
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTeam();
            }}
            className="ml-4 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg font-black uppercase text-sm transition-all flex items-center gap-2 border-2 border-white/30"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Team
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {roster.teams.length > 0 ? (
          <div className="space-y-6">
            {roster.teams.map((team, teamIndex) => (
              <TeamSection
                key={teamIndex}
                team={team}
                teamIndex={teamIndex}
                rosterId={roster.id!}
                clubId={roster.clubId}
                onAddPlayer={onAddPlayer}
                onEditPlayer={(player) => {
                  setEditingPlayer({ player, teamIndex });
                }}
                onUpdateLeadership={(player, leadership) =>
                  handleUpdateLeadership(player, teamIndex, leadership)
                }
                onViewHistory={(player) => {
                  setViewingHistory(player);
                }}
                onRemovePlayer={(player) =>
                  handleRemovePlayer(player, teamIndex)
                }
                onAddStaff={() => {
                  setActiveTeamIndex(teamIndex);
                  setShowAddStaff(true);
                }}
                onEditStaff={(staff) => {
                  setActiveTeamIndex(teamIndex);
                  setEditingStaff(staff);
                  setShowAddStaff(true);
                }}
                onDeleteStaff={(staffId) =>
                  handleDeleteStaff(staffId, teamIndex)
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-blue-300">
            <div className="mb-4">
              <svg
                className="w-20 h-20 mx-auto text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-xl font-black text-slate-700 mb-2">
              No Teams Created Yet
            </p>
            <p className="text-slate-500 mb-6">
              Create your first team to start adding players
            </p>
            <button
              onClick={onAddTeam}
              className="px-8 py-4 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Your First Team
            </button>
          </div>
        )}

        {roster.teams.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={onAddTeam}
              className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-sm transition-all border-2 border-dashed border-slate-300"
            >
              + Add Another Team
            </button>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && activeTeamIndex !== null && (
        <AddStaffModal
          teamName={roster.teams[activeTeamIndex].name}
          clubId={roster.clubId}
          editingStaff={editingStaff}
          onClose={() => {
            setShowAddStaff(false);
            setEditingStaff(null);
            setActiveTeamIndex(null);
          }}
          onSubmit={handleSaveStaff}
        />
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer.player}
          teamName={roster.teams[editingPlayer.teamIndex].name}
          onClose={() => setEditingPlayer(null)}
          onSave={(number, position) =>
            handleEditPlayer(
              editingPlayer.player,
              editingPlayer.teamIndex,
              number,
              position,
            )
          }
        />
      )}

      {/* Player History Modal */}
      {viewingHistory && (
        <PlayerHistoryModal
          player={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
}

// Team Section with Players + Staff
function TeamSection({
  team,
  teamIndex,
  rosterId,
  clubId,
  onAddPlayer,
  onEditPlayer,
  onUpdateLeadership,
  onViewHistory,
  onRemovePlayer,
  onAddStaff,
  onEditStaff,
  onDeleteStaff,
}: any) {
  const { setNodeRef } = useDroppable({
    id: `team-${rosterId}-${teamIndex}`,
    data: { rosterId, location: "team", teamIndex, teamName: team.name },
  });

  return (
    <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h4 className="text-xl font-black text-white uppercase">
            {team.name}
          </h4>
          <div className="text-sm text-slate-300 font-bold mt-1">
            {team.players.length} player{team.players.length !== 1 ? "s" : ""}
          </div>
        </div>

        <button
          onClick={() => onAddPlayer(rosterId, teamIndex)}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-black uppercase text-sm transition-all flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Player
        </button>
      </div>

      {/* Players List */}
      <div ref={setNodeRef} className="min-h-[100px] p-4 bg-white">
        {team.players.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="font-bold mb-2">No players yet</p>
            <p className="text-sm">Click "Add Player" to get started</p>
          </div>
        ) : (
          <SortableContext
            items={team.players.map((p: Player) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {team.players.map((player: Player) => (
                <div key={player.id} className="relative group">
                  <SortablePlayer
                    player={player}
                    rosterId={rosterId}
                    location="team"
                    teamIndex={teamIndex}
                    teamName={team.name}
                    variant="normal"
                  />

                  {/* Player Menu */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <PlayerMenuDropdown
                      player={player}
                      onEdit={() => onEditPlayer(player)}
                      onUpdateLeadership={(leadership) =>
                        onUpdateLeadership(player, leadership)
                      }
                      onViewHistory={() => onViewHistory(player)}
                      onRemove={() => onRemovePlayer(player)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {/* COACHING STAFF SECTION */}
      <div className="border-t-2 border-slate-200 bg-slate-50">
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <h5 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Coaching Staff
          </h5>

          <button
            onClick={onAddStaff}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black uppercase text-sm transition-all flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Staff
          </button>
        </div>

        <div className="p-4">
          {!team.staff || team.staff.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-sm font-bold">No coaching staff assigned</p>
              <p className="text-xs mt-1">
                Click "Add Staff" to add coaches and support staff
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {team.staff.map((staff: any) => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  onEdit={() => onEditStaff(staff)}
                  onDelete={() => onDeleteStaff(staff.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Staff Card Component
function StaffCard({ staff, onEdit, onDelete }: any) {
  const roleIcons: Record<string, string> = {
    head_coach: "🏆",
    assistant_coach: "📋",
    manager: "📊",
    physio: "⚕️",
    trainer: "💪",
    doctor: "🩺",
    analyst: "📈",
    equipment: "🎽",
  };

  const roleLabels: Record<string, string> = {
    head_coach: "Head Coach",
    assistant_coach: "Assistant Coach",
    manager: "Team Manager",
    physio: "Physiotherapist",
    trainer: "Trainer",
    doctor: "Team Doctor",
    analyst: "Analyst",
    equipment: "Equipment Manager",
  };

  return (
    <div className="p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-all group">
      <div className="flex items-start gap-4">
        <div className="text-3xl flex-shrink-0">{roleIcons[staff.role]}</div>

        <div className="flex-1 min-w-0">
          <div className="font-black text-lg text-slate-800">
            {staff.memberName}
          </div>
          <div className="text-sm text-blue-600 font-bold">
            {roleLabels[staff.role]}
          </div>

          {staff.qualifications && staff.qualifications.length > 0 && (
            <div className="mt-2 space-y-1">
              {staff.qualifications.map((qual: any) => (
                <div key={qual.id} className="text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                    {qual.name}
                  </span>
                  {qual.expiryDate && (
                    <span className="ml-2 text-xs text-slate-500">
                      Expires: {new Date(qual.expiryDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600"
            title="Edit staff member"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-600"
            title="Remove staff member"
          >
            <svg
              className="w-4 h-4"
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
    </div>
  );
}
