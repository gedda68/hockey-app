"use client";

import { useState, useEffect } from "react";
import { useRosters } from "../hooks/useRosters";
import { useDragDrop } from "../hooks/useDragDrop";
import { usePlayerOperations } from "../hooks/usePlayerOperations";
import { useTeamOperations } from "../hooks/useTeamOperations";
import { useStaffOperations } from "../hooks/useStaffOperations";
import { useShadowOperations } from "../hooks/useShadowOperations";
import { useWithdrawnOperations } from "../hooks/useWithdrawnOperations";
import { useSelectorOperations } from "../hooks/useSelectorOperations";
import ActionBar from "../components/ActionBar";
import DivisionCard from "../components/DivisionCard";
import AddDivisionModal from "../components/modals/AddDivisionModal";
import AddTeamModal from "../components/modals/AddTeamModal";
import AddPlayerModal from "../components/modals/AddPlayerModal";
import EditPlayerModal from "../components/modals/EditPlayerModal";
import EditStaffModal from "../components/modals/EditStaffModal";
import EditShadowPlayerModal from "../components/modals/EditShadowPlayerModal";
import EditSelectorModal from "../components/modals/EditSelectorModal";
import BulkUploadModal from "../components/modals/BulkUploadModal";
import type {
  EditingPlayer,
  EditingStaff,
  EditingShadowPlayer,
  AddPlayerModal as AddPlayerModalType,
  Selector,
} from "../types";

interface EditingSelector {
  ageGroup: string;
  selectorIndex: number;
  selector: Selector;
}

export default function AdminPanel() {
  // --- STATE ---
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [expandedRoster, setExpandedRoster] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(
    null
  );
  const [editingStaff, setEditingStaff] = useState<EditingStaff | null>(null);
  const [editingShadowPlayer, setEditingShadowPlayer] =
    useState<EditingShadowPlayer | null>(null);
  const [editingSelector, setEditingSelector] =
    useState<EditingSelector | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] =
    useState<AddPlayerModalType | null>(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState<string | null>(null);
  const [showAddDivisionModal, setShowAddDivisionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddSelectorModal, setShowAddSelectorModal] = useState<
    string | null
  >(null);
  const [newSelector, setNewSelector] = useState<Selector | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // --- HOOKS ---
  // Pass selectedYear to the hook so it fetches the correct data
  const { rosters, loading, refreshing, fetchRosters } =
    useRosters(selectedYear);

  const dragDrop = useDragDrop(rosters, fetchRosters, setSaveStatus);
  const playerOps = usePlayerOperations(rosters, fetchRosters);
  const teamOps = useTeamOperations(rosters, fetchRosters);
  const staffOps = useStaffOperations(rosters, fetchRosters);
  const shadowOps = useShadowOperations(rosters, fetchRosters);
  const withdrawnOps = useWithdrawnOperations(rosters, fetchRosters);
  const selectorOps = useSelectorOperations(rosters, fetchRosters);

  // --- HANDLERS ---

  // Renamed to handleRefresh to avoid naming conflict with fetchRosters from hook
  const handleRefresh = async () => {
    await fetchRosters();
  };

  const handleAddDivision = async (ageGroup: string, season: string) => {
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/admin/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: ageGroup.trim(),
          season: season.toString(),
          lastUpdated: new Date().toLocaleDateString("en-AU"),
          teams: [],
          shadowPlayers: [],
          withdrawn: [],
          selectors: [],
        }),
      });

      if (response.ok) {
        setSaveStatus("saved");
        setShowAddDivisionModal(false);
        // Refresh the list for the newly added season if necessary
        if (season === selectedYear) {
          await fetchRosters();
        } else {
          setSelectedYear(season); // This will trigger the useEffect to fetch
        }
        setExpandedRoster(ageGroup);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      setSaveStatus("error");
    }
  };

  const handleDeleteDivision = async (ageGroup: string) => {
    if (!confirm(`Delete entire ${ageGroup} roster for ${selectedYear}?`))
      return;
    setSaveStatus("saving");
    try {
      // Note: Endpoint needs to handle season to ensure we don't delete other years
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(
          ageGroup
        )}?season=${selectedYear}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSaveStatus("saved");
        await fetchRosters();
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      setSaveStatus("error");
    }
  };

  // Trigger fetch whenever the year is changed via the ActionBar
  useEffect(() => {
    fetchRosters();
  }, [selectedYear]);

  if (loading && rosters.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold tracking-widest uppercase text-xs">
            Loading {selectedYear} Season...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase text-[#06054e]">
                Roster Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Managing Season:{" "}
                <span className="font-bold text-[#06054e]">{selectedYear}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ActionBar
        refreshing={refreshing}
        rostersCount={rosters.length}
        currentSeason={selectedYear}
        onSeasonChange={setSelectedYear}
        onRefresh={handleRefresh}
        onAddDivision={() => setShowAddDivisionModal(true)}
        onBulkUpload={() => setShowUploadModal(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-6">
          {rosters.map((roster) => (
            <DivisionCard
              key={`${roster.ageGroup}-${roster.season || selectedYear}`}
              roster={roster}
              isExpanded={expandedRoster === roster.ageGroup}
              onToggleExpand={() =>
                setExpandedRoster(
                  expandedRoster === roster.ageGroup ? null : roster.ageGroup
                )
              }
              onDelete={() => handleDeleteDivision(roster.ageGroup)}
              onAddTeam={() => setShowAddTeamModal(roster.ageGroup)}
              onAddPlayer={(teamName) =>
                setShowAddPlayerModal({
                  ageGroup: roster.ageGroup,
                  teamName,
                })
              }
              onEditPlayer={(teamName, playerIndex, player) =>
                setEditingPlayer({
                  ageGroup: roster.ageGroup,
                  teamName,
                  playerIndex,
                  player,
                })
              }
              onDeletePlayer={playerOps.handleDeletePlayer}
              onEditStaff={(teamName, role, staff) =>
                setEditingStaff({
                  ageGroup: roster.ageGroup,
                  teamName,
                  role,
                  staff,
                })
              }
              onEditShadowPlayer={(playerIndex, player) =>
                setEditingShadowPlayer({
                  ageGroup: roster.ageGroup,
                  playerIndex,
                  player,
                })
              }
              onAddSelector={() => setShowAddSelectorModal(roster.ageGroup)}
              onEditSelector={(selectorIndex, selector) =>
                setEditingSelector({
                  ageGroup: roster.ageGroup,
                  selectorIndex,
                  selector,
                })
              }
              onDeleteSelector={(selectorIndex) =>
                selectorOps.handleDeleteSelector(roster.ageGroup, selectorIndex)
              }
              onSetChair={(selectorIndex) =>
                selectorOps.handleSetChair(roster.ageGroup, selectorIndex)
              }
              dragDrop={{
                ...dragDrop,
                handleDeleteShadowPlayer: shadowOps.handleDeleteShadowPlayer,
                handleDeleteWithdrawnPlayer:
                  withdrawnOps.handleDeleteWithdrawnPlayer,
              }}
            />
          ))}

          {rosters.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-block p-10 bg-white rounded-[3rem] shadow-xl shadow-blue-900/5 border border-slate-100">
                <p className="text-xl font-black uppercase text-slate-300 tracking-tighter">
                  No Divisions Found for {selectedYear}
                </p>
                <p className="text-sm text-slate-400 mt-2 mb-6 font-medium">
                  Add an age group to begin the {selectedYear} season.
                </p>
                <button
                  onClick={() => setShowAddDivisionModal(true)}
                  className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                >
                  + Add {selectedYear} Division
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {showAddDivisionModal && (
        <AddDivisionModal
          onClose={() => setShowAddDivisionModal(false)}
          onSubmit={handleAddDivision}
        />
      )}

      {showAddTeamModal && (
        <AddTeamModal
          ageGroup={showAddTeamModal}
          onClose={() => setShowAddTeamModal(null)}
          onSubmit={teamOps.handleAddTeam}
        />
      )}

      {showAddPlayerModal && (
        <AddPlayerModal
          ageGroup={showAddPlayerModal.ageGroup}
          teamName={showAddPlayerModal.teamName}
          onClose={() => setShowAddPlayerModal(null)}
          onSubmit={playerOps.handleAddPlayer}
        />
      )}

      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer.player}
          onChange={(player) => setEditingPlayer({ ...editingPlayer, player })}
          onClose={() => setEditingPlayer(null)}
          onSubmit={() => {
            playerOps.handleUpdatePlayer(
              editingPlayer.ageGroup,
              editingPlayer.teamName,
              editingPlayer.playerIndex,
              editingPlayer.player
            );
            setEditingPlayer(null);
          }}
        />
      )}

      {editingStaff && (
        <EditStaffModal
          staff={editingStaff.staff}
          role={editingStaff.role}
          onChange={(staff) => setEditingStaff({ ...editingStaff, staff })}
          onClose={() => setEditingStaff(null)}
          onSubmit={() => {
            staffOps.handleUpdateStaff(
              editingStaff.ageGroup,
              editingStaff.teamName,
              editingStaff.role,
              editingStaff.staff
            );
            setEditingStaff(null);
          }}
        />
      )}

      {editingShadowPlayer && (
        <EditShadowPlayerModal
          player={editingShadowPlayer.player}
          onChange={(player) =>
            setEditingShadowPlayer({ ...editingShadowPlayer, player })
          }
          onClose={() => setEditingShadowPlayer(null)}
          onSubmit={() => {
            shadowOps.handleUpdateShadowPlayer(
              editingShadowPlayer.ageGroup,
              editingShadowPlayer.playerIndex,
              editingShadowPlayer.player
            );
            setEditingShadowPlayer(null);
          }}
        />
      )}

      {showAddSelectorModal && (
        <EditSelectorModal
          selector={
            newSelector || {
              id: `selector-${Date.now()}`,
              name: "",
              club: "",
              icon: "",
              isChair: false,
            }
          }
          isNew={true}
          onChange={(selector) => setNewSelector(selector)}
          onClose={() => {
            setShowAddSelectorModal(null);
            setNewSelector(null);
          }}
          onSubmit={() => {
            if (newSelector && showAddSelectorModal) {
              selectorOps.handleAddSelector(showAddSelectorModal, newSelector);
              setShowAddSelectorModal(null);
              setNewSelector(null);
            }
          }}
        />
      )}

      {editingSelector && (
        <EditSelectorModal
          selector={editingSelector.selector}
          onChange={(selector) =>
            setEditingSelector({ ...editingSelector, selector })
          }
          onClose={() => setEditingSelector(null)}
          onSubmit={() => {
            selectorOps.handleUpdateSelector(
              editingSelector.ageGroup,
              editingSelector.selectorIndex,
              editingSelector.selector
            );
            setEditingSelector(null);
          }}
        />
      )}

      {showUploadModal && (
        <BulkUploadModal
          currentSeason={selectedYear} // Pass the state here
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleRefresh}
        />
      )}

      {/* --- STATUS TOAST --- */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${
          saveStatus !== "idle"
            ? "translate-y-0 opacity-100"
            : "translate-y-12 opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 text-white font-black uppercase tracking-wider text-sm ${
            saveStatus === "saving"
              ? "bg-[#06054e]"
              : saveStatus === "saved"
              ? "bg-green-600"
              : "bg-red-600"
          }`}
        >
          {saveStatus === "saving" && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          <span>
            {saveStatus === "saving" && "Syncing to Database..."}
            {saveStatus === "saved" && "✅ Changes Saved"}
            {saveStatus === "error" && "❌ Save Failed"}
          </span>
        </div>
      </div>
    </div>
  );
}
