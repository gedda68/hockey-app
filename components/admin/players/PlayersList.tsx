// components/admin/players/PlayersList.tsx
// Players list with TYPE-AHEAD CLUB FILTER (no counts)

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  UserPlus,
  Activity,
  Clock,
  AlertCircle,
  XCircle,
  Archive,
  CheckCircle,
} from "lucide-react";

interface Player {
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  clubId?: string;
  photo?: string;
  linkedMemberId?: string;
  status?: {
    current: string;
    registrationDate?: string;
    expiryDate?: string;
  };
  clubName?: string;
  emergencyContacts?: Array<{
    id: string;
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    linkedMemberId?: string;
  }>;
  guardians?: Array<{
    id: string;
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    linkedMemberId?: string;
  }>;
}

interface Club {
  clubId: string;
  name: string;
  location?: string;
}

export default function PlayersList() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clubSearchText, setClubSearchText] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [showClubSuggestions, setShowClubSuggestions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [playersRes, clubsRes] = await Promise.all([
        fetch("/api/admin/players"),
        fetch("/api/admin/clubs"),
      ]);

      const playersData = await playersRes.json();
      const clubsData = await clubsRes.json();

      setClubs(clubsData.clubs || []);
      setPlayers(playersData.players || []);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status?: string) => {
    const statusMap = {
      active: {
        label: "Active",
        color: "bg-green-100 text-green-700 border-green-300",
        icon: Activity,
        textColor: "text-green-700",
      },
      inactive: {
        label: "Inactive",
        color: "bg-slate-100 text-slate-600 border-slate-300",
        icon: Clock,
        textColor: "text-slate-600",
      },
      pending: {
        label: "Pending",
        color: "bg-amber-100 text-amber-700 border-amber-300",
        icon: AlertCircle,
        textColor: "text-amber-700",
      },
      suspended: {
        label: "Suspended",
        color: "bg-red-100 text-red-700 border-red-300",
        icon: XCircle,
        textColor: "text-red-700",
      },
      archived: {
        label: "Archived",
        color: "bg-slate-100 text-slate-500 border-slate-300",
        icon: Archive,
        textColor: "text-slate-500",
      },
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  // Get filtered club suggestions
  const filteredClubSuggestions = clubs.filter((club) =>
    club.name.toLowerCase().includes(clubSearchText.toLowerCase()),
  );

  // Filter players
  const filteredPlayers = players.filter((player) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      player.firstName?.toLowerCase().includes(searchLower) ||
      player.lastName?.toLowerCase().includes(searchLower) ||
      player.preferredName?.toLowerCase().includes(searchLower) ||
      player.playerId?.toLowerCase().includes(searchLower) ||
      player.clubName?.toLowerCase().includes(searchLower);

    const playerStatus = player.status?.current || "pending";
    const matchesStatus =
      statusFilter === "all" || playerStatus === statusFilter;

    const matchesClub = clubFilter === "all" || player.clubId === clubFilter;

    return matchesSearch && matchesStatus && matchesClub;
  });

  const statusCounts = {
    all: players.length,
    active: players.filter((p) => p.status?.current === "active").length,
    pending: players.filter(
      (p) => !p.status?.current || p.status?.current === "pending",
    ).length,
    inactive: players.filter((p) => p.status?.current === "inactive").length,
    suspended: players.filter((p) => p.status?.current === "suspended").length,
    archived: players.filter((p) => p.status?.current === "archived").length,
  };

  const handleClubSelect = (club: Club | null) => {
    if (club) {
      setClubSearchText(club.name);
      setClubFilter(club.clubId);
    } else {
      setClubSearchText("");
      setClubFilter("all");
    }
    setShowClubSuggestions(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-30">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">Players</h1>
              <p className="text-blue-100 text-sm font-bold">
                {filteredPlayers.length}{" "}
                {filteredPlayers.length === 1 ? "player" : "players"}
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/players/new")}
              className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg"
            >
              <UserPlus size={20} />
              Add Player
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
                placeholder="Search by name, ID, or club..."
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
              onClick={() => setStatusFilter("pending")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <AlertCircle size={16} />
              Pending ({statusCounts.pending})
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
            <button
              onClick={() => setStatusFilter("suspended")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                statusFilter === "suspended"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <XCircle size={16} />
              Suspended ({statusCounts.suspended})
            </button>
            <button
              onClick={() => setStatusFilter("archived")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                statusFilter === "archived"
                  ? "bg-slate-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Archive size={16} />
              Archived ({statusCounts.archived})
            </button>
          </div>
        </div>

        {/* Players Grid */}
        {filteredPlayers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-slate-100">
            <UserPlus size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {search || statusFilter !== "all" || clubFilter !== "all"
                ? "No players found"
                : "No players yet"}
            </h3>
            <p className="text-slate-600 mb-6">
              {search || statusFilter !== "all" || clubFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first player"}
            </p>
            {!search && statusFilter === "all" && clubFilter === "all" && (
              <button
                onClick={() => router.push("/admin/players/new")}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <UserPlus size={20} />
                Add First Player
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => {
              const statusInfo = getStatusInfo(player.status?.current);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={player.playerId}
                  className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
                  onClick={() =>
                    router.push(`/admin/players/${player.playerId}/edit`)
                  }
                >
                  {/* Status Badge - Top Right */}
                  <div className="relative">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <div className="text-6xl font-black text-blue-300">
                          {player.firstName?.[0]}
                          {player.lastName?.[0]}
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded-full border-2 ${statusInfo.color} flex items-center gap-1.5 shadow-lg`}
                    >
                      <StatusIcon size={14} />
                      <span className="text-xs font-black uppercase">
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Player Name */}
                    <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {player.firstName} {player.lastName}
                    </h3>

                    {/* Preferred Name */}
                    {player.preferredName &&
                      player.preferredName !== player.firstName && (
                        <p className="text-sm text-slate-500 font-bold mb-2">
                          "{player.preferredName}"
                        </p>
                      )}

                    {/* Player Info */}
                    <div className="space-y-2 text-sm mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">
                          Player ID:
                        </span>
                        <span className="font-black text-slate-900">
                          {player.playerId}
                        </span>
                      </div>

                      {player.linkedMemberId && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">
                            Member ID:
                          </span>
                          <span className="font-black text-slate-900">
                            {player.linkedMemberId}
                          </span>
                        </div>
                      )}

                      {/* Club Name */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Club:</span>
                        <span
                          className={`font-black ${player.clubName && player.clubName !== "No Club" ? "text-blue-700" : "text-slate-400"}`}
                        >
                          {player.clubName || "No Club"}
                        </span>
                      </div>

                      {player.gender && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">
                            Gender:
                          </span>
                          <span className="font-black text-slate-900">
                            {player.gender}
                          </span>
                        </div>
                      )}

                      {/* Registration Dates */}
                      {player.status?.registrationDate && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-slate-500 font-bold">
                            Registered:
                          </span>
                          <span className="font-black text-slate-900 text-xs">
                            {new Date(
                              player.status.registrationDate,
                            ).toLocaleDateString("en-AU", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}

                      {player.status?.expiryDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">
                            Expires:
                          </span>
                          <span
                            className={`font-black text-xs ${
                              new Date(player.status.expiryDate) < new Date()
                                ? "text-red-600"
                                : "text-slate-900"
                            }`}
                          >
                            {new Date(
                              player.status.expiryDate,
                            ).toLocaleDateString("en-AU", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Linked Members */}
                    {(player.emergencyContacts &&
                      player.emergencyContacts.length > 0) ||
                    (player.guardians && player.guardians.length > 0) ? (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-black uppercase text-slate-400 mb-2">
                          Linked Members:
                        </p>
                        <div className="space-y-1.5">
                          {/* Emergency Contacts */}
                          {player.emergencyContacts?.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-start gap-2 text-xs"
                            >
                              <CheckCircle
                                size={12}
                                className="text-blue-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1">
                                <div>
                                  <span className="text-blue-700 font-bold">
                                    {contact.name}
                                  </span>
                                  {contact.linkedMemberId && (
                                    <span className="text-blue-600 ml-1">
                                      ({contact.linkedMemberId})
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500">
                                  Emergency Contact
                                  {contact.relationship &&
                                    ` - ${contact.relationship}`}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Guardians */}
                          {player.guardians?.map((guardian) => (
                            <div
                              key={guardian.id}
                              className="flex items-start gap-2 text-xs"
                            >
                              <CheckCircle
                                size={12}
                                className="text-purple-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1">
                                <div>
                                  <span className="text-purple-700 font-bold">
                                    {guardian.name}
                                  </span>
                                  {guardian.linkedMemberId && (
                                    <span className="text-purple-600 ml-1">
                                      ({guardian.linkedMemberId})
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500">
                                  Guardian
                                  {guardian.relationship &&
                                    ` - ${guardian.relationship}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
