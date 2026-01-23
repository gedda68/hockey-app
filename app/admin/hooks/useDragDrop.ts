// app/admin/hooks/useDragDrop.ts
import { useState } from "react";
import { DraggedPlayer, Player, Roster } from "../types";

interface ExtendedDraggedPlayer extends Omit<DraggedPlayer, "sourceType"> {
  sourceType: "team" | "shadow" | "withdrawn";
}

export function useDragDrop(
  rosters: Roster[],
  onUpdate: () => Promise<void>,
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void
) {
  const [draggedPlayer, setDraggedPlayer] =
    useState<ExtendedDraggedPlayer | null>(null);

  // --- CENTRAL PERSISTENCE LOGIC ---
  const persistChanges = async (
    ageGroup: string,
    updatedData: Partial<Roster>
  ) => {
    // Find the current roster to ensure we have the most recent fields (selectors, info, etc)
    const currentRoster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!currentRoster) return;

    setSaveStatus("saving");

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...currentRoster, // Keep all existing fields
            ...updatedData, // Overwrite with the drag-and-drop result
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        setSaveStatus("saved");
        await onUpdate();
        setDraggedPlayer(null); // Clear drag state after success
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      console.error("Save Error:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

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
    if (!draggedPlayer || draggedPlayer.ageGroup !== ageGroup) return;
    if (
      draggedPlayer.sourceType === "team" &&
      draggedPlayer.sourceTeam === targetTeam
    ) {
      setDraggedPlayer(null);
      return;
    }

    const roster = rosters.find((r) => r.ageGroup === ageGroup)!;
    let { teams, shadowPlayers, withdrawn } = JSON.parse(
      JSON.stringify(roster)
    );

    if (draggedPlayer.sourceType === "team") {
      teams = teams.map((t: any) =>
        t.name === draggedPlayer.sourceTeam
          ? {
              ...t,
              players: t.players.filter(
                (_: any, i: number) => i !== draggedPlayer.sourceIndex
              ),
            }
          : t
      );
    } else if (draggedPlayer.sourceType === "shadow") {
      shadowPlayers = shadowPlayers.filter(
        (_: any, i: number) => i !== draggedPlayer.sourceIndex
      );
    } else {
      withdrawn = withdrawn.filter(
        (_: any, i: number) => i !== draggedPlayer.sourceIndex
      );
    }

    const cleanPlayer = {
      name: draggedPlayer.player.name,
      club: draggedPlayer.player.club,
      icon: draggedPlayer.player.icon,
    };
    teams = teams.map((t: any) =>
      t.name === targetTeam ? { ...t, players: [...t.players, cleanPlayer] } : t
    );

    await persistChanges(ageGroup, { teams, shadowPlayers, withdrawn });
  };

  const handleDropOnShadow = async (e: React.DragEvent, ageGroup: string) => {
    e.preventDefault();
    if (
      !draggedPlayer ||
      draggedPlayer.ageGroup !== ageGroup ||
      draggedPlayer.sourceType === "shadow"
    )
      return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup)!;
    let { teams, shadowPlayers, withdrawn } = JSON.parse(
      JSON.stringify(roster)
    );

    if (draggedPlayer.sourceType === "team") {
      teams = teams.map((t: any) =>
        t.name === draggedPlayer.sourceTeam
          ? {
              ...t,
              players: t.players.filter(
                (_: any, i: number) => i !== draggedPlayer.sourceIndex
              ),
            }
          : t
      );
    } else {
      withdrawn = withdrawn.filter(
        (_: any, i: number) => i !== draggedPlayer.sourceIndex
      );
    }

    shadowPlayers.push({
      name: draggedPlayer.player.name,
      club: draggedPlayer.player.club,
      icon: draggedPlayer.player.icon,
    });

    await persistChanges(ageGroup, { teams, shadowPlayers, withdrawn });
  };

  const handleDropOnWithdrawn = async (
    e: React.DragEvent,
    ageGroup: string
  ) => {
    e.preventDefault();
    if (
      !draggedPlayer ||
      draggedPlayer.ageGroup !== ageGroup ||
      draggedPlayer.sourceType === "withdrawn"
    )
      return;

    const reason = prompt("Reason for withdrawal:", "Injured") || "Withdrawn";
    const roster = rosters.find((r) => r.ageGroup === ageGroup)!;
    let { teams, shadowPlayers, withdrawn } = JSON.parse(
      JSON.stringify(roster)
    );

    if (draggedPlayer.sourceType === "team") {
      teams = teams.map((t: any) =>
        t.name === draggedPlayer.sourceTeam
          ? {
              ...t,
              players: t.players.filter(
                (_: any, i: number) => i !== draggedPlayer.sourceIndex
              ),
            }
          : t
      );
    } else {
      shadowPlayers = shadowPlayers.filter(
        (_: any, i: number) => i !== draggedPlayer.sourceIndex
      );
    }

    withdrawn.push({ ...draggedPlayer.player, reason });

    await persistChanges(ageGroup, { teams, shadowPlayers, withdrawn });
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
