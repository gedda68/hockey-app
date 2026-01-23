// app/admin/page.tsx
// UPDATED: Removed AdminHeader (now using sidebar layout)

"use client";

import { useState } from "react";
import { useRosters } from "./hooks/useRosters";
import { useDragDrop } from "./hooks/useDragDrop";
import { usePlayerOperations } from "./hooks/usePlayerOperations";
import { useTeamOperations } from "./hooks/useTeamOperations";
import { useStaffOperations } from "./hooks/useStaffOperations";
import { useShadowOperations } from "./hooks/useShadowOperations";
import { useWithdrawnOperations } from "./hooks/useWithdrawnOperations";
import { useSelectorOperations } from "./hooks/useSelectorOperations";
import ActionBar from "./components/ActionBar";
import DivisionCard from "./components/DivisionCard";
import AddDivisionModal from "./components/modals/AddDivisionModal";
import AddTeamModal from "./components/modals/AddTeamModal";
import AddPlayerModal from "./components/modals/AddPlayerModal";
import EditPlayerModal from "./components/modals/EditPlayerModal";
import EditStaffModal from "./components/modals/EditStaffModal";
import EditShadowPlayerModal from "./components/modals/EditShadowPlayerModal";
import EditSelectorModal from "./components/modals/EditSelectorModal";
import BulkUploadModal from "./components/modals/BulkUploadModal";
import type {
  EditingPlayer,
  EditingStaff,
  EditingShadowPlayer,
  AddPlayerModal as AddPlayerModalType,
  Selector,
} from "./types";

interface EditingSelector {
  ageGroup: string;
  selectorIndex: number;
  selector: Selector;
}

export default function AdminPanel() {
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

  const { rosters, loading, refreshing, fetchRosters } = useRosters();
  const dragDrop = useDragDrop(rosters, fetchRosters);
  const playerOps = usePlayerOperations(rosters, fetchRosters);
  const teamOps = useTeamOperations(rosters, fetchRosters);
  const staffOps = useStaffOperations(rosters, fetchRosters);
  const shadowOps = useShadowOperations(rosters, fetchRosters);
  const withdrawnOps = useWithdrawnOperations(rosters, fetchRosters);
  const selectorOps = useSelectorOperations(rosters, fetchRosters);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleAddDivision = async (ageGroup: string) => {
    try {
      const response = await fetch("/api/admin/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup,
          lastUpdated: new Date().toLocaleDateString("en-AU"),
          teams: [],
          shadowPlayers: [],
          withdrawn: [],
          selectors: [],
        }),
      });

      if (response.ok) {
        alert(`✅ Division "${ageGroup}" created!`);
        setShowAddDivisionModal(false);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetchRosters();
        setExpandedRoster(ageGroup);
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleDeleteDivision = async (ageGroup: string) => {
    if (!confirm(`Delete entire ${ageGroup} roster?`)) return;

    try {
      const response = await fetch(
        `/api/admin/rosters/${encodeURIComponent(ageGroup)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        alert("Division deleted");
        await fetchRosters();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete division");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase text-[#06054e]">
                Roster Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage divisions, teams, and players
              </p>
            </div>
          </div>
        </div>
      </div>

      <ActionBar
        refreshing={refreshing}
        rostersCount={rosters.length}
        onRefresh={fetchRosters}
        onAddDivision={() => setShowAddDivisionModal(true)}
        onBulkUpload={() => setShowUploadModal(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-6">
          {rosters.map((roster) => (
            <DivisionCard
              key={roster.ageGroup}
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
              <div className="inline-block p-8 bg-white rounded-3xl shadow-lg">
                <p className="text-xl font-black uppercase text-slate-400">
                  No Divisions Found
                </p>
                <p className="text-sm text-slate-500 mt-2 mb-4">
                  Create your first age group division
                </p>
                <button
                  onClick={() => setShowAddDivisionModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase hover:bg-green-700"
                >
                  + Add Division
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchRosters}
        />
      )}

      {/* Floating Save Status Toast */}
      <div
        className={`fixed bottom-6 right-6 px-6 py-3 rounded-full font-bold shadow-2xl transition-all duration-500 transform ${
          saveStatus === "saving"
            ? "translate-y-0 opacity-100 bg-[#06054e] text-white"
            : saveStatus === "saved"
            ? "translate-y-0 opacity-100 bg-green-600 text-white"
            : saveStatus === "error"
            ? "translate-y-0 opacity-100 bg-red-600 text-white"
            : "translate-y-20 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>
            {saveStatus === "saving" && "SAVING TO DATABASE..."}
            {saveStatus === "saved" && "✅ CHANGES SAVED"}
            {saveStatus === "error" && "❌ SAVE FAILED"}
          </span>
        </div>
      </div>
    </div>
  );
}
