"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Edit,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  Building2,
  Target,
} from "lucide-react";
import { calculateAge } from "./types/player.types";

interface Player {
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: string;
  clubId: string;
  primaryPosition: string;
  photo?: string;
  registrationStatus: "pending" | "approved" | "rejected" | "inactive";
  medical?: {
    allergies?: string;
    conditions?: string;
  };
  address?: {
    suburb: string;
    state: string;
  };
  active: boolean;
}

interface Club {
  id: string;
  name: string;
  shortName: string;
}

export default function PlayersList() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClub, setFilterClub] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterGender, setFilterGender] = useState("");

  useEffect(() => {
    fetchData();
  }, [filterClub, filterStatus, filterGender]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [playersRes, clubsRes] = await Promise.all([
        fetch("/api/admin/players"),
        fetch("/api/admin/clubs"),
      ]);

      const playersData = await playersRes.json();
      const clubsData = await clubsRes.json();

      setPlayers(
        Array.isArray(playersData) ? playersData : playersData.players || [],
      );
      setClubs(Array.isArray(clubsData) ? clubsData : clubsData.clubs || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getClubName = (clubId: string) => {
    const club = clubs.find((c) => c.id === clubId);
    return club?.name || "Unknown Club";
  };

  const filteredPlayers = players.filter((player) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      player.firstName.toLowerCase().includes(searchLower) ||
      player.lastName.toLowerCase().includes(searchLower) ||
      player.preferredName?.toLowerCase().includes(searchLower) ||
      false;

    const matchesClub = !filterClub || player.clubId === filterClub;

    const matchesStatus =
      filterStatus === "" ||
      (filterStatus === "active" && player.active) ||
      (filterStatus === "inactive" && !player.active);

    const matchesGender = !filterGender || player.gender === filterGender;

    return matchesSearch && matchesClub && matchesStatus && matchesGender;
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    inactive: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-[#06054e] text-white flex items-center justify-center">
                <Users size={40} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-[#06054e] tracking-tight">
                  Players
                </h1>
                <p className="text-slate-500 font-bold">
                  Manage player registrations and details
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/players/new")}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              <Plus size={20} />
              New Player
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
                />
              </div>
            </div>

            {/* Club Filter */}
            <div>
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
              >
                <option value="">All Clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.shortName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Gender Filter (second row) */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-slate-500 font-bold">
              {filteredPlayers.length} player
              {filteredPlayers.length !== 1 ? "s" : ""} found
            </span>
            {(search || filterClub || filterStatus || filterGender) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterClub("");
                  setFilterStatus("active");
                  setFilterGender("");
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Players Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#06054e]" size={40} />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
            <Users size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-600 mb-2">
              No players found
            </h3>
            <p className="text-slate-400 mb-6">
              {search || filterClub
                ? "Try adjusting your filters"
                : "Get started by registering your first player"}
            </p>
            {!search && !filterClub && (
              <button
                onClick={() => router.push("/admin/players/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e]"
              >
                <Plus size={20} />
                Register Player
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => {
              const age = player.dateOfBirth
                ? calculateAge(player.dateOfBirth)
                : null;
              const hasAllergies = player.medical?.allergies?.trim().length > 0;

              return (
                <div
                  key={player.playerId}
                  className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
                  onClick={() =>
                    router.push(`/admin/players/${player.playerId}/edit`)
                  }
                >
                  {/* Header */}
                  <div className="h-24 bg-gradient-to-r from-[#06054e] to-blue-600 relative">
                    <div className="absolute inset-0 flex items-center justify-between p-6">
                      <div className="flex items-center gap-3">
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-16 h-16 rounded-full border-4 border-white object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center font-black text-[#06054e] text-xl">
                            {player.firstName.charAt(0)}
                            {player.lastName.charAt(0)}
                          </div>
                        )}
                        {hasAllergies && (
                          <div className="bg-red-500 rounded-full p-1.5">
                            <AlertCircle size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/players/${player.playerId}/edit`);
                        }}
                        className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-all"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-black text-[#06054e] mb-1 group-hover:text-yellow-600 transition-colors">
                      {player.firstName} {player.lastName}
                    </h3>
                    {player.preferredName && (
                      <p className="text-sm text-slate-500 font-bold mb-2">
                        "{player.preferredName}"
                      </p>
                    )}

                    <div className="space-y-2 text-sm mt-4">
                      {age !== null && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar size={16} className="flex-shrink-0" />
                          <span className="font-bold">
                            {age} years old {age < 18 ? "(Minor)" : ""}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 size={16} className="flex-shrink-0" />
                        <span className="font-bold">
                          {getClubName(player.clubId)}
                        </span>
                      </div>

                      {player.primaryPosition && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Target size={16} className="flex-shrink-0" />
                          <span className="font-bold">
                            {player.primaryPosition}
                          </span>
                        </div>
                      )}

                      {player.address && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin size={16} className="flex-shrink-0" />
                          <span className="font-bold">
                            {player.address.suburb}, {player.address.state}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          statusColors[player.registrationStatus]
                        }`}
                      >
                        {player.registrationStatus}
                      </span>
                      {hasAllergies && (
                        <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                          <AlertCircle size={12} />
                          Allergies
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
