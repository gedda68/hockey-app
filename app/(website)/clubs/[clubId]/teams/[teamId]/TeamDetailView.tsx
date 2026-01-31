// app/(website)/clubs/[clubId]/teams/[teamId]/TeamDetailView.tsx
// Team detail view with roster management

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Trophy,
  MapPin,
  Calendar,
  Shield,
  Crown,
  Star,
  UserPlus,
  AlertCircle,
  Check,
  X,
  Settings,
} from "lucide-react";
import RosterManager from "./RosterManager";

interface Team {
  _id: string;
  teamId: string;
  name: string;
  displayName: string;
  gender?: string;
  ageCategory: string;
  division: {
    name: string;
    level: number;
    shortName: string;
  };
  roster: Array<{
    memberId: string;
    roleId: string;
    roleCategory: string;
    registrationType: string;
    position?: string;
    jerseyNumber?: number;
    status: string;
    joinedDate: string;
    memberDetails?: {
      firstName: string;
      lastName: string;
      displayName: string;
      photoUrl?: string;
      email: string;
    };
  }>;
  leadership: {
    captain?: string;
    viceCaptains: string[];
  };
  season: string;
  competition?: string;
  grade?: string;
  homeGround?: string;
  trainingVenue?: string;
  trainingTimes?: string;
  status: string;
  statistics: {
    totalRegistered: number;
    totalAssigned: number;
    totalGoalkeepers: number;
    activeMembers: number;
    inactiveMembers: number;
    injuredMembers: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface TeamDetailViewProps {
  clubId: string;
  teamId: string;
}

const AGE_CATEGORY_COLORS = {
  junior: "bg-blue-100 text-blue-700 border-blue-200",
  senior: "bg-green-100 text-green-700 border-green-200",
  masters: "bg-purple-100 text-purple-700 border-purple-200",
} as const;

export default function TeamDetailView({
  clubId,
  teamId,
}: TeamDetailViewProps) {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRosterManager, setShowRosterManager] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, [clubId, teamId]);

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/clubs/${clubId}/teams/${teamId}?includeMembers=true`
      );

      if (!res.ok) throw new Error("Failed to fetch team");

      const data = await res.json();
      setTeam(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!team) return;

    if (
      !confirm(
        `Are you sure you want to delete ${team.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/clubs/${clubId}/teams/${teamId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete team");

      alert("Team deleted successfully");
      router.push(`/clubs/${clubId}/teams`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const getReadinessStatus = () => {
    if (!team) return null;

    const stats = team.statistics;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (stats.totalRegistered < 9) {
      errors.push(`Need ${9 - stats.totalRegistered} more players (minimum 9)`);
    }

    if (stats.totalGoalkeepers === 0) {
      warnings.push("No goalkeeper");
    }

    if (!team.leadership.captain) {
      warnings.push("No captain");
    }

    return { errors, warnings };
  };

  const readiness = getReadinessStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#06054e]"></div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6">
          <p className="text-red-800 font-bold">
            Error: {error || "Team not found"}
          </p>
          <Link
            href={`/clubs/${clubId}/teams`}
            className="inline-flex items-center gap-2 mt-4 text-red-700 font-bold hover:text-red-900"
          >
            <ArrowLeft size={20} />
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  // Show roster manager if active
  if (showRosterManager) {
    return (
      <RosterManager
        clubId={clubId}
        teamId={teamId}
        team={team}
        onClose={() => {
          setShowRosterManager(false);
          fetchTeam();
        }}
      />
    );
  }

  // Separate registered players and assigned staff
  const registeredPlayers = team.roster.filter(
    (r) => r.registrationType === "registered"
  );
  const assignedStaff = team.roster.filter(
    (r) => r.registrationType === "assigned"
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/clubs/${clubId}/teams`}
          className="inline-flex items-center gap-2 text-slate-600 font-bold hover:text-[#06054e] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Teams
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#06054e]">{team.name}</h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              {team.division.name} • {team.season}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowRosterManager(true)}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:bg-yellow-500 transition-all"
            >
              <Users size={20} />
              Manage Roster
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 transition-all"
            >
              <Trash2 size={20} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Readiness Alerts */}
      {readiness &&
        (readiness.errors.length > 0 || readiness.warnings.length > 0) && (
          <div className="space-y-3 mb-6">
            {readiness.errors.map((error, idx) => (
              <div
                key={idx}
                className="bg-red-50 border-4 border-red-500 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle
                    size={24}
                    className="text-red-600 flex-shrink-0"
                  />
                  <p className="text-red-800 font-bold">{error}</p>
                </div>
              </div>
            ))}
            {readiness.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle
                    size={24}
                    className="text-yellow-600 flex-shrink-0"
                  />
                  <p className="text-yellow-800 font-bold">{warning}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Team Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Statistics Card */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-xl font-black text-[#06054e] mb-4 flex items-center gap-2">
            <Users size={24} />
            Roster Statistics
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">
                Registered Players
              </span>
              <span className="text-2xl font-black text-[#06054e]">
                {team.statistics.totalRegistered}/18
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#06054e] to-yellow-400 h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (team.statistics.totalRegistered / 18) * 100,
                    100
                  )}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <div className="text-sm font-bold text-slate-500">
                  Goalkeepers
                </div>
                <div className="text-2xl font-black text-[#06054e]">
                  {team.statistics.totalGoalkeepers}/2
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-500">Staff</div>
                <div className="text-2xl font-black text-[#06054e]">
                  {team.statistics.totalAssigned}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-500">Active</div>
                <div className="text-2xl font-black text-green-600">
                  {team.statistics.activeMembers}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-500">Injured</div>
                <div className="text-2xl font-black text-red-600">
                  {team.statistics.injuredMembers}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Competition Info */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-xl font-black text-[#06054e] mb-4 flex items-center gap-2">
            <Trophy size={24} />
            Competition
          </h2>

          <div className="space-y-4">
            {team.competition && (
              <div>
                <div className="text-sm font-bold text-slate-500">
                  Competition
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {team.competition}
                </div>
              </div>
            )}

            {team.grade && (
              <div>
                <div className="text-sm font-bold text-slate-500">Grade</div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {team.grade}
                </div>
              </div>
            )}

            {team.homeGround && (
              <div>
                <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <MapPin size={14} />
                  Home Ground
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {team.homeGround}
                </div>
              </div>
            )}

            {team.trainingVenue && (
              <div>
                <div className="text-sm font-bold text-slate-500">
                  Training Venue
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {team.trainingVenue}
                </div>
              </div>
            )}

            {team.trainingTimes && (
              <div>
                <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Calendar size={14} />
                  Training Times
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {team.trainingTimes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leadership */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-xl font-black text-[#06054e] mb-4 flex items-center gap-2">
            <Crown size={24} />
            Leadership
          </h2>

          <div className="space-y-4">
            {team.leadership.captain ? (
              <div>
                <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Crown size={14} className="text-yellow-600" />
                  Captain
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {team.roster.find(
                    (r) => r.memberId === team.leadership.captain
                  )?.memberDetails?.displayName || team.leadership.captain}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">No captain assigned</div>
            )}

            {team.leadership.viceCaptains.length > 0 && (
              <div>
                <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Star size={14} className="text-blue-600" />
                  Vice Captains
                </div>
                <div className="space-y-1 mt-1">
                  {team.leadership.viceCaptains.map((vcId) => {
                    const vc = team.roster.find((r) => r.memberId === vcId);
                    return (
                      <div
                        key={vcId}
                        className="text-lg font-bold text-slate-800"
                      >
                        {vc?.memberDetails?.displayName || vcId}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!team.leadership.captain &&
              team.leadership.viceCaptains.length === 0 && (
                <button
                  onClick={() => setShowRosterManager(true)}
                  className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Assign Leadership
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Registered Players */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-[#06054e] flex items-center gap-2">
            <Shield size={24} />
            Registered Players ({registeredPlayers.length}/18)
          </h2>
          <button
            onClick={() => setShowRosterManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-[#06054e] rounded-xl font-bold hover:bg-yellow-500 transition-all"
          >
            <UserPlus size={18} />
            Add Player
          </button>
        </div>

        {registeredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Shield size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold mb-4">
              No players registered yet
            </p>
            <button
              onClick={() => setShowRosterManager(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              <UserPlus size={20} />
              Add First Player
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {registeredPlayers.map((player) => (
              <div
                key={player.memberId}
                className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 hover:border-yellow-400 transition-all"
              >
                <div className="flex items-start gap-3">
                  {player.memberDetails?.photoUrl ? (
                    <img
                      src={player.memberDetails.photoUrl}
                      alt={player.memberDetails.displayName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                      <Users size={24} className="text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {player.jerseyNumber && (
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#06054e] text-white flex items-center justify-center text-sm font-black">
                          {player.jerseyNumber}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 truncate">
                          {player.memberDetails?.displayName || player.memberId}
                        </h3>
                        {player.position && (
                          <p className="text-xs font-bold text-slate-500">
                            {player.position}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {player.memberId === team.leadership.captain && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">
                          <Crown size={10} />C
                        </span>
                      )}
                      {team.leadership.viceCaptains.includes(
                        player.memberId
                      ) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                          <Star size={10} />
                          VC
                        </span>
                      )}
                      {player.roleId === "role-goalkeeper" && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                          GK
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          player.status === "active"
                            ? "bg-green-100 text-green-700"
                            : player.status === "injured"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {player.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Staff */}
      {assignedStaff.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
            <Settings size={24} />
            Staff & Officials ({assignedStaff.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assignedStaff.map((staff) => (
              <div
                key={staff.memberId}
                className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200"
              >
                <div className="flex items-start gap-3">
                  {staff.memberDetails?.photoUrl ? (
                    <img
                      src={staff.memberDetails.photoUrl}
                      alt={staff.memberDetails.displayName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                      <Users size={24} className="text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 truncate">
                      {staff.memberDetails?.displayName || staff.memberId}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {staff.roleId.replace("role-", "").replace(/-/g, " ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
