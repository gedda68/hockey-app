// components/admin/teams/TeamsList.tsx
// Teams list with filtering by club, division, gender, and season

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Users,
  Trophy,
  Calendar,
  MapPin,
  UserPlus,
  Activity,
  Clock,
  XCircle,
  Shield,
  ChevronRight,
} from "lucide-react";
import type { AdminTeamListItem } from "@/types/admin/teams.types";

interface Club {
  clubId: string;
  name: string;
}

export default function TeamsList() {
  const router = useRouter();
  const [teams, setTeams] = useState<AdminTeamListItem[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [teamsRes, clubsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/admin/clubs"),
      ]);

      const teamsData = await teamsRes.json();
      const clubsData = await clubsRes.json();

      setTeams(teamsData.teams || []);
      setClubs(clubsData.clubs || []);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique divisions, seasons
  const divisions = [...new Set(teams.map((t) => t.division))].sort();
  const seasons = [...new Set(teams.map((t) => t.season))].sort().reverse();

  // Filter teams
  const filteredTeams = teams.filter((team) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      team.name?.toLowerCase().includes(searchLower) ||
      team.displayName?.toLowerCase().includes(searchLower) ||
      team.clubName?.toLowerCase().includes(searchLower) ||
      team.division?.toLowerCase().includes(searchLower);

    const matchesClub = clubFilter === "all" || team.clubId === clubFilter;
    const matchesDivision =
      divisionFilter === "all" || team.division === divisionFilter;
    const matchesGender =
      genderFilter === "all" || team.gender === genderFilter;
    const matchesSeason =
      seasonFilter === "all" || team.season === seasonFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && team.active) ||
      (statusFilter === "inactive" && !team.active);

    return (
      matchesSearch &&
      matchesClub &&
      matchesDivision &&
      matchesGender &&
      matchesSeason &&
      matchesStatus
    );
  });

  // Count by status
  const statusCounts = {
    all: teams.length,
    active: teams.filter((t) => t.active).length,
    inactive: teams.filter((t) => !t.active).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">Teams</h1>
              <p className="text-blue-100 text-sm font-bold">
                {filteredTeams.length}{" "}
                {filteredTeams.length === 1 ? "team" : "teams"}
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/teams/new")}
              className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg"
            >
              <UserPlus size={20} />
              Create Team
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-100">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search teams by name, division, or club..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                statusFilter === "active"
                  ? "bg-green-600 text-white"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              <Activity size={16} />
              Active ({statusCounts.active})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                statusFilter === "inactive"
                  ? "bg-slate-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Clock size={16} />
              Inactive ({statusCounts.inactive})
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Club Filter */}
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none bg-white"
            >
              <option value="all">All Clubs</option>
              {clubs.map((club) => (
                <option key={club.clubId} value={club.clubId}>
                  {club.name}
                </option>
              ))}
            </select>

            {/* Division Filter */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none bg-white"
            >
              <option value="all">All Divisions</option>
              {divisions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none bg-white"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="mixed">Mixed</option>
            </select>

            {/* Season Filter */}
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none bg-white"
            >
              <option value="all">All Seasons</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-slate-100">
            <Users size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {search || clubFilter !== "all" || divisionFilter !== "all"
                ? "No teams found"
                : "No teams yet"}
            </h3>
            <p className="text-slate-600 mb-6">
              {search || clubFilter !== "all" || divisionFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first team"}
            </p>
            {!search && clubFilter === "all" && (
              <button
                onClick={() => router.push("/admin/teams/new")}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <UserPlus size={20} />
                Create First Team
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              const playerCount = team.players?.length || 0;
              const coachCount = team.coaches?.length || 0;

              return (
                <div
                  key={team.teamId}
                  className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
                  onClick={() =>
                    router.push(`/admin/teams/${team.teamId}/edit`)
                  }
                >
                  {/* Team Header with Colors */}
                  <div
                    className="h-32 relative"
                    style={{
                      background: `linear-gradient(135deg, ${team.colors.primary} 0%, ${team.colors.secondary} 100%)`,
                    }}
                  >
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="absolute inset-0 w-full h-full object-contain p-4"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={64} className="text-white opacity-30" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full ${
                        team.active
                          ? "bg-green-500 text-white"
                          : "bg-slate-400 text-white"
                      } text-xs font-black flex items-center gap-1 shadow-lg`}
                    >
                      {team.active ? (
                        <Activity size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {team.active ? "ACTIVE" : "INACTIVE"}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Team Name */}
                    <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {team.name}
                    </h3>

                    {/* Club Name */}
                    {team.clubName && (
                      <p className="text-sm text-blue-600 font-bold mb-3">
                        {team.clubName}
                      </p>
                    )}

                    {/* Team Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">
                          Division:
                        </span>
                        <span className="font-black text-slate-900">
                          {team.division}{" "}
                          {team.gender &&
                            `• ${team.gender.charAt(0).toUpperCase() + team.gender.slice(1)}`}
                        </span>
                      </div>

                      {team.grade && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">
                            Grade:
                          </span>
                          <span className="font-black text-slate-900">
                            {team.grade}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">
                          Season:
                        </span>
                        <span className="font-black text-slate-900">
                          {team.season}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-slate-500 font-bold flex items-center gap-1">
                          <Users size={14} />
                          Players:
                        </span>
                        <span className="font-black text-blue-600">
                          {playerCount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold flex items-center gap-1">
                          <Trophy size={14} />
                          Coaches:
                        </span>
                        <span className="font-black text-green-600">
                          {coachCount}
                        </span>
                      </div>

                      {team.homeGround && (
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                          <MapPin
                            size={14}
                            className="text-slate-400 mt-0.5 flex-shrink-0"
                          />
                          <span className="text-xs text-slate-600 font-bold">
                            {team.homeGround}
                          </span>
                        </div>
                      )}

                      {/* Stats if available */}
                      {team.stats && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-xs text-slate-500 font-bold">
                                W
                              </p>
                              <p className="text-lg font-black text-green-600">
                                {team.stats.won}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-bold">
                                D
                              </p>
                              <p className="text-lg font-black text-amber-600">
                                {team.stats.drawn}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-bold">
                                L
                              </p>
                              <p className="text-lg font-black text-red-600">
                                {team.stats.lost}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-bold">
                                Pts
                              </p>
                              <p className="text-lg font-black text-blue-600">
                                {team.stats.points}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Button */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-blue-600 font-bold group-hover:text-blue-700">
                        <span>View Team Details</span>
                        <ChevronRight
                          size={20}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </div>
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
