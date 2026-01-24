// app/admin/clubs/page.tsx
// Clubs management page with full CRUD

"use client";

import { useState, useEffect } from "react";
import { Club } from "../types/clubs";
import ClubCard from "../components/clubs/ClubCard";
import AddClubModal from "../components/clubs/AddClubModal";
import EditClubModal from "../components/clubs/EditClubModal";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchClubs = async () => {
    try {
      const response = await fetch("/api/admin/clubs");
      if (response.ok) {
        const data = await response.json();
        setClubs(data);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleAddClub = async (club: Club) => {
    try {
      const response = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(club),
      });

      if (response.ok) {
        alert("✅ Club created successfully!");
        setShowAddModal(false);
        await fetchClubs();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create club");
    }
  };

  const handleUpdateClub = async (club: Club) => {
    try {
      const response = await fetch(`/api/admin/clubs/${club._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(club),
      });

      if (response.ok) {
        alert("✅ Club updated successfully!");
        setEditingClub(null);
        await fetchClubs();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update club");
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!confirm("Are you sure you want to delete this club?")) return;

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("✅ Club deleted successfully!");
        await fetchClubs();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete club");
    }
  };

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.shortName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClubs = filteredClubs.filter((c) => c.active);
  const inactiveClubs = filteredClubs.filter((c) => !c.active);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading clubs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase text-[#06054e]">
                Clubs Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {clubs.length} total clubs • {activeClubs.length} active •{" "}
                {inactiveClubs.length} inactive
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase hover:bg-green-700 transition-all"
            >
              + Add Club
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-slate-200 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search clubs by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <button className="px-6 py-3 bg-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-300">
              Filters
            </button>
          </div>
        </div>

        {/* Active Clubs */}
        {activeClubs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black uppercase text-[#06054e] mb-4">
              Active Clubs ({activeClubs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeClubs.map((club) => {
                if (
                  !club.colors ||
                  typeof club.colors.primary === "undefined"
                ) {
                  // This will help you see if the property is missing, null, or named differently
                  console.log("🔍 Inspecting 'All Stars' Object:", {
                    name: club.name,
                    keysPresent: Object.keys(club),
                    colorsObject: club.colors,
                    rawClub: club,
                  });

                  console.error(
                    "❌ CRASH PREVENTED: Missing color data for:",
                    club.name || club._id
                  );
                  club.colors = {
                    primary: "#06054e",
                    secondary: "#facc15",
                    accent: "",
                  };
                }

                return <ClubCard key={club.id || club._id} club={club} />;
              })}
            </div>
          </div>
        )}

        {/* Inactive Clubs */}
        {inactiveClubs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black uppercase text-slate-400 mb-4">
              Inactive Clubs ({inactiveClubs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inactiveClubs.map((club) => {
                // --- DEBUG CODE START ---
                if (
                  !club.colors ||
                  typeof club.colors.primary === "undefined"
                ) {
                  // This will help you see if the property is missing, null, or named differently
                  console.log("🔍 Inspecting 'All Stars' Object:", {
                    name: club.name,
                    keysPresent: Object.keys(club),
                    colorsObject: club.colors,
                    rawClub: club,
                  });

                  console.error(
                    "❌ CRASH PREVENTED: Missing color data for:",
                    club.name || club._id
                  );
                  club.colors = {
                    primary: "#06054e",
                    secondary: "#facc15",
                    accent: "",
                  };
                }
                // --- DEBUG CODE END ---

                return (
                  <ClubCard
                    key={club._id}
                    club={club}
                    onEdit={() => setEditingClub(club)}
                    onDelete={() => handleDeleteClub(club._id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredClubs.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-8 bg-white rounded-3xl shadow-lg">
              <p className="text-xl font-black uppercase text-slate-400">
                {searchQuery ? "No clubs found" : "No clubs yet"}
              </p>
              <p className="text-sm text-slate-500 mt-2 mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first club"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase hover:bg-green-700"
                >
                  + Add Club
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddClubModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddClub}
        />
      )}

      {editingClub && (
        <EditClubModal
          club={editingClub}
          onClose={() => setEditingClub(null)}
          onSubmit={handleUpdateClub}
        />
      )}
    </div>
  );
}
