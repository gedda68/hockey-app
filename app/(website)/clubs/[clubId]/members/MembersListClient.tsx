// app/clubs/[clubId]/members/MembersListClient.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Edit, Eye, Trash2, Mail, Phone } from "lucide-react";

interface Member {
  memberId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    displayName: string;
    gender: string;
  };
  contact: {
    primaryEmail: string;
    mobile: string;
  };
  membership: {
    membershipType: string;
    status: string;
  };
  roles: string[];
}

export default function MembersListClient({ clubId }: { clubId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchMembers();
  }, [clubId]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error("Error fetching members:", error);
      alert("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete member");

      alert("Member deleted successfully");
      fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member");
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.personalInfo.displayName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      member.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.contact.primaryEmail
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || member.membership.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
        <p className="mt-4 text-slate-600 font-bold">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, email, or member ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-slate-600 font-bold">
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-gradient-to-r from-[#06054e] to-[#090836]">
                  <th className="text-left py-4 px-6 text-xs font-black text-white uppercase">
                    Member ID
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-black text-white uppercase">
                    Name
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-black text-white uppercase">
                    Contact
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-black text-white uppercase">
                    Roles
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-black text-white uppercase">
                    Status
                  </th>
                  <th className="text-right py-4 px-6 text-xs font-black text-white uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, index) => (
                  <tr
                    key={member.memberId}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm font-bold text-slate-600">
                        {member.memberId}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-slate-900">
                          {member.personalInfo.displayName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {member.personalInfo.gender}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {member.contact.primaryEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-slate-400" />
                            <span className="text-slate-600">
                              {member.contact.primaryEmail}
                            </span>
                          </div>
                        )}
                        {member.contact.mobile && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone size={14} className="text-slate-400" />
                            <span className="text-slate-600">
                              {member.contact.mobile}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.slice(0, 2).map((role) => (
                          <span
                            key={role}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full"
                          >
                            {role.replace("role-", "")}
                          </span>
                        ))}
                        {member.roles.length > 2 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            +{member.roles.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                          member.membership.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : member.membership.status === "Inactive"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {member.membership.status}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clubs/${clubId}/members/${member.memberId}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/clubs/${clubId}/members/${member.memberId}/edit`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(
                              member.memberId,
                              member.personalInfo.displayName
                            )
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-slate-600 font-bold">No members found</p>
            <p className="text-sm text-slate-500 mt-2">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first member"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
