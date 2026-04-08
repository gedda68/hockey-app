// app/admin/hooks/useSelectorOperations.ts
// FIXED: Enforces only 1 chair at a time

import { Roster, Selector } from "../types";

export function useSelectorOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleAddSelector = async (ageGroup: string, selector: Selector) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) {
      alert("Division not found");
      return;
    }

    // Ensure max 5 selectors
    if (roster.selectors && roster.selectors.length >= 5) {
      alert("Maximum 5 selectors allowed per age group");
      return;
    }

    let updatedSelectors = roster.selectors || [];

    // CRITICAL: If new selector is chair, unset all other chairs
    if (selector.isChair) {
      updatedSelectors = updatedSelectors.map((s) => ({
        ...s,
        isChair: false,
      }));
    }

    // Add new selector
    updatedSelectors = [...updatedSelectors, selector];

    console.log("=== ADD SELECTOR ===");
    console.log("Age Group:", ageGroup);
    console.log("New Selector:", selector);
    console.log("Total Selectors:", updatedSelectors.length);
    console.log("Chairs:", updatedSelectors.filter((s) => s.isChair).length);

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: roster.ageGroup,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
            teams: roster.teams || [],
            shadowPlayers: roster.shadowPlayers || [],
            withdrawn: roster.withdrawn || [],
            selectors: updatedSelectors, // ← CRITICAL: Include selectors
            trialInfo: roster.trialInfo || null,
            trainingInfo: roster.trainingInfo || null,
            tournamentInfo: roster.tournamentInfo || null,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Selector added:", result);
        alert("✅ Selector added");
        await onUpdate();
      } else {
        const error = await response.json();
        console.error("❌ Failed:", error);
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Failed to add selector");
    }
  };

  const handleUpdateSelector = async (
    ageGroup: string,
    selectorIndex: number,
    updatedSelector: Selector
  ) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster || !roster.selectors) {
      alert("Division or selectors not found");
      return;
    }

    let updatedSelectors = [...roster.selectors];

    // CRITICAL: If this selector is being made chair, unset all other chairs
    if (updatedSelector.isChair) {
      updatedSelectors = updatedSelectors.map((s, idx) =>
        idx === selectorIndex ? updatedSelector : { ...s, isChair: false }
      );
    } else {
      updatedSelectors[selectorIndex] = updatedSelector;
    }

    console.log("=== UPDATE SELECTOR ===");
    console.log("Updated Selectors:", updatedSelectors);
    console.log("Chairs:", updatedSelectors.filter((s) => s.isChair).length);

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: roster.ageGroup,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
            teams: roster.teams || [],
            shadowPlayers: roster.shadowPlayers || [],
            withdrawn: roster.withdrawn || [],
            selectors: updatedSelectors, // ← CRITICAL: Include selectors
            trialInfo: roster.trialInfo || null,
            trainingInfo: roster.trainingInfo || null,
            tournamentInfo: roster.tournamentInfo || null,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Selector updated:", result);
        alert("✅ Selector updated");
        await onUpdate();
      } else {
        const error = await response.json();
        console.error("❌ Failed:", error);
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Failed to update selector");
    }
  };

  const handleDeleteSelector = async (
    ageGroup: string,
    selectorIndex: number
  ) => {
    if (!confirm("Remove this selector?")) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster || !roster.selectors) {
      alert("Division or selectors not found");
      return;
    }

    const updatedSelectors = roster.selectors.filter(
      (_, idx) => idx !== selectorIndex
    );

    console.log("=== DELETE SELECTOR ===");
    console.log("Remaining Selectors:", updatedSelectors.length);

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: roster.ageGroup,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
            teams: roster.teams || [],
            shadowPlayers: roster.shadowPlayers || [],
            withdrawn: roster.withdrawn || [],
            selectors: updatedSelectors, // ← CRITICAL: Include selectors
            trialInfo: roster.trialInfo || null,
            trainingInfo: roster.trainingInfo || null,
            tournamentInfo: roster.tournamentInfo || null,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Selector removed:", result);
        alert("✅ Selector removed");
        await onUpdate();
      } else {
        const error = await response.json();
        console.error("❌ Failed:", error);
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Failed to remove selector");
    }
  };

  const handleSetChair = async (ageGroup: string, selectorIndex: number) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster || !roster.selectors) {
      alert("Division or selectors not found");
      return;
    }

    // CRITICAL: Unset ALL chairs, then set only the selected one
    const updatedSelectors = roster.selectors.map((s, idx) => ({
      ...s,
      isChair: idx === selectorIndex, // Only this one is chair
    }));

    console.log("=== SET CHAIR ===");
    console.log("New Chair:", updatedSelectors[selectorIndex].name);
    console.log(
      "Total Chairs:",
      updatedSelectors.filter((s) => s.isChair).length
    );

    // Verify only 1 chair
    const chairCount = updatedSelectors.filter((s) => s.isChair).length;
    if (chairCount !== 1) {
      console.error("❌ ERROR: Found", chairCount, "chairs!");
      alert("Error: Multiple chairs detected. Please refresh and try again.");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: roster.ageGroup,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
            teams: roster.teams || [],
            shadowPlayers: roster.shadowPlayers || [],
            withdrawn: roster.withdrawn || [],
            selectors: updatedSelectors, // ← CRITICAL: Include selectors
            trialInfo: roster.trialInfo || null,
            trainingInfo: roster.trainingInfo || null,
            tournamentInfo: roster.tournamentInfo || null,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Chair updated:", result);
        alert("✅ Chair of Selectors updated");
        await onUpdate();
      } else {
        const error = await response.json();
        console.error("❌ Failed:", error);
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Failed to set chair");
    }
  };

  return {
    handleAddSelector,
    handleUpdateSelector,
    handleDeleteSelector,
    handleSetChair,
  };
}
