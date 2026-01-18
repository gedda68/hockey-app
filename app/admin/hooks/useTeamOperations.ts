// app/admin/hooks/useTeamOperations.ts

import { Roster, Team } from "../types";

export function useTeamOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleAddTeam = async (ageGroup: string, teamName: string) => {
    console.log("=== ADD TEAM DEBUG ===");
    console.log("1. Attempting to add team:", { ageGroup, teamName });
    console.log(
      "2. Available rosters in state:",
      rosters.map((r) => r.ageGroup)
    );

    try {
      // First check if roster exists in local state
      const localRoster = rosters.find((r) => r.ageGroup === ageGroup);

      if (!localRoster) {
        console.error("3. ❌ Roster not found in local state");
        console.log(
          "4. Available age groups:",
          rosters.map((r) => `"${r.ageGroup}"`).join(", ")
        );
        alert(
          `ERROR: Division "${ageGroup}" not found in loaded data.\n\nAvailable divisions:\n${rosters
            .map((r) => `• ${r.ageGroup}`)
            .join("\n")}\n\nTry refreshing the page.`
        );
        return;
      }

      console.log("3. ✅ Found roster in local state:", localRoster.ageGroup);
      console.log(
        "4. Current teams:",
        localRoster.teams.map((t) => t.name)
      );

      // Use the local roster data to create the new team
      const newTeam: Team = {
        name: teamName,
        players: [],
        staff: {},
      };

      console.log("5. Creating new team:", newTeam);

      const payload = {
        ageGroup: localRoster.ageGroup, // Use exact ageGroup from local roster
        lastUpdated: new Date().toLocaleDateString("en-AU"),
        teams: [...(localRoster.teams || []), newTeam],
        shadowPlayers: localRoster.shadowPlayers || [],
        withdrawn: localRoster.withdrawn || [],
        trialInfo: localRoster.trialInfo || null,
        trainingInfo: localRoster.trainingInfo || null,
        tournamentInfo: localRoster.tournamentInfo || null,
      };

      console.log("6. Payload prepared with", payload.teams.length, "teams");

      // Update MongoDB using the exact ageGroup from local roster
      const updateUrl = `/api/admin/rosters/${encodeURIComponent(
        localRoster.ageGroup
      )}`;
      console.log("7. Sending PUT to:", updateUrl);

      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("8. Response status:", updateResponse.status);

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log("9. ✅ Success:", result);
        alert(`✅ Team "${teamName}" added to ${localRoster.ageGroup}!`);
        await onUpdate();
      } else {
        const error = await updateResponse.json();
        console.error("9. ❌ Failed:", error);

        // More helpful error message
        if (updateResponse.status === 404) {
          alert(
            `Database Error: Division "${localRoster.ageGroup}" exists in the app but not in MongoDB.\n\nThis might be a sync issue. Try:\n1. Refresh the page\n2. Delete and recreate the division\n3. Check MongoDB directly`
          );
        } else {
          alert(
            `Failed to add team: ${
              error.error || error.message || "Unknown error"
            }\n\nStatus: ${updateResponse.status}`
          );
        }
      }
    } catch (error) {
      console.error("10. ❌ Exception:", error);
      alert(`Error adding team: ${error}\n\nCheck console for details.`);
    }
  };

  const handleDeleteTeam = async (ageGroup: string, teamName: string) => {
    if (!confirm(`Delete ${teamName} from ${ageGroup}?`)) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) {
      alert(`Error: Division "${ageGroup}" not found`);
      return;
    }

    const updatedTeams = roster.teams.filter((t) => t.name !== teamName);

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(roster.ageGroup)}`,
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
        alert(`✅ Team "${teamName}" deleted`);
        await onUpdate();
      } else {
        const error = await response.json();
        alert(`Failed to delete team: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete team");
    }
  };

  return {
    handleAddTeam,
    handleDeleteTeam,
  };
}
