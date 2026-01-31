// app/(website)/clubs/[clubId]/teams/[teamId]/RosterManager.tsx
// Drag-and-drop roster management interface

"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  UserPlus,
  UserMinus,
  Crown,
  Star,
  AlertCircle,
  Check,
  Shield,
  Settings,
  Save,
} from "lucide-react";

interface Member {
  memberId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    displayName: string;
    photoUrl?: string;
    dateOfBirth: string;
  };
  contact: {
    primaryEmail: string;
  };
  roles: string[];
  membership: {
    status: string;
  };
  teamRegistrations?: Array<{
    teamId: string;
    ageCategory: string;
    status: string;
    registrationType: string;
  }>;
}

interface Role {
  id: string;
  name: string;
  category: string;
}

interface RosterMember {
  memberId: string;
  roleId: string;
  roleCategory: string;
  registrationType: string;
  position?: string;
  jerseyNumber?: number;
  status: string;
  memberDetails?: {
    firstName: string;
    lastName: string;
    displayName: string;
    photoUrl?: string;
  };
}

interface Team {
  teamId: string;
  name: string;
  ageCategory: string;
  division: {
    level: number;
  };
  roster: RosterMember[];
  leadership: {
    captain?: string;
    viceCaptains: string[];
  };
  statistics: {
    totalRegistered: number;
    totalGoalkeepers: number;
  };
}

interface RosterManagerProps {
  clubId: string;
  teamId: string;
  team: Team;
  onClose: () => void;
}

const ROLE_CATEGORY_COLORS = {
  Participant: "bg-blue-100 text-blue-700",
  Playing: "bg-blue-100 text-blue-700",
  Official: "bg-orange-100 text-orange-700",
  Coaching: "bg-purple-100 text-purple-700",
};

export default function RosterManager({
  clubId,
  teamId,
  team,
  onClose,
}: RosterManagerProps) {
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Leadership state
  const [captain, setCaptain] = useState<string | undefined>(
    team.leadership.captain
  );
  const [viceCaptains, setViceCaptains] = useState<string[]>(
    team.leadership.viceCaptains
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        fetch(`/api/clubs/${clubId}/members`),
        fetch(`/api/admin/club-roles?activeOnly=true`),
      ]);

      if (!membersRes.ok) throw new Error("Failed to fetch members");
      if (!rolesRes.ok) throw new Error("Failed to fetch roles");

      const [membersData, rolesData] = await Promise.all([
        membersRes.json(),
        rolesRes.json(),
      ]);

      setAllMembers(membersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter eligible members (not already in roster)
  const rosterMemberIds = team.roster.map((r) => r.memberId);
  const eligibleMembers = allMembers.filter((member) => {
    // Not already in roster
    if (rosterMemberIds.includes(member.memberId)) return false;

    // Must be active
    if (member.membership.status !== "Active") return false;

    // Must have eligible roles
    const hasEligibleRole = member.roles.some((roleId) => {
      const role = roles.find((r) => r.id === roleId);
      return (
        role &&
        (role.category === "Participant" ||
          role.category === "Playing" ||
          role.category === "Official" ||
          role.category === "Coaching")
      );
    });

    return hasEligibleRole;
  });

  // Apply search and filter
  const filteredEligible = eligibleMembers.filter((member) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      member.personalInfo.firstName.toLowerCase().includes(query) ||
      member.personalInfo.lastName.toLowerCase().includes(query) ||
      member.personalInfo.displayName?.toLowerCase().includes(query) ||
      member.memberId.toLowerCase().includes(query);

    if (filterRole === "all") return matchesSearch;

    return matchesSearch && member.roles.includes(filterRole);
  });

  const handleAddMember = async (member: Member) => {
    setError("");
    setSuccess("");

    // Determine primary role
    const eligibleRoles = member.roles.filter((roleId) => {
      const role = roles.find((r) => r.id === roleId);
      return (
        role &&
        (role.category === "Participant" ||
          role.category === "Playing" ||
          role.category === "Official" ||
          role.category === "Coaching")
      );
    });

    if (eligibleRoles.length === 0) {
      setError("Member has no eligible roles for teams");
      return;
    }

    const primaryRoleId = eligibleRoles[0];
    const primaryRole = roles.find((r) => r.id === primaryRoleId);

    if (!primaryRole) {
      setError("Role not found");
      return;
    }

    // Determine registration type
    const registrationType =
      primaryRole.category === "Participant" ||
      primaryRole.category === "Playing"
        ? "registered"
        : "assigned";

    try {
      const res = await fetch(`/api/clubs/${clubId}/teams/${teamId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.memberId,
          roleId: primaryRoleId,
          registrationType,
          status: "active",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }

      setSuccess(`${member.personalInfo.displayName} added to roster`);

      // Refresh by closing and reopening
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    // Check if captain or VC
    if (captain === memberId) {
      setError("Cannot remove captain. Please reassign captain first.");
      return;
    }

    if (viceCaptains.includes(memberId)) {
      setError(
        "Cannot remove vice captain. Please remove from leadership first."
      );
      return;
    }

    if (!confirm("Remove this member from the roster?")) return;

    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/clubs/${clubId}/teams/${teamId}/roster/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setSuccess("Member removed from roster");

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveLeadership = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/clubs/${clubId}/teams/${teamId}/leadership`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            captain,
            viceCaptains,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update leadership");
      }

      setSuccess("Leadership updated successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCaptain = (memberId: string) => {
    setCaptain(captain === memberId ? undefined : memberId);
  };

  const toggleViceCaptain = (memberId: string) => {
    if (viceCaptains.includes(memberId)) {
      setViceCaptains(viceCaptains.filter((id) => id !== memberId));
    } else {
      if (viceCaptains.length >= 2) {
        setError("Maximum 2 vice captains allowed");
        return;
      }
      setViceCaptains([...viceCaptains, memberId]);
    }
  };

  // Separate registered and assigned
  const registeredPlayers = team.roster.filter(
    (r) => r.registrationType === "registered"
  );
  const assignedStaff = team.roster.filter(
    (r) => r.registrationType === "assigned"
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-t-[2rem] shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-[#06054e]">
                  Roster Manager
                </h2>
                <p className="text-lg font-bold text-slate-600 mt-1">
                  {team.name}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Status messages */}
            {error && (
              <div className="mt-4 bg-red-50 border-2 border-red-500 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-600" />
                  <p className="text-red-800 font-bold">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-50 border-2 border-green-500 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Check size={20} className="text-green-600" />
                  <p className="text-green-800 font-bold">{success}</p>
                </div>
              </div>
            )}

            {/* Team limits summary */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Registered Players
                  </div>
                  <div
                    className={`text-2xl font-black ${
                      team.statistics.totalRegistered > 18
                        ? "text-red-600"
                        : team.statistics.totalRegistered >= 9
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {team.statistics.totalRegistered}/18
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Goalkeepers
                  </div>
                  <div
                    className={`text-2xl font-black ${
                      team.statistics.totalGoalkeepers > 2
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {team.statistics.totalGoalkeepers}/2
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500">Staff</div>
                  <div className="text-2xl font-black text-blue-600">
                    {assignedStaff.length}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Leadership
                  </div>
                  <div className="text-2xl font-black text-purple-600">
                    {captain ? 1 : 0}C + {viceCaptains.length}VC
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow-xl border-x border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Available Members */}
              <div className="p-6">
                <h3 className="text-xl font-black text-[#06054e] mb-4 flex items-center gap-2">
                  <UserPlus size={24} />
                  Available Members
                </h3>

                {/* Search and Filter */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search members..."
                      className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    />
                  </div>

                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  >
                    <option value="all">All Roles</option>
                    {roles
                      .filter((r) =>
                        [
                          "Participant",
                          "Playing",
                          "Official",
                          "Coaching",
                        ].includes(r.category)
                      )
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Members List */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06054e] mx-auto"></div>
                    </div>
                  ) : filteredEligible.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 font-bold">
                      No available members
                    </div>
                  ) : (
                    filteredEligible.map((member) => (
                      <div
                        key={member.memberId}
                        className="bg-slate-50 rounded-xl p-3 border-2 border-slate-200 hover:border-yellow-400 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {member.personalInfo.photoUrl ? (
                            <img
                              src={member.personalInfo.photoUrl}
                              alt={member.personalInfo.displayName}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                              <Users size={20} className="text-slate-400" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-slate-800 text-sm truncate">
                              {member.personalInfo.displayName}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.roles.slice(0, 2).map((roleId) => {
                                const role = roles.find((r) => r.id === roleId);
                                if (!role) return null;
                                const colorClass =
                                  ROLE_CATEGORY_COLORS[
                                    role.category as keyof typeof ROLE_CATEGORY_COLORS
                                  ] || "bg-slate-100 text-slate-600";
                                return (
                                  <span
                                    key={roleId}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colorClass}`}
                                  >
                                    {role.name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddMember(member)}
                            className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <UserPlus size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Current Roster */}
              <div className="p-6">
                <h3 className="text-xl font-black text-[#06054e] mb-4 flex items-center gap-2">
                  <Shield size={24} />
                  Current Roster ({team.roster.length})
                </h3>

                {/* Players */}
                {registeredPlayers.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-black text-slate-600 mb-3">
                      REGISTERED PLAYERS ({registeredPlayers.length}/18)
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {registeredPlayers.map((player) => (
                        <div
                          key={player.memberId}
                          className="bg-slate-50 rounded-xl p-3 border-2 border-slate-200 hover:border-red-400 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            {player.memberDetails?.photoUrl ? (
                              <img
                                src={player.memberDetails.photoUrl}
                                alt={player.memberDetails.displayName}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                <Users size={20} className="text-slate-400" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-slate-800 text-sm truncate">
                                {player.memberDetails?.displayName ||
                                  player.memberId}
                              </h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {player.jerseyNumber && (
                                  <span className="px-1.5 py-0.5 bg-[#06054e] text-white rounded text-[10px] font-bold">
                                    #{player.jerseyNumber}
                                  </span>
                                )}
                                {player.position && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                                    {player.position}
                                  </span>
                                )}
                                {player.roleId === "role-goalkeeper" && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
                                    GK
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleCaptain(player.memberId)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  captain === player.memberId
                                    ? "bg-yellow-400 text-[#06054e]"
                                    : "bg-slate-200 text-slate-400 hover:bg-yellow-100"
                                }`}
                                title="Captain"
                              >
                                <Crown size={16} />
                              </button>

                              <button
                                onClick={() =>
                                  toggleViceCaptain(player.memberId)
                                }
                                className={`p-1.5 rounded-lg transition-all ${
                                  viceCaptains.includes(player.memberId)
                                    ? "bg-blue-400 text-white"
                                    : "bg-slate-200 text-slate-400 hover:bg-blue-100"
                                }`}
                                title="Vice Captain"
                              >
                                <Star size={16} />
                              </button>

                              <button
                                onClick={() =>
                                  handleRemoveMember(player.memberId)
                                }
                                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <UserMinus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff */}
                {assignedStaff.length > 0 && (
                  <div>
                    <h4 className="text-sm font-black text-slate-600 mb-3">
                      STAFF & OFFICIALS ({assignedStaff.length})
                    </h4>
                    <div className="space-y-2">
                      {assignedStaff.map((staff) => (
                        <div
                          key={staff.memberId}
                          className="bg-slate-50 rounded-xl p-3 border-2 border-slate-200 hover:border-red-400 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            {staff.memberDetails?.photoUrl ? (
                              <img
                                src={staff.memberDetails.photoUrl}
                                alt={staff.memberDetails.displayName}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                                <Settings
                                  size={20}
                                  className="text-slate-400"
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-slate-800 text-sm truncate">
                                {staff.memberDetails?.displayName ||
                                  staff.memberId}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-500">
                                {staff.roleId
                                  .replace("role-", "")
                                  .replace(/-/g, " ")}
                              </p>
                            </div>

                            <button
                              onClick={() => handleRemoveMember(staff.memberId)}
                              className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <UserMinus size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {team.roster.length === 0 && (
                  <div className="text-center py-12 text-slate-500 font-bold">
                    No members in roster yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white rounded-b-[2rem] shadow-xl border border-slate-100 p-6">
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Close
              </button>

              <button
                onClick={handleSaveLeadership}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Leadership
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
