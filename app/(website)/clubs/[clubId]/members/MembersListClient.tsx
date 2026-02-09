// app/(website)/clubs/[clubId]/members/MembersList.tsx
// Updated to use config system for roles

"use client";

import { useState, useEffect } from "react";
import {
  User,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import Link from "next/link";

interface ConfigItem {
  _id?: string;
  configType: string;
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  category?: string;
  icon?: string;
  color?: string;
  [key: string]: any;
}

interface Member {
  memberId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    displayName?: string;
    photoUrl?: string;
    dateOfBirth: string;
  };
  contact: {
    primaryEmail: string;
    mobile?: string;
  };
  roles: string[];
  membership: {
    status: string;
    membershipType: string;
  };
}

interface MembersListProps {
  clubId: string;
}

type SortField = "name" | "memberId" | "membershipType" | "status";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const MEMBERS_PER_PAGE = 15;

// Role category colors
const ROLE_CATEGORY_COLORS: Record<string, string> = {
  Playing: "bg-blue-100 text-blue-700",
  Coaching: "bg-purple-100 text-purple-700",
  Administration: "bg-green-100 text-green-700",
  Official: "bg-orange-100 text-orange-700",
  Support: "bg-pink-100 text-pink-700",
  Volunteer: "bg-pink-100 text-pink-700",
  Other: "bg-slate-100 text-slate-700",
  Participant: "bg-yellow-100 text-yellow-700",
  Administrator: "bg-green-100 text-green-700",
};

// Get config display name from ID
function getConfigDisplayName(
  configId: string,
  configType: string,
  configItems: ConfigItem[],
): string {
  if (!configId) return "";

  // Handle prefixed IDs - strip common prefixes
  let lookupId = configId;
  const prefixes = ["provider-", "mtype-", "sal-", "gender-", "role-"];
  for (const prefix of prefixes) {
    if (configId.startsWith(prefix)) {
      lookupId = configId.substring(prefix.length);
      break;
    }
  }

  // Try to find config with the processed ID
  let config = configItems.find(
    (c) => c.configType === configType && c.id === lookupId,
  );

  // If not found with stripped prefix, try with original ID
  if (!config) {
    config = configItems.find(
      (c) => c.configType === configType && c.id === configId,
    );
  }

  return config?.name || configId;
}

// Get config color from ID and category
function getConfigColor(
  configId: string,
  configType: string,
  configItems: ConfigItem[],
): string {
  if (!configId) return "bg-slate-100 text-slate-700";

  // Handle prefixed IDs - strip common prefixes
  let lookupId = configId;
  const prefixes = ["provider-", "mtype-", "sal-", "gender-", "role-"];
  for (const prefix of prefixes) {
    if (configId.startsWith(prefix)) {
      lookupId = configId.substring(prefix.length);
      break;
    }
  }

  // Try to find config with the processed ID
  let config = configItems.find(
    (c) => c.configType === configType && c.id === lookupId,
  );

  // If not found with stripped prefix, try with original ID
  if (!config) {
    config = configItems.find(
      (c) => c.configType === configType && c.id === configId,
    );
  }

  // Fallback to category-based colors for role
  if (configType === "role" && config?.category) {
    return ROLE_CATEGORY_COLORS[config.category] || ROLE_CATEGORY_COLORS.Other;
  }

  return "bg-slate-100 text-slate-700";
}

export default function MembersList({ clubId }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [configItems, setConfigItems] = useState<ConfigItem[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { field: "name", direction: "asc" },
  ]);

  // Multi-level sort
  const sortMembers = (membersToSort: Member[]): Member[] => {
    return [...membersToSort].sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.field) {
          case "name":
            aValue =
              `${a.personalInfo.lastName} ${a.personalInfo.firstName}`.toLowerCase();
            bValue =
              `${b.personalInfo.lastName} ${b.personalInfo.firstName}`.toLowerCase();
            break;
          case "memberId":
            aValue = a.memberId.toLowerCase();
            bValue = b.memberId.toLowerCase();
            break;
          case "membershipType":
            aValue = (a.membership.membershipType || "").toLowerCase();
            bValue = (b.membership.membershipType || "").toLowerCase();
            break;
          case "status":
            aValue = (a.membership.status || "").toLowerCase();
            bValue = (b.membership.status || "").toLowerCase();
            break;
          default:
            continue;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
      }
      return 0;
    });
  };

  // Calculate pagination
  const sortedMembers = sortMembers(filteredMembers);
  const totalPages = Math.ceil(sortedMembers.length / MEMBERS_PER_PAGE);
  const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
  const endIndex = startIndex + MEMBERS_PER_PAGE;
  const currentMembers = sortedMembers.slice(startIndex, endIndex);

  useEffect(() => {
    fetchData();
  }, [clubId]);

  // Filter members with role search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter((member) => {
      const firstName = member.personalInfo.firstName?.toLowerCase() || "";
      const lastName = member.personalInfo.lastName?.toLowerCase() || "";
      const displayName = member.personalInfo.displayName?.toLowerCase() || "";
      const email = member.contact.primaryEmail?.toLowerCase() || "";
      const memberId = member.memberId?.toLowerCase() || "";
      const membershipType =
        member.membership.membershipType?.toLowerCase() || "";

      // Search in role names from config
      const memberRoleNames = member.roles
        .map((roleId) =>
          getConfigDisplayName(roleId, "role", configItems).toLowerCase(),
        )
        .join(" ");

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        displayName.includes(query) ||
        email.includes(query) ||
        memberId.includes(query) ||
        membershipType.includes(query) ||
        memberRoleNames.includes(query)
      );
    });

    setFilteredMembers(filtered);
    setCurrentPage(1);
  }, [searchQuery, members, configItems]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch members
      const membersRes = await fetch(`/api/clubs/${clubId}/members`);
      if (!membersRes.ok) throw new Error("Failed to fetch members");
      const membersData = await membersRes.json();

      setMembers(membersData);
      setFilteredMembers(membersData);

      // Try to fetch config items (optional - gracefully handle if not available)
      try {
        const configRes = await fetch(`/api/admin/config?activeOnly=true`);
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfigItems(configData);
        } else {
          console.warn("Config API not available, will display raw values");
          setConfigItems([]);
        }
      } catch (configError) {
        console.warn(
          "Config API not available, will display raw values",
          configError,
        );
        setConfigItems([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Are you sure you want to delete this member?")) {
      return;
    }

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete member");

      setMembers(members.filter((m) => m.memberId !== memberId));
      alert("Member deleted successfully");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const clearSearch = () => setSearchQuery("");

  // Multi-sort handlers
  const addSort = (field: SortField) => {
    setSortConfigs((current) => {
      const existingIndex = current.findIndex((s) => s.field === field);

      if (existingIndex === -1) {
        return [...current, { field, direction: "asc" }];
      } else if (current[existingIndex].direction === "asc") {
        const newConfigs = [...current];
        newConfigs[existingIndex] = { field, direction: "desc" };
        return newConfigs;
      } else {
        return current.filter((_, i) => i !== existingIndex);
      }
    });
    setCurrentPage(1);
  };

  const removeSort = (field: SortField) => {
    setSortConfigs((current) => current.filter((s) => s.field !== field));
  };

  const getSortConfig = (field: SortField) => {
    return sortConfigs.find((s) => s.field === field);
  };

  const getSortLabel = (field: SortField): string => {
    switch (field) {
      case "name":
        return "Name";
      case "memberId":
        return "ID";
      case "membershipType":
        return "Type";
      case "status":
        return "Status";
    }
  };

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  const goToPage = (page: number) => setCurrentPage(page);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }

    return pages;
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
      {/* Compact Search Bar with Sort Beside It */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        {/* Top Row: Search and Sort Side by Side */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          {/* Search Bar - Limited Width */}
          <div className="w-full lg:w-80">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sort Buttons - Beside Search */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-600 whitespace-nowrap">
              Sort:
            </span>
            {(
              ["name", "memberId", "membershipType", "status"] as SortField[]
            ).map((field) => {
              const config = getSortConfig(field);
              const isActive = !!config;
              const sortIndex = sortConfigs.findIndex((s) => s.field === field);

              return (
                <button
                  key={field}
                  onClick={() => addSort(field)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs ${
                    isActive
                      ? "bg-[#06054e] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isActive && sortIndex >= 0 && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white text-[#06054e] text-[10px] font-black">
                      {sortIndex + 1}
                    </span>
                  )}
                  {getSortLabel(field)}
                  {config && (
                    <span className="text-[10px]">
                      {config.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add Member Button */}
          <Link
            href={`/clubs/${clubId}/members/new`}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-[#06054e] text-white rounded-xl font-black text-sm hover:bg-yellow-400 hover:text-[#06054e] transition-all whitespace-nowrap lg:ml-auto"
          >
            <Plus size={18} />
            Add Member
          </Link>
        </div>

        {/* Second Row: Active Sorts Pills (if multi-sort) */}
        {sortConfigs.length > 1 && (
          <div className="flex flex-wrap gap-1.5 items-center mt-3 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Active:
            </span>
            {sortConfigs.map((config, index) => (
              <div
                key={config.field}
                className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[11px] font-bold"
              >
                <span>{index + 1}.</span>
                <span>{getSortLabel(config.field)}</span>
                <span>{config.direction === "asc" ? "↑" : "↓"}</span>
                <button
                  onClick={() => removeSort(config.field)}
                  className="ml-0.5 hover:text-yellow-900"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs font-bold text-slate-600">
          <span>Total: {members.length}</span>
          {searchQuery && filteredMembers.length !== members.length && (
            <span className="text-yellow-600">
              • Showing: {filteredMembers.length}
            </span>
          )}
          {totalPages > 1 && (
            <span className="text-slate-500">
              • Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-12 text-center">
          <User size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-600 mb-2">
            {searchQuery ? "No members found" : "No members yet"}
          </h3>
          <p className="text-slate-500 font-bold mb-6">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Get started by adding your first member"}
          </p>
          {searchQuery ? (
            <button
              onClick={clearSearch}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Clear Search
            </button>
          ) : (
            <Link
              href={`/clubs/${clubId}/members/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              <Plus size={20} />
              Add First Member
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMembers.map((member) => (
              <div
                key={member.memberId}
                className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 hover:shadow-2xl transition-all"
              >
                {/* Member Photo & Name */}
                <div className="flex items-start gap-4 mb-4">
                  {member.personalInfo.photoUrl ? (
                    <img
                      src={member.personalInfo.photoUrl}
                      alt={
                        member.personalInfo.displayName ||
                        `${member.personalInfo.firstName} ${member.personalInfo.lastName}`
                      }
                      className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                      <User size={32} className="text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-[#06054e] truncate">
                      {member.personalInfo.displayName ||
                        `${member.personalInfo.firstName} ${member.personalInfo.lastName}`}
                    </h3>
                    <p className="text-sm font-bold text-slate-500">
                      {member.memberId}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span
                        className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${
                          member.membership.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {member.membership.status}
                      </span>
                      {member.membership.membershipType && (
                        <span className="inline-block px-2 py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-700">
                          {getConfigDisplayName(
                            member.membership.membershipType,
                            "membershipType",
                            configItems,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {member.contact.primaryEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail
                        size={16}
                        className="text-slate-400 flex-shrink-0"
                      />
                      <span className="font-bold text-slate-600 truncate">
                        {member.contact.primaryEmail}
                      </span>
                    </div>
                  )}
                  {member.contact.mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone
                        size={16}
                        className="text-slate-400 flex-shrink-0"
                      />
                      <span className="font-bold text-slate-600">
                        {member.contact.mobile}
                      </span>
                    </div>
                  )}
                </div>

                {/* Roles - Display names with category colors from config */}
                {member.roles && member.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {member.roles.slice(0, 3).map((roleId, idx) => {
                      const displayName = getConfigDisplayName(
                        roleId,
                        "role",
                        configItems,
                      );
                      const colorClass = getConfigColor(
                        roleId,
                        "role",
                        configItems,
                      );

                      return (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${colorClass}`}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                    {member.roles.length > 3 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        +{member.roles.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Link
                    href={`/clubs/${clubId}/members/${member.memberId}`}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-center text-sm"
                  >
                    View
                  </Link>
                  <Link
                    href={`/clubs/${clubId}/members/${member.memberId}/edit`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-[#06054e] rounded-xl font-bold hover:bg-yellow-500 transition-all text-sm"
                  >
                    <Edit size={16} />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(member.memberId)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all text-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-bold text-slate-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, sortedMembers.length)} of{" "}
                  {sortedMembers.length} members
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-xl font-bold transition-all ${
                      currentPage === 1
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <ChevronsLeft size={20} />
                  </button>

                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-xl font-bold transition-all ${
                      currentPage === 1
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-2">
                    {getPageNumbers().map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          typeof page === "number" && goToPage(page)
                        }
                        disabled={page === "..."}
                        className={`min-w-[40px] h-10 rounded-xl font-black transition-all ${
                          page === currentPage
                            ? "bg-[#06054e] text-white"
                            : page === "..."
                              ? "bg-transparent text-slate-400 cursor-default"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-xl font-bold transition-all ${
                      currentPage === totalPages
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>

                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-xl font-bold transition-all ${
                      currentPage === totalPages
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <ChevronsRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
