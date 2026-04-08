// app/admin/hooks/useShadowOperations.ts

import { Player, Roster } from "../types";

export function useShadowOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleUpdateShadowPlayer = async (
    ageGroup: string,
    playerIndex: number,
    updatedPlayer: Player
  ) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedShadowPlayers = roster.shadowPlayers.map((p, idx) =>
      idx === playerIndex ? updatedPlayer : p
    );

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            shadowPlayers: updatedShadowPlayers,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("Shadow player updated");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update shadow player");
    }
  };

  const handleDeleteShadowPlayer = async (
    ageGroup: string,
    playerIndex: number
  ) => {
    if (!confirm("Delete this shadow player?")) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedShadowPlayers = roster.shadowPlayers.filter(
      (_, idx) => idx !== playerIndex
    );

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            shadowPlayers: updatedShadowPlayers,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("Shadow player deleted");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete shadow player");
    }
  };

  return {
    handleUpdateShadowPlayer,
    handleDeleteShadowPlayer,
  };
}
