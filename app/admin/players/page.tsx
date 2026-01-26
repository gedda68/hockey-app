"use client";

import { useState, useEffect } from "react";
import { Search, Users, Filter, X } from "lucide-react";
import AddPlayerForm from "../components/AddPlayerForm";

interface Player {
  _id: string;
  playerId: string;
  name: string;
  clubId: string;
  primaryPosition: string;
  secondaryPosition?: string;
  dateOfBirth?: string;
  gender?: string;
  status: {
    active: boolean;
    label: string;
    effectiveDate: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Club {
  id: string;
  name: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClub, setFilterClub] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPosition, setFilterPosition] = useState("");

  // Fetch players and clubs
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [playersRes, clubsRes] = await Promise.all([
          fetch("/api/admin/players"),
          fetch("/api/admin/clubs"),
        ]);

        const playersData = await playersRes.json();
        const clubsData = await clubsRes.json();

        setPlayers(Array.isArray(playersData) ? playersData : []);
        setClubs(
          Array.isArray(clubsData)
            ? clubsData.sort((a, b) => a.name.localeCompare(b.name))
            : []
        );
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get club name from ID
  const getClubName = (clubId: string) => {
    const club = clubs.find((c) => c.id === clubId);
    return club?.name || "Unknown Club";
  };

  // Filter players
  const filteredPlayers = players.filter((player) => {
    // Search by name
    const matchesSearch = player.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Filter by club
    const matchesClub = !filterClub || player.clubId === filterClub;

    // Filter by status
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && player.status.active) ||
      (filterStatus === "inactive" && !player.status.active);

    // Filter by position
    const matchesPosition =
      !filterPosition ||
      player.primaryPosition === filterPosition ||
      player.secondaryPosition === filterPosition;

    return matchesSearch && matchesClub && matchesStatus && matchesPosition;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterClub("");
    setFilterStatus("all");
    setFilterPosition("");
  };

  const hasActiveFilters =
    searchTerm || filterClub || filterStatus !== "all" || filterPosition;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
            <Users className="text-yellow-500" />
            Player Management
          </h1>
          <p className="text-slate-600 mt-2">
            Manage and search through all registered players
          </p>
        </div>

        {/* Add Player Form */}
        <AddPlayerForm />

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-[#06054e]" />
            <h2 className="text-xl font-black uppercase text-[#06054e]">
              Search & Filter Players
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search by Name */}
            <div className="lg:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                Search by Name
              </label>
              <div className="relative">
                <Search
                  className="absolute left-4 top-4 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="Type player name..."
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter by Club */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                Club
              </label>
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
              >
                <option value="">All Clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Filter by Position */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                Position
              </label>
              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
              >
                <option value="">All Positions</option>
                <option value="Striker">Striker</option>
                <option value="Midfield">Midfield</option>
                <option value="Fullback">Fullback</option>
                <option value="Halfback">Halfback</option>
                <option value="Goalkeeper">Goalkeeper</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2"
            >
              <X size={16} />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Players List */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-6">
            <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
              <Users size={24} />
              Players ({filteredPlayers.length})
            </h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
                <p className="mt-4 text-slate-600 font-bold">
                  Loading players...
                </p>
              </div>
            ) : filteredPlayers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Player ID
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Name
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Club
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Position
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Gender
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, index) => (
                    <tr
                      key={player._id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm text-slate-600">
                          {player.playerId}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900">
                          {player.name}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-indigo-600 font-semibold">
                          {getClubName(player.clubId)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-700">
                            {player.primaryPosition}
                          </span>
                          {player.secondaryPosition &&
                            player.secondaryPosition !== "N/A" && (
                              <span className="text-xs text-slate-500">
                                {player.secondaryPosition}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                            player.status.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {player.status.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-slate-600">
                          {player.gender || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <Users className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-slate-600 font-bold">
                  {hasActiveFilters
                    ? "No players match your search criteria"
                    : "No players registered yet"}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                  >
                    Clear filters to see all players
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
