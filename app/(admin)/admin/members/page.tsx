// app/(admin)/admin/members/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Users, Search, Plus, Edit, Trash2, Eye, Loader2, X,
  ChevronDown, ChevronUp, Download, Upload,
} from "lucide-react";
import Link from "next/link";

interface Member {
  memberId: string;
  personalInfo: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  contact: {
    primaryEmail?: string;
    primaryPhone?: string;
  };
  membership: {
    status?: string;
    membershipType?: string;
    clubId?: string;
    clubName?: string;
    joinDate?: string;
  };
  roles: string[];
}

const STATUS_COLORS: Record<string, string> = {
  Active:    "bg-green-100 text-green-700 border-green-200",
  Life:      "bg-blue-100 text-blue-700 border-blue-200",
  Inactive:  "bg-slate-100 text-slate-600 border-slate-200",
  Suspended: "bg-red-100 text-red-700 border-red-200",
};

const ROLE_LABELS: Record<string, string> = {
  "player":        "Player",
  "role-player":   "Player",
  "coach":         "Coach",
  "umpire":        "Umpire",
  "technical-official": "Tech Official",
  "club-admin":    "Club Admin",
  "registrar":     "Registrar",
  "volunteer":     "Volunteer",
  "manager":       "Manager",
  "member":        "Member",
};

function primaryRole(roles: string[]): string {
  for (const r of ["club-admin","association-admin","registrar","coach","umpire","technical-official","manager","player","role-player","volunteer","member"]) {
    if (roles.includes(r)) return ROLE_LABELS[r] ?? r;
  }
  return roles[0] ?? "Member";
}

export default function MembersPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [members, setMembers]   = useState<Member[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("Active");
  const [roleFilter, setRole]   = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [sortField, setSortField] = useState("lastName");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("asc");
  const [deleting, setDeleting] = useState<string | null>(null);
  const PER_PAGE = 50;

  const isReadonly = !["super-admin","association-admin","club-admin","registrar","assoc-registrar"].includes(user?.role ?? "");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit:  String(PER_PAGE),
        offset: String((page - 1) * PER_PAGE),
        sort:   sortField,
        dir:    sortDir,
      });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (roleFilter)   params.set("role",   roleFilter);

      // Scope to club if user is club-level
      const CLUB_ROLES = ["club-admin","club-committee","registrar","coach","manager","team-selector"];
      if (CLUB_ROLES.includes(user?.role ?? "") && user?.clubId) {
        params.set("clubId", user.clubId);
      } else if (user?.associationId && !["super-admin"].includes(user?.role ?? "")) {
        params.set("associationId", user.associationId);
      }

      const res  = await fetch(`/api/admin/members?${params}`);
      const data = await res.json();
      setMembers(data.members  ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, page, sortField, sortDir, user]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(1); }, [search, statusFilter, roleFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Deactivate this member? Their record will be retained.")) return;
    setDeleting(memberId);
    try {
      await fetch(`/api/admin/players/${memberId}`, { method: "DELETE" });
      fetchMembers();
    } finally {
      setDeleting(null);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Member ID","First Name","Last Name","DOB","Gender","Email","Phone","Status","Type","Role","Club","Joined"],
      ...members.map(m => [
        m.memberId,
        m.personalInfo.firstName ?? "",
        m.personalInfo.lastName  ?? "",
        m.personalInfo.dateOfBirth ?? "",
        m.personalInfo.gender ?? "",
        m.contact.primaryEmail ?? "",
        m.contact.primaryPhone ?? "",
        m.membership.status ?? "",
        m.membership.membershipType ?? "",
        primaryRole(m.roles),
        m.membership.clubName ?? "",
        m.membership.joinDate ?? "",
      ])
    ];
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `members-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field
      ? sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : null;

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-350 mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
                <Users size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#06054e]">Members</h1>
                <p className="text-slate-500 font-bold text-sm">
                  {total.toLocaleString()} member{total !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                <Download size={16} />
                Export CSV
              </button>

              {!isReadonly && (
                <>
                  <Link
                    href="/admin/bulk-import?tab=members"
                    className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    <Upload size={16} />
                    Bulk Import
                  </Link>
                  <Link
                    href="/admin/members/create"
                    className="flex items-center gap-2 px-5 py-2 bg-[#06054e] text-white rounded-xl font-bold text-sm hover:bg-yellow-400 hover:text-[#06054e] transition-all"
                  >
                    <Plus size={16} />
                    Add Member
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, email, member ID…"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-[#06054e] outline-none"
              />
              {search && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-[#06054e] outline-none"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Life">Life Member</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>

            {/* Role */}
            <select
              value={roleFilter}
              onChange={e => setRole(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-[#06054e] outline-none"
            >
              <option value="">All Roles</option>
              <option value="player">Players</option>
              <option value="coach">Coaches</option>
              <option value="umpire">Umpires</option>
              <option value="technical-official">Technical Officials</option>
              <option value="manager">Managers</option>
              <option value="volunteer">Volunteers</option>
              <option value="registrar">Registrars</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#06054e]" size={36} />
            </div>
          ) : members.length === 0 ? (
            <div className="py-20 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold">No members found</p>
              {(search || statusFilter || roleFilter) && (
                <button
                  onClick={() => { setSearch(""); setStatus("Active"); setRole(""); }}
                  className="mt-3 text-[#06054e] font-bold text-sm hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    {[
                      { label: "Name",       field: "lastName" },
                      { label: "Member ID",  field: "memberId" },
                      { label: "Email",      field: null },
                      { label: "Role",       field: null },
                      { label: "Status",     field: "status" },
                      { label: "Type",       field: null },
                      { label: "Club",       field: null },
                      { label: "Joined",     field: "joinDate" },
                      { label: "Actions",    field: null },
                    ].map(({ label, field }) => (
                      <th
                        key={label}
                        onClick={() => field && handleSort(field)}
                        className={`px-5 py-3 text-left text-xs font-black uppercase text-slate-500 whitespace-nowrap ${field ? "cursor-pointer hover:text-slate-800 select-none" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {field && <SortIcon field={field} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {members.map(m => {
                    const name  = `${m.personalInfo.firstName ?? ""} ${m.personalInfo.lastName ?? ""}`.trim() || m.memberId;
                    const status = m.membership.status ?? "Unknown";
                    return (
                      <tr key={m.memberId} className="hover:bg-slate-50 transition-colors">
                        {/* Name */}
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900 text-sm">{name}</div>
                          <div className="text-xs text-slate-400">{m.personalInfo.gender ?? ""}</div>
                        </td>

                        {/* Member ID */}
                        <td className="px-5 py-3">
                          <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {m.memberId}
                          </code>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {m.contact.primaryEmail ?? "—"}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3">
                          <span className="text-xs font-bold text-slate-700">
                            {primaryRole(m.roles)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${STATUS_COLORS[status] ?? STATUS_COLORS.Inactive}`}>
                            {status}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-3 text-xs text-slate-600 capitalize">
                          {m.membership.membershipType ?? "—"}
                        </td>

                        {/* Club */}
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {m.membership.clubName ?? "—"}
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {m.membership.joinDate
                            ? new Date(m.membership.joinDate).toLocaleDateString("en-AU", { day:"2-digit", month:"short", year:"numeric" })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/admin/players/${m.memberId}`}
                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye size={15} className="text-blue-600" />
                            </Link>
                            {!isReadonly && (
                              <>
                                <Link
                                  href={`/admin/players/${m.memberId}/edit`}
                                  className="p-1.5 hover:bg-yellow-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={15} className="text-yellow-600" />
                                </Link>
                                <button
                                  onClick={() => handleDelete(m.memberId)}
                                  disabled={deleting === m.memberId}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                  title="Deactivate"
                                >
                                  {deleting === m.memberId
                                    ? <Loader2 size={15} className="animate-spin text-red-500" />
                                    : <Trash2 size={15} className="text-red-500" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-bold">
                Page {page} of {totalPages} · {total.toLocaleString()} total
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
