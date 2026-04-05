// app/admin/teams/page.tsx
// Complete Club Teams Management System

"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import RosterCard from "@/components/admin/teams/RosterCard";
import AddRosterModal from "@/components/admin/teams/modals/AddRosterModal";
import AddTeamModal from "@/components/admin/teams/modals/AddTeamModal";
import AddPlayerModal from "@/components/admin/teams/modals/AddPlayerModal";
import EditPlayerModal from "@/components/admin/teams/modals/EditPlayerModal";
import EditStaffModal from "@/components/admin/teams/modals/EditStaffModal";
import UnavailabilityModal from "@/components/admin/teams/modals/UnavailabilityModal";
import SortablePlayer from "@/components/teams/SortablePlayer";
import type { TeamRoster, Player } from "@/types/admin/teams.types";

// Division sorting order
const DIVISION_ORDER: Record<string, number> = {
  // Senior divisions
  Open: 1,
  Premier: 2,
  "Division 1": 3,
  "Division 2": 4,
  "Division 3": 5,
  BHL1: 10,
  BHL2: 11,
  BHL3: 12,
  BHL4: 13,
  BHL5: 14,
  BHL6: 15,
  BHL7: 16,

  // Junior divisions
  U6: 100,
  U8: 101,
  U10: 102,
  U12: 103,
  U14: 104,
  U16: 105,
  U18: 106,

  // Masters divisions
  O35: 200,
  O40: 201,
  O45: 202,
  O50: 203,
  O55: 204,
  O60: 205,
  O65: 206,

  // Social divisions
  "Mixed Social": 300,
  Recreational: 301,
};

function getDivisionSortOrder(division: string): number {
  return DIVISION_ORDER[division] || 9999; // Unknown divisions go to end
}

export default function ClubTeamsPage() {
  const [rosters, setRosters] = useState<TeamRoster[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [season, setSeason] = useState("2026");
  const [loading, setLoading] = useState(true);
  const [userAccess, setUserAccess] = useState<any>(null);

  const [showAddRoster, setShowAddRoster] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [activeRoster, setActiveRoster] = useState<TeamRoster | null>(null);
  const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);

  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  // Pending unavailability — player awaiting modal confirmation
  const [pendingUnavailable, setPendingUnavailable] = useState<{
    player: Player;
    fromRosterId: string;
    fromLocation: string;
    fromTeamIndex?: number;
    updatedRoster: TeamRoster;
  } | null>(null);

  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    fetchRosters();
  }, [season, selectedClubId]);

  useEffect(() => {
    if (rosters.length > 0 && !selectedDivision) {
      const sortedKeys = Object.keys(divisionGroups).sort((a, b) => {
        const divA = a.split("-")[0];
        const divB = b.split("-")[0];
        return getDivisionSortOrder(divA) - getDivisionSortOrder(divB);
      });
      if (sortedKeys.length > 0) {
        setSelectedDivision(sortedKeys[0]);
      }
    }
  }, [rosters, selectedDivision]);

  const fetchClubs = async () => {
    try {
      const response = await fetch("/api/admin/clubs");
      const data = await response.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error("Error fetching clubs:", error);
    }
  };

  const fetchRosters = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/teams/rosters?season=${season}${selectedClubId !== "all" ? `&clubId=${selectedClubId}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      setRosters(data.rosters || []);
      setUserAccess(data.userAccess);

      if (data.userAccess?.clubId && selectedClubId === "all") {
        setSelectedClubId(data.userAccess.clubId);
      }
    } catch (error) {
      console.error("Error fetching rosters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoster = async (data: any) => {
    try {
      const response = await fetch("/api/admin/teams/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, season }),
      });

      if (response.ok) {
        await fetchRosters();
        setShowAddRoster(false);
      }
    } catch (error) {
      console.error("Error creating roster:", error);
    }
  };

  const handleAddTeam = async (data: any) => {
    if (!activeRoster) return;

    try {
      const response = await fetch(
        `/api/admin/teams/rosters/${activeRoster.id}/teams`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (response.ok) {
        await fetchRosters();
        setShowAddTeam(false);
        setActiveRoster(null);
      }
    } catch (error) {
      console.error("Error adding team:", error);
    }
  };

  const handleAddPlayerClick = (rosterId: string, teamIndex: number) => {
    const roster = rosters.find((r) => r.id === rosterId);
    if (roster) {
      setActiveRoster(roster);
      setActiveTeamIndex(teamIndex);
      setShowAddPlayer(true);
    }
  };

  const handleAddPlayer = async (playerId: string, playerDetails?: any) => {
    if (!activeRoster || activeTeamIndex === null) return;

    try {
      const response = await fetch(
        `/api/admin/teams/rosters/${activeRoster.id}/teams/${activeTeamIndex}/players`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            ...playerDetails, // Include number and position
          }),
        },
      );

      if (response.ok) {
        await fetchRosters();
        setShowAddPlayer(false);
        setActiveRoster(null);
        setActiveTeamIndex(null);
      } else {
        const error = await response.json();
        alert(error.details || error.error || "Failed to add player");
      }
    } catch (error) {
      console.error("Error adding player:", error);
      alert("Failed to add player");
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActivePlayer(active.data.current.player);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);

    if (!over) return;

    const fromData = active.data.current;
    const toData = over.data.current;

    if (fromData.rosterId !== toData.rosterId) {
      console.log("Cross-roster drag not yet implemented");
      return;
    }

    if (
      fromData.location === toData.location &&
      fromData.teamIndex === toData.teamIndex
    ) {
      return;
    }

    const roster = rosters.find((r) => r.id === fromData.rosterId);
    if (!roster) return;

    // Create deep copy to avoid mutation
    const updatedRoster = JSON.parse(JSON.stringify(roster));
    const player = fromData.player;

    const fromTeamName =
      fromData.location === "team"
        ? updatedRoster.teams[fromData.teamIndex]?.name
        : fromData.location;
    const toTeamName =
      toData.location === "team"
        ? updatedRoster.teams[toData.teamIndex]?.name
        : toData.location;

    console.log("🎯 Drag & Drop:");
    console.log(`  Player: ${player.firstName} ${player.lastName}`);
    console.log(`  From: ${fromData.location} (${fromTeamName})`);
    console.log(`  To: ${toData.location} (${toTeamName})`);

    // Initialize arrays if they don't exist
    if (!updatedRoster.shadowPlayers) updatedRoster.shadowPlayers = [];
    if (!updatedRoster.withdrawn) updatedRoster.withdrawn = [];

    // Remove from source
    if (fromData.location === "team") {
      updatedRoster.teams[fromData.teamIndex].players = updatedRoster.teams[
        fromData.teamIndex
      ].players.filter((p: any) => p.id !== player.id);
    } else if (fromData.location === "emergency") {
      updatedRoster.shadowPlayers = updatedRoster.shadowPlayers.filter(
        (p: any) => p.id !== player.id,
      );
    } else if (fromData.location === "unavailable") {
      updatedRoster.withdrawn = updatedRoster.withdrawn.filter(
        (p: any) => p.id !== player.id,
      );
    }

    // Add to destination (make sure we're adding a clean copy)
    const playerCopy = { ...player };
    delete playerCopy.unavailableReason; // Clear old reason

    if (toData.location === "team") {
      if (!updatedRoster.teams[toData.teamIndex].players) {
        updatedRoster.teams[toData.teamIndex].players = [];
      }
      updatedRoster.teams[toData.teamIndex].players.push(playerCopy);
    } else if (toData.location === "emergency") {
      updatedRoster.shadowPlayers.push(playerCopy);
    } else if (toData.location === "unavailable") {
      // Don't add yet — show modal to collect structured reason
      setPendingUnavailable({
        player: playerCopy,
        fromRosterId: roster.id!,
        fromLocation: fromData.location,
        fromTeamIndex: fromData.teamIndex,
        updatedRoster,  // already has player removed from source
      });
      return; // wait for modal confirmation
    }

    await persistRosterMove(roster.id!, updatedRoster, player, fromData, toData, fromTeamName, toTeamName);
  };

  async function persistRosterMove(
    rosterId: string,
    updatedRoster: TeamRoster,
    player: Player,
    fromData: any,
    toData: any,
    fromTeamName: string,
    toTeamName: string,
  ) {
    const moveDetails = {
      player: { id: player.id, firstName: player.firstName, lastName: player.lastName },
      from: { location: fromData.location, teamIndex: fromData.teamIndex, teamName: fromTeamName },
      to:   { location: toData.location,   teamIndex: toData.teamIndex,   teamName: toTeamName   },
    };

    // Optimistically update UI
    setRosters(rosters.map((r) => (r.id === rosterId ? updatedRoster : r)));

    try {
      const response = await fetch(`/api/admin/teams/rosters/${rosterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teams: updatedRoster.teams,
          shadowPlayers: updatedRoster.shadowPlayers,
          withdrawn: updatedRoster.withdrawn,
          moveDetails,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ Save failed:", error);
        alert(`Failed to save changes: ${error.details || error.error}`);
        await fetchRosters();
      }
    } catch (error) {
      console.error("❌ Error updating roster:", error);
      alert("Failed to save changes. Please try again.");
      await fetchRosters();
    }
  }

  async function handleUnavailabilityConfirm(data: {
    unavailableType: any;
    unavailableFrom: string;
    unavailableWeeks: number;
    unavailableUntil: string;
    unavailableNote: string;
  }) {
    if (!pendingUnavailable) return;
    const { player, fromRosterId, fromLocation, fromTeamIndex, updatedRoster } = pendingUnavailable;

    const playerWithReason = {
      ...player,
      unavailableType:  data.unavailableType,
      unavailableFrom:  data.unavailableFrom,
      unavailableWeeks: data.unavailableWeeks,
      unavailableUntil: data.unavailableUntil,
      unavailableNote:  data.unavailableNote,
    };
    updatedRoster.withdrawn.push(playerWithReason);

    const fromData = { location: fromLocation, teamIndex: fromTeamIndex };
    const toData   = { location: "unavailable", teamIndex: undefined };
    const fromTeamName = fromLocation === "team"
      ? updatedRoster.teams[fromTeamIndex ?? 0]?.name ?? fromLocation
      : fromLocation;

    setPendingUnavailable(null);
    await persistRosterMove(fromRosterId, updatedRoster, player, fromData, toData, fromTeamName, "unavailable");
  }

  // Group rosters by division and SORT
  const divisionGroups = rosters.reduce(
    (acc, roster) => {
      const key = `${roster.division}-${roster.category}-${roster.gender}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(roster);
      return acc;
    },
    {} as Record<string, TeamRoster[]>,
  );

  // Sort division keys
  const sortedDivisionKeys = Object.keys(divisionGroups).sort((a, b) => {
    const divA = a.split("-")[0];
    const divB = b.split("-")[0];
    return getDivisionSortOrder(divA) - getDivisionSortOrder(divB);
  });

  const currentRoster = selectedDivision
    ? divisionGroups[selectedDivision]?.[0]
    : null;

  const isSuperAdmin = userAccess?.isSuperAdmin || false;
  const userClubId = userAccess?.clubId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black uppercase text-[#06054e] mb-2">
                Team Rosters
              </h1>
              <p className="text-slate-600">
                Manage team rosters and player assignments
              </p>
            </div>

            <button
              onClick={() => setShowAddRoster(true)}
              className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg"
            >
              + Add Team Roster
            </button>
          </div>

          {/* Controls */}
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                Season
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            {isSuperAdmin && (
              <div className="flex-1">
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                  Club
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold"
                >
                  <option value="all">All Clubs</option>
                  {clubs.map((club) => (
                    <option key={club.clubId} value={club.clubId}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading rosters...</p>
          </div>
        ) : rosters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-300">
            <p className="text-slate-400 font-bold">No rosters found</p>
            <button
              onClick={() => setShowAddRoster(true)}
              className="mt-4 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm"
            >
              Create First Roster
            </button>
          </div>
        ) : (
          <>
            {/* SORTED Division Tabs */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {sortedDivisionKeys.map((key) => {
                const groupRosters = divisionGroups[key];
                const roster = groupRosters[0];
                const totalTeams = groupRosters.reduce(
                  (sum, r) => sum + r.teams.length,
                  0,
                );

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDivision(key)}
                    className={`px-6 py-3 rounded-xl font-black uppercase text-sm whitespace-nowrap transition-all ${
                      selectedDivision === key
                        ? "bg-[#06054e] text-white shadow-lg"
                        : "bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200"
                    }`}
                  >
                    <div>{roster.division}</div>
                    <div className="text-xs opacity-75 normal-case">
                      {roster.category} {roster.gender} · {totalTeams} team
                      {totalTeams !== 1 ? "s" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Division Content */}
            {currentRoster && (
              <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="space-y-6">
                  <RosterCard
                    roster={currentRoster}
                    onAddTeam={() => {
                      setActiveRoster(currentRoster);
                      setShowAddTeam(true);
                    }}
                    onAddPlayer={handleAddPlayerClick}
                    onRefresh={fetchRosters}
                  />
                </div>

                <DragOverlay>
                  {activePlayer ? (
                    <SortablePlayer
                      player={activePlayer}
                      variant="normal"
                      isDragging
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddRoster && (
        <AddRosterModal
          clubs={clubs}
          defaultClubId={userClubId}
          disableClubSelection={!isSuperAdmin}
          onClose={() => setShowAddRoster(false)}
          onSubmit={handleAddRoster}
        />
      )}

      {showAddTeam && activeRoster && (
        <AddTeamModal
          roster={activeRoster}
          onClose={() => {
            setShowAddTeam(false);
            setActiveRoster(null);
          }}
          onSubmit={handleAddTeam}
        />
      )}

      {/* Unavailability modal */}
      {pendingUnavailable && (
        <UnavailabilityModal
          player={pendingUnavailable.player}
          onConfirm={handleUnavailabilityConfirm}
          onCancel={() => { setPendingUnavailable(null); fetchRosters(); }}
        />
      )}

      {showAddPlayer && activeRoster && activeTeamIndex !== null && (
        <AddPlayerModal
          roster={activeRoster}
          teamIndex={activeTeamIndex}
          onClose={() => {
            setShowAddPlayer(false);
            setActiveRoster(null);
            setActiveTeamIndex(null);
          }}
          onSubmit={handleAddPlayer}
        />
      )}
    </div>
  );
}
