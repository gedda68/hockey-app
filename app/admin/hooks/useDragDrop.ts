// app/admin/hooks/useDragDrop.ts
// UPDATED: Added drag & drop for withdrawn players

import { useState } from "react";
import { DraggedPlayer, Player, Roster } from "../types";

// Extended type to include withdrawn players
interface ExtendedDraggedPlayer extends Omit<DraggedPlayer, "sourceType"> {
  sourceType: "team" | "shadow" | "withdrawn";
}

export function useDragDrop(rosters: Roster[], onUpdate: () => Promise<void>) {
  const [draggedPlayer, setDraggedPlayer] =
    useState<ExtendedDraggedPlayer | null>(null);

  const handleDragStart = (
    e: React.DragEvent,
    player: Player,
    sourceType: "team" | "shadow" | "withdrawn",
    sourceIndex: number,
    ageGroup: string,
    sourceTeam?: string
  ) => {
    setDraggedPlayer({ player, sourceType, sourceTeam, sourceIndex, ageGroup });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropOnTeam = async (
    e: React.DragEvent,
    targetTeam: string,
    ageGroup: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedPlayer || draggedPlayer.ageGroup !== ageGroup) return;
    if (
      draggedPlayer.sourceType === "team" &&
      draggedPlayer.sourceTeam === targetTeam
    ) {
      setDraggedPlayer(null);
      return;
    }

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    let updatedTeams = [...roster.teams];
    let updatedShadowPlayers = [...roster.shadowPlayers];
    let updatedWithdrawn = [...roster.withdrawn];

    // Remove from source
    if (draggedPlayer.sourceType === "team" && draggedPlayer.sourceTeam) {
      updatedTeams = updatedTeams.map((team) =>
        team.name === draggedPlayer.sourceTeam
          ? {
              ...team,
              players: team.players.filter(
                (_, idx) => idx !== draggedPlayer.sourceIndex
              ),
            }
          : team
      );
    } else if (draggedPlayer.sourceType === "shadow") {
      updatedShadowPlayers = updatedShadowPlayers.filter(
        (_, idx) => idx !== draggedPlayer.sourceIndex
      );
    } else if (draggedPlayer.sourceType === "withdrawn") {
      updatedWithdrawn = updatedWithdrawn.filter(
        (_, idx) => idx !== draggedPlayer.sourceIndex
      );
    }

    // Add to target team (clean player object - remove 'reason' if it exists)
    const cleanPlayer: Player = {
      name: draggedPlayer.player.name,
      club: draggedPlayer.player.club,
      icon: draggedPlayer.player.icon,
    };

    updatedTeams = updatedTeams.map((team) =>
      team.name === targetTeam
        ? { ...team, players: [...team.players, cleanPlayer] }
        : team
    );

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            teams: updatedTeams,
            shadowPlayers: updatedShadowPlayers,
            withdrawn: updatedWithdrawn,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        await onUpdate();
        setDraggedPlayer(null);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDropOnShadow = async (e: React.DragEvent, ageGroup: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedPlayer || draggedPlayer.ageGroup !== ageGroup) return;
    if (draggedPlayer.sourceType === "shadow") {
      setDraggedPlayer(null);
      return;
    }

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    let updatedTeams = [...roster.teams];
    let updatedShadowPlayers = [...roster.shadowPlayers];
    let updatedWithdrawn = [...roster.withdrawn];

    // Remove from source
    if (draggedPlayer.sourceType === "team" && draggedPlayer.sourceTeam) {
      updatedTeams = updatedTeams.map((team) =>
        team.name === draggedPlayer.sourceTeam
          ? {
              ...team,
              players: team.players.filter(
                (_, idx) => idx !== draggedPlayer.sourceIndex
              ),
            }
          : team
      );
    } else if (draggedPlayer.sourceType === "withdrawn") {
      updatedWithdrawn = updatedWithdrawn.filter(
        (_, idx) => idx !== draggedPlayer.sourceIndex
      );
    }

    // Add to shadow (clean player object)
    const cleanPlayer: Player = {
      name: draggedPlayer.player.name,
      club: draggedPlayer.player.club,
      icon: draggedPlayer.player.icon,
    };

    updatedShadowPlayers = [...updatedShadowPlayers, cleanPlayer];

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            teams: updatedTeams,
            shadowPlayers: updatedShadowPlayers,
            withdrawn: updatedWithdrawn,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        await onUpdate();
        setDraggedPlayer(null);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDropOnWithdrawn = async (
    e: React.DragEvent,
    ageGroup: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedPlayer || draggedPlayer.ageGroup !== ageGroup) return;
    if (draggedPlayer.sourceType === "withdrawn") {
      setDraggedPlayer(null);
      return;
    }

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    // Ask for withdrawal reason
    const reason = prompt("Reason for withdrawal:", "Injured") || "Withdrawn";

    let updatedTeams = [...roster.teams];
    let updatedShadowPlayers = [...roster.shadowPlayers];
    let updatedWithdrawn = [...roster.withdrawn];

    // Remove from source
    if (draggedPlayer.sourceType === "team" && draggedPlayer.sourceTeam) {
      updatedTeams = updatedTeams.map((team) =>
        team.name === draggedPlayer.sourceTeam
          ? {
              ...team,
              players: team.players.filter(
                (_, idx) => idx !== draggedPlayer.sourceIndex
              ),
            }
          : team
      );
    } else if (draggedPlayer.sourceType === "shadow") {
      updatedShadowPlayers = updatedShadowPlayers.filter(
        (_, idx) => idx !== draggedPlayer.sourceIndex
      );
    }

    // Add to withdrawn with reason
    updatedWithdrawn = [
      ...updatedWithdrawn,
      {
        ...draggedPlayer.player,
        reason,
      },
    ];

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            teams: updatedTeams,
            shadowPlayers: updatedShadowPlayers,
            withdrawn: updatedWithdrawn,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        await onUpdate();
        setDraggedPlayer(null);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return {
    draggedPlayer,
    handleDragStart,
    handleDragOver,
    handleDropOnTeam,
    handleDropOnShadow,
    handleDropOnWithdrawn,
  };
}
