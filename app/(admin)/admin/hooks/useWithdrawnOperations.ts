// app/admin/hooks/useWithdrawnOperations.ts

import { Roster } from "../types";

export function useWithdrawnOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleDeleteWithdrawnPlayer = async (
    ageGroup: string,
    playerIndex: number
  ) => {
    if (!confirm("Delete this withdrawn player permanently?")) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedWithdrawn = roster.withdrawn.filter(
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
            withdrawn: updatedWithdrawn,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("Withdrawn player deleted");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete withdrawn player");
    }
  };

  return {
    handleDeleteWithdrawnPlayer,
  };
}
