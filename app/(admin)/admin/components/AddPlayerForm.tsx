"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, Save, Loader2, Search, X } from "lucide-react";

interface Club {
  id: string;
  name: string;
}

export default function AddPlayerForm() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Club search state
  const [clubSearchTerm, setClubSearchTerm] = useState("");
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    clubId: "",
    primaryPosition: "Midfield",
    secondaryPosition: "",
    dateOfBirth: "",
    gender: "Male",
  });

  // Fetch clubs on mount
  useEffect(() => {
    const fetchClubs = async () => {
      setIsLoadingClubs(true);
      try {
        const res = await fetch("/api/admin/clubs");
        if (!res.ok) throw new Error("Could not fetch clubs");
        const data = await res.json();

        // Sort clubs alphabetically
        const sortedClubs = Array.isArray(data)
          ? data.sort((a, b) => a.name.localeCompare(b.name))
          : [];

        setClubs(sortedClubs);
      } catch (err: any) {
        console.error("Error fetching clubs:", err);
        setError("Failed to load clubs.");
      } finally {
        setIsLoadingClubs(false);
      }
    };

    fetchClubs();
  }, []);

  // Filter clubs based on search term
  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(clubSearchTerm.toLowerCase())
  );

  // Handle club selection
  const handleClubSelect = (club: Club) => {
    setSelectedClub(club);
    setFormData({ ...formData, clubId: club.id });
    setClubSearchTerm(club.name);
    setShowClubDropdown(false);
  };

  // Clear club selection
  const handleClearClub = () => {
    setSelectedClub(null);
    setFormData({ ...formData, clubId: "" });
    setClubSearchTerm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clubId) {
      alert("Please select a club");
      return;
    }

    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Player registered successfully!");
        // Reset form
        setFormData({
          name: "",
          clubId: "",
          primaryPosition: "Midfield",
          secondaryPosition: "",
          dateOfBirth: "",
          gender: "Male",
        });
        handleClearClub();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || "Failed to register player"}`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to register player");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-2xl"
    >
      <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
        <UserPlus className="text-yellow-500" /> Register Player
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Input */}
        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Player Name"
          />
        </div>

        {/* Club Searchable Dropdown */}
        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
            Club Association
          </label>
          <div className="relative">
            <div className="relative">
              <Search
                className="absolute left-4 top-4 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={clubSearchTerm}
                onChange={(e) => {
                  setClubSearchTerm(e.target.value);
                  setShowClubDropdown(true);
                }}
                onFocus={() => setShowClubDropdown(true)}
                className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                placeholder={
                  isLoadingClubs ? "Loading clubs..." : "Search clubs..."
                }
                disabled={isLoadingClubs}
              />
              {selectedClub && (
                <button
                  type="button"
                  onClick={handleClearClub}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
              {isLoadingClubs && (
                <Loader2
                  className="absolute right-4 top-4 animate-spin text-slate-300"
                  size={18}
                />
              )}
            </div>

            {/* Dropdown List */}
            {showClubDropdown && !isLoadingClubs && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                {filteredClubs.length > 0 ? (
                  filteredClubs.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => handleClubSelect(club)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors font-bold ${
                        selectedClub?.id === club.id
                          ? "bg-yellow-50 text-yellow-700"
                          : "text-slate-700"
                      }`}
                    >
                      {club.name}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    No clubs found
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedClub && (
            <div className="mt-2 text-xs text-green-600 font-bold ml-2">
              ✓ Selected: {selectedClub.name}
            </div>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
            Date of Birth
          </label>
          <input
            type="date"
            required
            value={formData.dateOfBirth}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
            onChange={(e) =>
              setFormData({ ...formData, dateOfBirth: e.target.value })
            }
          />
        </div>

        {/* Gender */}
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
            Gender
          </label>
          <select
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value })
            }
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Primary Position */}
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
            Primary Position
          </label>
          <select
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
            value={formData.primaryPosition}
            onChange={(e) =>
              setFormData({ ...formData, primaryPosition: e.target.value })
            }
          >
            <option value="Striker">Striker</option>
            <option value="Midfield">Midfield</option>
            <option value="Fullback">Fullback</option>
            <option value="Halfback">Halfback</option>
            <option value="Goalkeeper">Goalkeeper</option>
          </select>
        </div>

        {/* Secondary Position */}
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
            Secondary Position (Optional)
          </label>
          <select
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
            value={formData.secondaryPosition}
            onChange={(e) =>
              setFormData({ ...formData, secondaryPosition: e.target.value })
            }
          >
            <option value="">None</option>
            <option value="Striker">Striker</option>
            <option value="Midfield">Midfield</option>
            <option value="Fullback">Fullback</option>
            <option value="Halfback">Halfback</option>
            <option value="Goalkeeper">Goalkeeper</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoadingClubs || !selectedClub}
        className="mt-8 w-full bg-[#06054e] text-white p-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={20} /> Save Player Record
      </button>
    </form>
  );
}
