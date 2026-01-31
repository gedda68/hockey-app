// app/(website)/clubs/[clubId]/teams/TeamsList.tsx
// Teams list component with filtering and stats

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  Trophy,
  UserCheck,
  Shield,
  TrendingUp,
  ChevronRight,
  Star,
  Crown,
  X,
} from "lucide-react";

interface Team {
  _id: string;
  teamId: string;
  name: string;
  displayName: string;
  gender?: "male" | "female" | "mixed";
  ageCategory: "junior" | "senior" | "masters";
  division: {
    name: string;
    level: number;
    shortName: string;
  };
  season: string;
  competition?: string;
  leadership: {
    captain?: string;
    viceCaptains: string[];
  };
  statistics: {
    totalRegistered: number;
    totalAssigned: number;
    totalGoalkeepers: number;
    activeMembers: number;
  };
  status: string;
}

interface TeamsListProps {
  clubId: string;
}

const AGE_CATEGORY_COLORS = {
  junior: "bg-blue-100 text-blue-700 border-blue-200",
  senior: "bg-green-100 text-green-700 border-green-200",
  masters: "bg-purple-100 text-purple-700 border-purple-200",
} as const;

const AGE_CATEGORY_LABELS = {
  junior: "Junior",
  senior: "Senior",
  masters: "Masters",
} as const;

export default function TeamsList({ clubId }: TeamsListProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Available filters
  const [seasons, setSeasons] = useState<string[]>([]);

  useEffect(() => {
    fetchTeams();
  }, [clubId, statusFilter]);

  useEffect(() => {
    filterTeams();
  }, [teams, searchQuery, selectedCategory, selectedSeason]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const res = await fetch(`/api/clubs/${clubId}/teams?${params}`);
      if (!res.ok) throw new Error("Failed to fetch teams");

      const data = await res.json();
      setTeams(data);

      // Extract unique seasons
      const uniqueSeasons = [...new Set(data.map((t: Team) => t.season))]
        .sort()
        .reverse();
      setSeasons(uniqueSeasons);

      // Set default season to most recent
      if (uniqueSeasons.length > 0 && selectedSeason === "all") {
        setSelectedSeason(uniqueSeasons[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTeams = () => {
    let filtered = teams;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.name.toLowerCase().includes(query) ||
          team.displayName.toLowerCase().includes(query) ||
          team.division.shortName.toLowerCase().includes(query) ||
          team.competition?.toLowerCase().includes(query)
      );
    }

    // Age category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (team) => team.ageCategory === selectedCategory
      );
    }

    // Season filter
    if (selectedSeason !== "all") {
      filtered = filtered.filter((team) => team.season === selectedSeason);
    }

    // Sort by age category and division level
    filtered.sort((a, b) => {
      if (a.ageCategory !== b.ageCategory) {
        const order = { junior: 0, senior: 1, masters: 2 };
        return order[a.ageCategory] - order[b.ageCategory];
      }
      return a.division.level - b.division.level;
    });

    setFilteredTeams(filtered);
  };

  const clearSearch = () => setSearchQuery("");

  const getTeamStatusColor = (stats: Team["statistics"]) => {
    if (stats.totalRegistered < 9) {
      return "bg-red-100 text-red-700";
    } else if (stats.totalRegistered < 15) {
      return "bg-yellow-100 text-yellow-700";
    } else {
      return "bg-green-100 text-green-700";
    }
  };

  const getTeamStatusText = (stats: Team["statistics"]) => {
    if (stats.totalRegistered < 9) {
      return "Needs Players";
    } else if (stats.totalRegistered < 15) {
      return "Building";
    } else {
      return "Ready";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#06054e]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6">
        <p className="text-red-800 font-bold">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#06054e]">Teams</h1>
          <p className="text-slate-600 font-bold mt-1">
            {filteredTeams.length}{" "}
            {filteredTeams.length === 1 ? "team" : "teams"}
          </p>
        </div>

        <Link
          href={`/clubs/${clubId}/teams/new`}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
        >
          <Plus size={20} />
          Create Team
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full pl-11 pr-11 py-3 text-base bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-black text-slate-600">
            <Filter size={16} className="inline mr-1" />
            Filters:
          </span>

          {/* Age Category */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-[#06054e] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {(["junior", "senior", "masters"] as const).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedCategory === category
                    ? AGE_CATEGORY_COLORS[category].replace(
                        "bg-",
                        "bg-opacity-100 "
                      )
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {AGE_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {/* Season */}
          {seasons.length > 1 && (
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-4 py-2 bg-slate-100 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 ring-yellow-400 transition-all"
            >
              <option value="all">All Seasons</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          )}

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-100 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 ring-yellow-400 transition-all"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="all">All Status</option>
          </select>
        </div>

        {/* Active filters summary */}
        {(searchQuery ||
          selectedCategory !== "all" ||
          selectedSeason !== "all") && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm">
            <span className="font-bold text-slate-500">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">
                Search: "{searchQuery}"
              </span>
            )}
            {selectedCategory !== "all" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">
                {
                  AGE_CATEGORY_LABELS[
                    selectedCategory as keyof typeof AGE_CATEGORY_LABELS
                  ]
                }
              </span>
            )}
            {selectedSeason !== "all" && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold">
                Season: {selectedSeason}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-600 mb-2">
            {searchQuery ||
            selectedCategory !== "all" ||
            selectedSeason !== "all"
              ? "No teams found"
              : "No teams yet"}
          </h3>
          <p className="text-slate-500 font-bold mb-6">
            {searchQuery ||
            selectedCategory !== "all" ||
            selectedSeason !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first team"}
          </p>
          {searchQuery ||
          selectedCategory !== "all" ||
          selectedSeason !== "all" ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedSeason("all");
              }}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              href={`/clubs/${clubId}/teams/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              <Plus size={20} />
              Create First Team
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Link
              key={team.teamId}
              href={`/clubs/${clubId}/teams/${team.teamId}`}
              className="group bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 hover:shadow-2xl hover:border-yellow-400 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-black text-[#06054e] group-hover:text-yellow-600 transition-colors mb-1">
                    {team.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-500">
                    {team.division.shortName} • {team.season}
                  </p>
                </div>
                <ChevronRight
                  size={24}
                  className="text-slate-300 group-hover:text-yellow-400 transition-colors"
                />
              </div>

              {/* Age Category Badge */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${
                    AGE_CATEGORY_COLORS[team.ageCategory]
                  }`}
                >
                  {AGE_CATEGORY_LABELS[team.ageCategory]}
                </span>
                {team.gender && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border-2 border-slate-200">
                    {team.gender.charAt(0).toUpperCase() + team.gender.slice(1)}
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${getTeamStatusColor(
                    team.statistics
                  )}`}
                >
                  {getTeamStatusText(team.statistics)}
                </span>
              </div>

              {/* Competition */}
              {team.competition && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                    <Trophy size={14} className="text-slate-400" />
                    {team.competition}
                  </p>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-[#06054e]">
                    {team.statistics.totalRegistered}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    Players
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#06054e]">
                    {team.statistics.totalGoalkeepers}
                  </div>
                  <div className="text-xs font-bold text-slate-500">GK</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#06054e]">
                    {team.statistics.totalAssigned}
                  </div>
                  <div className="text-xs font-bold text-slate-500">Staff</div>
                </div>
              </div>

              {/* Leadership */}
              {(team.leadership.captain ||
                team.leadership.viceCaptains.length > 0) && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm">
                    {team.leadership.captain && (
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Crown size={14} />
                        <span>Captain</span>
                      </div>
                    )}
                    {team.leadership.viceCaptains.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-600 font-bold">
                        <Star size={14} />
                        <span>{team.leadership.viceCaptains.length} VC</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Roster</span>
                  <span>{team.statistics.totalRegistered}/18</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#06054e] to-yellow-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (team.statistics.totalRegistered / 18) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
