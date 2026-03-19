// app/(admin)/admin/members/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Eye,
  Edit2,
  KeyRound,
  Loader2,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Member {
  memberId: string;
  clubId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
  };
  contact: {
    email: string;
    mobile?: string;
  };
  membership: {
    status: string;
    membershipTypes: string[];
  };
  roles: string[];
  createdAt: string;
}

interface BulkResult {
  processed: number;
  created: Array<{ memberId: string; memberName: string; username: string; tempPassword: string }>;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Bulk username generation
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDryRun, setBulkDryRun] = useState(true);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);

  const handleBulkGenerate = async (dryRun: boolean) => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/members/bulk-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      setBulkResult(data);
      if (!dryRun) {
        setBulkDryRun(false);
        toast.success(`${data.processed} member accounts created`);
      }
    } catch {
      toast.error("Failed to generate usernames");
    } finally {
      setBulkLoading(false);
    }
  };

  const copyCredentials = (row: BulkResult["created"][number]) => {
    navigator.clipboard.writeText(`Username: ${row.username}\nPassword: ${row.tempPassword} (must change on first login)`);
    setCopiedRow(row.memberId);
    setTimeout(() => setCopiedRow(null), 2000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => clearTimeout(timer);
  }, [page, statusFilter, searchTerm]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      console.log("🔍 Fetching members with params:", params.toString());

      const res = await fetch(`/api/admin/members?${params}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error:", errorText);
        throw new Error("Failed to fetch members");
      }

      const data = await res.json();
      console.log("📥 Received members:", data);

      setMembers(data.members || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (
    memberId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership: { status: newStatus },
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Member ${newStatus.toLowerCase()}`);
      fetchMembers();
    } catch (error) {
      toast.error("Failed to update member status");
    }
  };

  const calculateAge = (dob: string): string => {
    if (!dob) return "-";

    try {
      const birthDate = new Date(dob);

      if (isNaN(birthDate.getTime())) return "-";

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age.toString();
    } catch (error) {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <Users className="text-yellow-500" size={40} />
              Members
            </h1>
            <p className="text-slate-600 mt-2 font-bold">
              Manage club members and registrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setBulkModalOpen(true); setBulkResult(null); setBulkDryRun(true); }}
              className="flex items-center gap-2 px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-black hover:border-[#06054e] hover:text-[#06054e] transition-all"
              title="Bulk generate login usernames for members without accounts"
            >
              <KeyRound size={18} />
              Generate Logins
            </button>
            <Link
              href="/admin/members/create"
              className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
            >
              <Plus size={20} />
              Add Member
            </Link>
          </div>
        </div>

        {/* ── Bulk Login Generation Modal ── */}
        {bulkModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-[#06054e] flex items-center gap-2">
                    <KeyRound size={20} className="text-yellow-500" />
                    Bulk Generate Member Logins
                  </h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">
                    Auto-creates usernames and temporary passwords for members without accounts.
                    Temp password: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">Hockey{new Date().getFullYear()}!</code>
                  </p>
                </div>
                <button onClick={() => setBulkModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">✕</button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {!bulkResult && (
                  <div className="space-y-3">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 font-semibold">
                      <strong>Preview first</strong> — run a dry run to see which members will get accounts before committing.
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleBulkGenerate(true)}
                        disabled={bulkLoading}
                        className="flex-1 py-3 border-2 border-[#06054e] text-[#06054e] rounded-2xl font-black uppercase text-sm hover:bg-[#06054e]/5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Preview (Dry Run)
                      </button>
                      <button
                        onClick={() => handleBulkGenerate(false)}
                        disabled={bulkLoading}
                        className="flex-1 py-3 bg-[#06054e] text-white rounded-2xl font-black uppercase text-sm hover:bg-[#0a0870] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        Create Accounts
                      </button>
                    </div>
                  </div>
                )}

                {bulkResult && (
                  <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border text-sm font-bold ${bulkDryRun ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-green-50 border-green-200 text-green-800"}`}>
                      {bulkDryRun
                        ? `Preview: ${bulkResult.processed} member(s) would receive accounts. Review below, then click Create Accounts to commit.`
                        : `✓ ${bulkResult.processed} member account(s) created. Note the credentials below — passwords are only shown once.`
                      }
                    </div>

                    {bulkResult.created.length === 0 && (
                      <p className="text-center text-slate-400 font-bold py-8">All members already have login accounts.</p>
                    )}

                    {bulkResult.created.length > 0 && (
                      <>
                        <div className="text-[10px] font-black uppercase text-slate-400 grid grid-cols-12 gap-2 px-2">
                          <span className="col-span-4">Member</span>
                          <span className="col-span-4">Username</span>
                          <span className="col-span-3">Temp Password</span>
                        </div>
                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                          {bulkResult.created.map((row) => (
                            <div key={row.memberId} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl px-3 py-2 text-sm">
                              <span className="col-span-4 font-bold text-slate-700 truncate">{row.memberName}</span>
                              <span className="col-span-4 font-mono text-[#06054e] font-black">{row.username}</span>
                              <span className="col-span-3 font-mono text-slate-600">{row.tempPassword}</span>
                              <button
                                onClick={() => copyCredentials(row)}
                                className="col-span-1 flex items-center justify-center text-slate-400 hover:text-[#06054e] transition-colors"
                                title="Copy credentials"
                              >
                                {copiedRow === row.memberId ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              </button>
                            </div>
                          ))}
                        </div>

                        {bulkDryRun && (
                          <button
                            onClick={() => handleBulkGenerate(false)}
                            disabled={bulkLoading}
                            className="w-full py-3 bg-[#06054e] text-white rounded-2xl font-black uppercase text-sm hover:bg-[#0a0870] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            Confirm — Create {bulkResult.created.length} Account(s)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                Search Members
              </label>
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name, email, or member ID..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-48">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Life">Life Member</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-6">
            <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
              <Users size={24} />
              All Members ({total})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
                <p className="mt-4 text-slate-600 font-bold">
                  Loading members...
                </p>
              </div>
            ) : members.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Member ID
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Name
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Age
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Email
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Mobile
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Status
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => (
                    <tr
                      key={member.memberId}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900">
                          {member.memberId}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-bold text-slate-900">
                            {member.personalInfo.displayName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {member.roles && member.roles.length > 0
                              ? member.roles.join(", ")
                              : "No roles"}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-600 font-bold">
                          {calculateAge(member.personalInfo.dateOfBirth)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-600">
                          {member.contact.email}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-600">
                          {member.contact.mobile || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() =>
                            handleToggleStatus(
                              member.memberId,
                              member.membership.status,
                            )
                          }
                          className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                            member.membership.status === "Active"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : member.membership.status === "Inactive"
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : member.membership.status === "Life"
                                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          {member.membership.status}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/members/${member.memberId}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/admin/members/${member.memberId}/edit`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                member.memberId,
                                member.membership.status,
                              )
                            }
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title={
                              member.membership.status === "Active"
                                ? "Deactivate"
                                : "Activate"
                            }
                          >
                            {member.membership.status === "Active" ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <Users className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-slate-600 font-bold">
                  {searchTerm
                    ? "No members found matching your search"
                    : "No members found"}
                </p>
                <Link
                  href="/admin/members/create"
                  className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                >
                  Create your first member
                </Link>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-200 p-6 flex items-center justify-between">
              <div className="text-sm text-slate-600 font-bold">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
