// app/admin/hooks/useStaffOperations.ts

import { Staff, Roster } from "../types";

export function useStaffOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleUpdateStaff = async (
    ageGroup: string,
    teamName: string,
    role: string,
    staff: Staff
  ) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedTeams = roster.teams.map((team) =>
      team.name === teamName
        ? {
            ...team,
            staff: {
              ...team.staff,
              [role]: staff,
            },
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
        alert("Staff updated");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update staff");
    }
  };

  const handleDeleteStaff = async (
    ageGroup: string,
    teamName: string,
    role: string
  ) => {
    if (!confirm("Remove this staff member?")) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    const updatedTeams = roster.teams.map((team) =>
      team.name === teamName
        ? { ...team, staff: { ...team.staff, [role]: undefined } }
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
        alert("Staff member removed");
        await onUpdate();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to remove staff");
    }
  };

  return {
    handleUpdateStaff,
    handleDeleteStaff,
  };
}
