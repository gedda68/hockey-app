"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  UserPlus,
  Save,
  History,
  Activity,
  ChevronDown,
  Loader2,
  Calendar,
} from "lucide-react";

const STATUS_OPTIONS = [
  "injured",
  "moved to different organisation",
  "retired",
  "deceased",
  "no longer playing",
];

const POSITIONS = ["Striker", "Midfield", "Halfback", "Fullback", "Goalkeeper"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function PlayerAdminPage() {
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Type-ahead state
  const [clubSearch, setClubSearch] = useState("");
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    playerId: "",
    clubId: "",
    dateOfBirth: "",
    gender: "Male",
    primaryPosition: "Midfield",
    secondaryPosition: "",
    active: true,
    statusReason: "",
    statusDate: new Date().toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch independently so one failure doesn't block the other
    try {
      // 1. Fetch Clubs (for the dropdown)
      const cRes = await fetch("/api/admin/clubs");
      if (cRes.ok) {
        const cData = await cRes.json();
        setClubs(Array.isArray(cData) ? cData : []);
      } else {
        console.error("Clubs API failed with status:", cRes.status);
      }

      // 2. Fetch Players (for the list)
      const pRes = await fetch("/api/admin/players");
      if (pRes.ok) {
        const pData = await pRes.json();
        setPlayers(Array.isArray(pData) ? pData : []);
      } else {
        console.error("Players API failed with status:", pRes.status);
      }
    } catch (error) {
      console.error("Network or Parsing Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Clubs for Type-ahead
  const filteredClubs = useMemo(() => {
    return clubs.filter((c: any) =>
      (c.name || "").toLowerCase().includes(clubSearch.toLowerCase())
    );
  }, [clubSearch, clubs]);

  const filteredPlayers = players.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPlayer = (player: any) => {
    setSelectedPlayer(player);
    // Find matching club name for the search input
    const clubMatch = clubs.find(
      (c: any) => c.id === player.clubId || c.name === player.clubId
    );
    setClubSearch(clubMatch ? clubMatch.name : player.clubId || "");

    setFormData({
      name: player.name,
      playerId: player.playerId,
      clubId: player.clubId,
      dateOfBirth: player.dateOfBirth || "",
      gender: player.gender || "Male",
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition || "",
      active: player.status?.active ?? true,
      statusReason: player.status?.reason || "",
      statusDate:
        player.status?.effectiveDate || new Date().toISOString().split("T")[0],
    });
  };

  const handleReset = () => {
    setSelectedPlayer(null);
    setClubSearch("");
    setFormData({
      name: "",
      playerId: `P-${Date.now()}`,
      clubId: "",
      dateOfBirth: "",
      gender: "Male",
      primaryPosition: "Midfield",
      secondaryPosition: "",
      active: true,
      statusReason: "",
      statusDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const method = selectedPlayer ? "PUT" : "POST";

    try {
      const res = await fetch("/api/admin/players", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchData();
        handleReset();
        alert("Database updated successfully.");
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans text-slate-900">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#06054e]">
            Player Registry
          </h1>
          <p className="text-slate-500 font-medium italic">
            Manage athlete lifecycle and historical records.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-[#06054e] text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
        >
          <UserPlus size={18} /> Add New Player
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Search & List */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="w-full p-5 pl-12 bg-white rounded-[2rem] border-none shadow-sm focus:ring-4 ring-yellow-400/20 outline-none"
              placeholder="Search registry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-400">
                Registered Athletes
              </h3>
              <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500">
                {filteredPlayers.length} Total
              </span>
            </div>
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-20 flex justify-center">
                  <Loader2 className="animate-spin text-slate-300" />
                </div>
              ) : (
                filteredPlayers.map((p: any) => (
                  <button
                    key={p.playerId}
                    onClick={() => handleSelectPlayer(p)}
                    className={`w-full p-5 text-left border-b border-slate-50 flex items-center gap-4 transition-all hover:bg-slate-50 ${
                      selectedPlayer?.playerId === p.playerId
                        ? "bg-yellow-50/50 border-l-4 border-l-yellow-400"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                        p.status?.active
                          ? "bg-[#06054e] text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[#06054e] uppercase leading-none mb-1">
                        {p.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {p.clubId}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Management Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden sticky top-10"
          >
            <div className="p-8 bg-[#06054e] text-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {selectedPlayer ? "Edit Profile" : "New Player Profile"}
              </h2>
              <Activity
                className={formData.active ? "text-green-400" : "text-red-400"}
              />
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    Full Name
                  </label>
                  <input
                    required
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:bg-white focus:ring-4 ring-slate-100 outline-none font-bold"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                {/* CLUB TYPE-AHEAD */}
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    Club Association
                  </label>
                  <div className="relative">
                    <input
                      required
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold"
                      placeholder="Start typing club name..."
                      value={clubSearch}
                      onFocus={() => setShowClubDropdown(true)}
                      onChange={(e) => {
                        setClubSearch(e.target.value);
                        setFormData({ ...formData, clubId: e.target.value });
                        setShowClubDropdown(true);
                      }}
                    />
                    <ChevronDown
                      className="absolute right-4 top-4 text-slate-400"
                      size={18}
                    />
                  </div>
                  {showClubDropdown && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto">
                      {filteredClubs.length > 0 ? (
                        filteredClubs.map((club: any) => (
                          <div
                            key={club.id || club.name}
                            className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-sm text-[#06054e] border-b border-slate-50 last:border-none"
                            onClick={() => {
                              setFormData({ ...formData, clubId: club.name });
                              setClubSearch(club.name);
                              setShowClubDropdown(false);
                            }}
                          >
                            {club.name}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-xs font-bold text-slate-400 italic">
                          No clubs found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    Primary Position
                  </label>
                  <select
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold"
                    value={formData.primaryPosition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryPosition: e.target.value,
                      })
                    }
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    Secondary Position (Optional)
                  </label>
                  <select
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold"
                    value={formData.secondaryPosition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        secondaryPosition: e.target.value,
                      })
                    }
                  >
                    <option value="">N/A</option>
                    {POSITIONS.filter(
                      (p) => p !== formData.primaryPosition
                    ).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    Gender
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${
                          formData.gender === g
                            ? "bg-[#06054e] border-[#06054e] text-white shadow-md"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <hr className="border-slate-50" />

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-black text-[#06054e] text-sm uppercase">
                      Currently Active
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Toggle eligibility
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-6 h-6 accent-[#06054e] cursor-pointer"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                  />
                </div>

                {!formData.active && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <select
                      required
                      className="w-full p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 outline-none font-black uppercase text-xs"
                      value={formData.statusReason}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          statusReason: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Reason...</option>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold"
                      value={formData.statusDate}
                      onChange={(e) =>
                        setFormData({ ...formData, statusDate: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  disabled={isSaving}
                  className="flex-1 bg-[#06054e] text-white p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3 hover:bg-yellow-400 hover:text-[#06054e] transition-all"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save size={20} />
                  )}
                  {selectedPlayer ? "Update Athlete" : "Register Athlete"}
                </button>
                {selectedPlayer && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
