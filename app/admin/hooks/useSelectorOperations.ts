// app/admin/hooks/useSelectorOperations.ts

import { Roster, Selector } from "../types";

export function useSelectorOperations(
  rosters: Roster[],
  onUpdate: () => Promise<void>
) {
  const handleAddSelector = async (ageGroup: string, selector: Selector) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster) return;

    // Ensure max 5 selectors
    if (roster.selectors && roster.selectors.length >= 5) {
      alert("Maximum 5 selectors allowed per age group");
      return;
    }

    // If this selector is chair, unset any existing chair
    let updatedSelectors = roster.selectors || [];
    if (selector.isChair) {
      updatedSelectors = updatedSelectors.map((s) => ({
        ...s,
        isChair: false,
      }));
    }

    // Add new selector
    updatedSelectors = [...updatedSelectors, selector];

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            selectors: updatedSelectors,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("✅ Selector added");
        await onUpdate();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to add selector");
    }
  };

  const handleUpdateSelector = async (
    ageGroup: string,
    selectorIndex: number,
    updatedSelector: Selector
  ) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster || !roster.selectors) return;

    let updatedSelectors = [...roster.selectors];

    // If this selector is being made chair, unset other chairs
    if (updatedSelector.isChair) {
      updatedSelectors = updatedSelectors.map((s, idx) =>
        idx === selectorIndex ? updatedSelector : { ...s, isChair: false }
      );
    } else {
      updatedSelectors[selectorIndex] = updatedSelector;
    }

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            selectors: updatedSelectors,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("✅ Selector updated");
        await onUpdate();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update selector");
    }
  };

  const handleDeleteSelector = async (
    ageGroup: string,
    selectorIndex: number
  ) => {
    if (!confirm("Remove this selector?")) return;

    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster || !roster.selectors) return;

    const updatedSelectors = roster.selectors.filter(
      (_, idx) => idx !== selectorIndex
    );

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            selectors: updatedSelectors,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("✅ Selector removed");
        await onUpdate();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to remove selector");
    }
  };

  const handleSetChair = async (ageGroup: string, selectorIndex: number) => {
    const roster = rosters.find((r) => r.ageGroup === ageGroup);
    if (!roster || !roster.selectors) return;

    // Unset all chairs, then set the selected one
    const updatedSelectors = roster.selectors.map((s, idx) => ({
      ...s,
      isChair: idx === selectorIndex,
    }));

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...roster,
            selectors: updatedSelectors,
            lastUpdated: new Date().toLocaleDateString("en-AU"),
          }),
        }
      );

      if (response.ok) {
        alert("✅ Chair of Selectors updated");
        await onUpdate();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
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
