// app/(admin)/admin/settings/committee-positions/CommitteePositionsClient.tsx
// Client component for committee positions management

"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Committee Member",
  "Coach Coordinator",
  "Registrar",
  "Junior Coordinator",
  "Senior Coordinator",
  "Volunteer Coordinator",
];

export default function CommitteePositionsClient() {
  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const response = await fetch("/api/admin/config/committee-positions");
      if (response.ok) {
        const data = await response.json();
        setPositions(Array.isArray(data) ? data : DEFAULT_POSITIONS);
      } else {
        // If no config exists, use defaults
        setPositions(DEFAULT_POSITIONS);
      }
    } catch (error) {
      console.error("Error loading positions:", error);
      toast.error("Failed to load positions");
      setPositions(DEFAULT_POSITIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/config/committee-positions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Committee positions updated successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save positions");
    } finally {
      setIsSaving(false);
    }
  };

  const addPosition = () => {
    if (newPosition.trim()) {
      if (positions.includes(newPosition.trim())) {
        toast.error("Position already exists");
        return;
      }
      setPositions([...positions, newPosition.trim()]);
      setNewPosition("");
      toast.success("Position added");
    }
  };

  const removePosition = (position: string) => {
    if (confirm(`Remove position "${position}"?`)) {
      setPositions(positions.filter((p) => p !== position));
      toast.success("Position removed");
    }
  };

  const resetToDefaults = () => {
    if (
      confirm(
        "Reset to default positions? This will replace all current positions."
      )
    ) {
      setPositions(DEFAULT_POSITIONS);
      toast.success("Reset to default positions");
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPositions = [...positions];
    [newPositions[index], newPositions[index - 1]] = [
      newPositions[index - 1],
      newPositions[index],
    ];
    setPositions(newPositions);
  };

  const moveDown = (index: number) => {
    if (index === positions.length - 1) return;
    const newPositions = [...positions];
    [newPositions[index], newPositions[index + 1]] = [
      newPositions[index + 1],
      newPositions[index],
    ];
    setPositions(newPositions);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#06054e] uppercase mb-2">
          Committee Positions
        </h1>
        <p className="text-lg text-slate-600 font-bold">
          Manage available committee positions for clubs
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Available Positions
          </h2>
        </div>

        <div className="mb-6">
          <p className="text-slate-600 font-bold mb-4">
            These positions will be available when clubs add committee members.
            Changes apply to all clubs.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPosition();
                }
              }}
              className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
              placeholder="Enter new position name..."
            />
            <button
              onClick={addPosition}
              className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black uppercase text-slate-500">
              {positions.length} Position{positions.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#06054e] font-bold"
            >
              <RefreshCw size={16} />
              Reset to Defaults
            </button>
          </div>

          {positions.map((position, index) => (
            <div
              key={position}
              className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-[#06054e] transition-colors group"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-slate-400 hover:text-[#06054e] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === positions.length - 1}
                  className="text-slate-400 hover:text-[#06054e] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              <span className="flex-1 font-bold text-slate-700">
                {position}
              </span>

              <button
                onClick={() => removePosition(position)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove position"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {positions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="font-bold">No positions configured</p>
              <p className="text-sm mt-2">Add a position to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4 justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase flex items-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
