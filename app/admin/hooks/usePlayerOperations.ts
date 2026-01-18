// app/admin/hooks/usePlayerOperations.ts

import { Player, Roster } from "../types";

export function usePlayerOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleAddPlayer = async (
    ageGroup: string,
    teamName: string,
    newPlayer: Player
  ) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedTeams = roster.teams.map((team) =>
      team.name === teamName
        ? { ...team, players: [...team.players, newPlayer] }
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
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("Player added");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to add player");
    }
  };

  const handleUpdatePlayer = async (
    ageGroup: string,
    teamName: string,
    playerIndex: number,
    updatedPlayer: Player
  ) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedTeams = roster.teams.map((team) =>
      team.name === teamName
        ? {
            ...team,
            players: team.players.map((p, idx) =>
              idx === playerIndex ? updatedPlayer : p
            ),
          }
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
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("Player updated");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update player");
    }
  };

  const handleDeletePlayer = async (
    ageGroup: string,
    teamName: string,
    playerIndex: number
  ) => {
    if (!confirm("Delete this player?")) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedTeams = roster.teams.map((t) =>
      t.name === teamName
        ? { ...t, players: t.players.filter((_, idx) => idx !== playerIndex) }
        : t
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
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("Player deleted");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete player");
    }
  };

  return {
    handleAddPlayer,
    handleUpdatePlayer,
    handleDeletePlayer,
  };
}
