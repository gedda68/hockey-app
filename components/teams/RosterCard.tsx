// app/admin/teams/components/RosterCard.tsx
// Roster Card with Tabs and Drag & Drop

"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortablePlayer from "./SortablePlayer";
import type { TeamRoster, Player, Staff } from "@/types/admin/teams.types";

interface RosterCardProps {
  roster: TeamRoster;
  isExpanded: boolean;
  activeTab: "teams" | "emergency" | "unavailable";
  onToggleExpand: () => void;
  onTabChange: (tab: "teams" | "emergency" | "unavailable") => void;
  onDelete: () => void;
  onAddTeam: () => void;
  onAddPlayer: (teamIndex: number) => void;
  onAddEmergency: () => void;
  onAddUnavailable: () => void;
  onEditPlayer: (
    teamIndex: number,
    playerIndex: number,
    player: Player,
  ) => void;
  onEditStaff: (
    teamIndex: number,
    role: "coach" | "assistantCoach" | "manager",
    staff: Staff | undefined,
  ) => void;
}

export default function RosterCard({
  roster,
  isExpanded,
  activeTab,
  onToggleExpand,
  onTabChange,
  onDelete,
  onAddTeam,
  onAddPlayer,
  onAddEmergency,
  onAddUnavailable,
  onEditPlayer,
  onEditStaff,
}: RosterCardProps) {
  const totalPlayers = roster.teams.reduce(
    (sum, team) => sum + team.players.length,
    0,
  );
  const primaryColor = roster.clubColors?.primary || "#06054e";
  const secondaryColor = roster.clubColors?.secondary || "#3b82f6";

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
      {/* Header with Club Colors */}
      <div
        className="relative px-6 py-6 cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
        onClick={onToggleExpand}
      >
        {/* Club Logo Watermark */}
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

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black uppercase text-white tracking-tight mb-2">
              {roster.clubName}
            </h3>
            <div className="flex items-center gap-3 text-white/90 text-sm font-bold">
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {roster.category}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {roster.division}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {roster.gender}
              </span>
              {roster.grade && (
                <span className="px-3 py-1 bg-white/20 rounded-full">
                  {roster.grade}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="text-right">
              <div className="text-3xl font-black text-white">
                {roster.teams.length}
              </div>
              <div className="text-xs font-bold text-white/70 uppercase">
                Teams
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white">
                {totalPlayers}
              </div>
              <div className="text-xs font-bold text-white/70 uppercase">
                Players
              </div>
            </div>

            {/* Expand Icon */}
            <div className="ml-4">
              <svg
                className={`w-6 h-6 text-white transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="relative z-10 flex items-center gap-2 mt-4">
          {roster.shadowPlayers.length > 0 && (
            <div className="px-3 py-1 bg-amber-500/90 text-white rounded-full text-xs font-black uppercase">
              {roster.shadowPlayers.length} Emergency
            </div>
          )}
          {roster.withdrawn.length > 0 && (
            <div className="px-3 py-1 bg-red-500/90 text-white rounded-full text-xs font-black uppercase">
              {roster.withdrawn.length} Unavailable
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6">
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-6 border-b-2 border-slate-100">
            <button
              onClick={() => onTabChange("teams")}
              className={`px-6 py-3 font-black uppercase text-sm transition-all relative ${
                activeTab === "teams"
                  ? "text-[#06054e]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Teams ({roster.teams.length})
              {activeTab === "teams" && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
                  style={{ backgroundColor: primaryColor }}
                ></div>
              )}
            </button>

            <button
              onClick={() => onTabChange("emergency")}
              className={`px-6 py-3 font-black uppercase text-sm transition-all relative ${
                activeTab === "emergency"
                  ? "text-[#06054e]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Emergency ({roster.shadowPlayers.length})
              {activeTab === "emergency" && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
                  style={{ backgroundColor: primaryColor }}
                ></div>
              )}
            </button>

            <button
              onClick={() => onTabChange("unavailable")}
              className={`px-6 py-3 font-black uppercase text-sm transition-all relative ${
                activeTab === "unavailable"
                  ? "text-[#06054e]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Unavailable ({roster.withdrawn.length})
              {activeTab === "unavailable" && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
                  style={{ backgroundColor: primaryColor }}
                ></div>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "teams" && (
            <TeamsTab
              roster={roster}
              primaryColor={primaryColor}
              onAddTeam={onAddTeam}
              onAddPlayer={onAddPlayer}
              onEditPlayer={onEditPlayer}
              onEditStaff={onEditStaff}
            />
          )}

          {activeTab === "emergency" && (
            <EmergencyTab roster={roster} onAdd={onAddEmergency} />
          )}

          {activeTab === "unavailable" && (
            <UnavailableTab roster={roster} onAdd={onAddUnavailable} />
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
            >
              Delete Roster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TEAMS TAB ====================

function TeamsTab({
  roster,
  primaryColor,
  onAddTeam,
  onAddPlayer,
  onEditPlayer,
  onEditStaff,
}: {
  roster: TeamRoster;
  primaryColor: string;
  onAddTeam: () => void;
  onAddPlayer: (teamIndex: number) => void;
  onEditPlayer: (
    teamIndex: number,
    playerIndex: number,
    player: Player,
  ) => void;
  onEditStaff: (
    teamIndex: number,
    role: "coach" | "assistantCoach" | "manager",
    staff: Staff | undefined,
  ) => void;
}) {
  return (
    <div className="space-y-6">
      {roster.teams.map((team, teamIndex) => (
        <TeamDropZone
          key={teamIndex}
          rosterId={roster.id || ""}
          team={team}
          teamIndex={teamIndex}
          primaryColor={primaryColor}
          onAddPlayer={() => onAddPlayer(teamIndex)}
          onEditPlayer={(playerIndex, player) =>
            onEditPlayer(teamIndex, playerIndex, player)
          }
          onEditStaff={(role, staff) => onEditStaff(teamIndex, role, staff)}
        />
      ))}

      {roster.teams.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <p className="text-slate-400 font-bold mb-4">No teams created yet</p>
          <button
            onClick={onAddTeam}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-xs hover:bg-green-700 transition-all"
          >
            + Add Team
          </button>
        </div>
      ) : (
        <button
          onClick={onAddTeam}
          className="w-full px-6 py-3 bg-slate-100 text-slate-600 border-2 border-dashed border-slate-300 rounded-xl font-black uppercase text-xs hover:bg-slate-200 hover:border-slate-400 transition-all"
        >
          + Add Another Team
        </button>
      )}
    </div>
  );
}

// ==================== TEAM DROP ZONE ====================

function TeamDropZone({
  rosterId,
  team,
  teamIndex,
  primaryColor,
  onAddPlayer,
  onEditPlayer,
  onEditStaff,
}: {
  rosterId: string;
  team: any;
  teamIndex: number;
  primaryColor: string;
  onAddPlayer: () => void;
  onEditPlayer: (playerIndex: number, player: Player) => void;
  onEditStaff: (
    role: "coach" | "assistantCoach" | "manager",
    staff: Staff | undefined,
  ) => void;
}) {
  const dropId = `team-${rosterId}-${teamIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  const playerIds = team.players.map(
    (p: Player, idx: number) => `team-${rosterId}-${teamIndex}-${idx}`,
  );

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-50 rounded-2xl p-6 border-2 transition-all ${
        isOver ? "border-green-500 bg-green-50" : "border-slate-100"
      }`}
    >
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: primaryColor }}
          ></div>
          <h4 className="text-xl font-black uppercase text-slate-800">
            {team.name}
          </h4>
          <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-xs font-black">
            {team.players.length} Players
          </span>
        </div>

        <button
          onClick={onAddPlayer}
          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
        >
          + Add Player
        </button>
      </div>

      {/* Coaching Staff */}
      {(team.coach || team.assistantCoach || team.manager) && (
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-xl border border-slate-200">
          <StaffCard
            label="Coach"
            staff={team.coach}
            onEdit={() => onEditStaff("coach", team.coach)}
          />
          <StaffCard
            label="Assistant Coach"
            staff={team.assistantCoach}
            onEdit={() => onEditStaff("assistantCoach", team.assistantCoach)}
          />
          <StaffCard
            label="Manager"
            staff={team.manager}
            onEdit={() => onEditStaff("manager", team.manager)}
          />
        </div>
      )}

      {/* Players List - Sortable */}
      <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {team.players.map((player: Player, playerIndex: number) => (
            <SortablePlayer
              key={`team-${rosterId}-${teamIndex}-${playerIndex}`}
              id={`team-${rosterId}-${teamIndex}-${playerIndex}`}
              player={player}
              onEdit={() => onEditPlayer(playerIndex, player)}
            />
          ))}
        </div>
      </SortableContext>

      {team.players.length === 0 && !isOver && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Drag players here or click Add Player
        </div>
      )}
    </div>
  );
}

// ==================== EMERGENCY TAB ====================

function EmergencyTab({
  roster,
  onAdd,
}: {
  roster: TeamRoster;
  onAdd: () => void;
}) {
  const dropId = `emergency-${roster.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  const playerIds = roster.shadowPlayers.map(
    (p, idx) => `emergency-${roster.id}-${idx}`,
  );

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-2xl p-6 border-2 transition-all ${
        isOver ? "border-amber-500 bg-amber-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {roster.shadowPlayers.map((player, index) => (
            <SortablePlayer
              key={`emergency-${roster.id}-${index}`}
              id={`emergency-${roster.id}-${index}`}
              player={player}
              variant="emergency"
            />
          ))}
        </div>
      </SortableContext>

      {roster.shadowPlayers.length === 0 && !isOver && (
        <div className="text-center py-12">
          <p className="text-amber-700 font-bold mb-4">No emergency players</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-xs hover:bg-amber-700 transition-all"
          >
            + Add Emergency Player
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== UNAVAILABLE TAB ====================

function UnavailableTab({
  roster,
  onAdd,
}: {
  roster: TeamRoster;
  onAdd: () => void;
}) {
  const dropId = `unavailable-${roster.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  const playerIds = roster.withdrawn.map(
    (p, idx) => `unavailable-${roster.id}-${idx}`,
  );

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-2xl p-6 border-2 transition-all ${
        isOver ? "border-red-500 bg-red-50" : "border-red-200 bg-red-50"
      }`}
    >
      <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {roster.withdrawn.map((player, index) => (
            <SortablePlayer
              key={`unavailable-${roster.id}-${index}`}
              id={`unavailable-${roster.id}-${index}`}
              player={player}
              variant="unavailable"
            />
          ))}
        </div>
      </SortableContext>

      {roster.withdrawn.length === 0 && !isOver && (
        <div className="text-center py-12">
          <p className="text-red-700 font-bold mb-4">No unavailable players</p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs hover:bg-red-700 transition-all"
          >
            + Add Unavailable Player
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== STAFF CARD ====================

function StaffCard({
  label,
  staff,
  onEdit,
}: {
  label: string;
  staff?: Staff;
  onEdit: () => void;
}) {
  return (
    <div
      className="cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
      onClick={onEdit}
    >
      <div className="text-xs font-black uppercase text-slate-400 mb-1">
        {label}
      </div>
      {staff ? (
        <>
          <div className="font-bold text-slate-800">{staff.name}</div>
          {staff.email && (
            <div className="text-xs text-slate-500">{staff.email}</div>
          )}
        </>
      ) : (
        <div className="text-sm text-slate-400 italic">Not assigned</div>
      )}
    </div>
  );
}
