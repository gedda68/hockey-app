// app/(admin)/admin/users/UsersManagementContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_DEFINITIONS, type UserRole } from "@/lib/types/roles";
import CreateUserModal from "./CreateUserModal";
import EditUserModal from "./EditUserModal";
import {
  Plus,
  Search,
  Edit2,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  Users as UsersIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  associationId: string | null;
  clubId: string | null;
  status: "active" | "inactive" | "suspended";
  emailVerified: boolean;
  emailVerifiedAt?: string;
  emailVerifiedBy?: string;
  lastLogin: string | null;
  createdAt: string;
}

const USERS_PER_PAGE = 20;

export default function UsersManagementContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive" | "suspended"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [users, searchQuery, filterRole, filterStatus]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded users:", data);
        setUsers(data);
      } else {
        const error = await response.json();
        console.error("Failed to load users:", error);
        toast.error(error.error || "Failed to load users");
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    if (filterRole !== "all") {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((user) => user.status === filterStatus);
    }

    setFilteredUsers(filtered);
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    const action = newStatus === "active" ? "activate" : "deactivate";

    try {
      const response = await fetch(`/api/admin/users/${user.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`User ${action}d successfully`);
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const suspendUser = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to SUSPEND ${user.firstName} ${user.lastName}?\n\nSuspended users cannot log in and require admin intervention to reactivate.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });

      if (response.ok) {
        toast.success("User suspended successfully");
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to suspend user");
      }
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const def = ROLE_DEFINITIONS[role];
    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border-2 bg-gradient-to-r ${def.color} text-white`}
      >
        <span>{def.icon}</span>
        <span>{def.label}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string, verified: boolean) => {
    if (status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border-2 border-red-300">
          <Ban size={14} />
          Suspended
        </span>
      );
    }

    if (status === "inactive") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border-2 border-slate-300">
          <XCircle size={14} />
          Inactive
        </span>
      );
    }

    if (!verified) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 border-2 border-yellow-300">
          <AlertCircle size={14} />
          Unverified
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border-2 border-green-300">
        <CheckCircle size={14} />
        Active
      </span>
    );
  };

  const canManageUser = (targetUser: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "super-admin") return true;

    if (currentUser.role === "association-admin") {
      return targetUser.associationId === currentUser.associationId;
    }

    if (currentUser.role === "club-admin") {
      return targetUser.clubId === currentUser.clubId;
    }

    return false;
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    unverified: users.filter((u) => !u.emailVerified).length,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black text-[#06054e] uppercase mb-2">
              User Management
            </h1>
            <p className="text-lg text-slate-600 font-bold">
              Manage user accounts and permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Create User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Total Users
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.total}
                </p>
              </div>
              <UsersIcon size={32} className="text-slate-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Active
                </p>
                <p className="text-3xl font-black text-green-600 mt-1">
                  {stats.active}
                </p>
              </div>
              <CheckCircle size={32} className="text-green-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Inactive
                </p>
                <p className="text-3xl font-black text-slate-600 mt-1">
                  {stats.inactive}
                </p>
              </div>
              <XCircle size={32} className="text-slate-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Suspended
                </p>
                <p className="text-3xl font-black text-red-600 mt-1">
                  {stats.suspended}
                </p>
              </div>
              <Ban size={32} className="text-red-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Unverified
                </p>
                <p className="text-3xl font-black text-yellow-600 mt-1">
                  {stats.unverified}
                </p>
              </div>
              <AlertCircle size={32} className="text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | "all")}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
          >
            <option value="all">All Roles</option>
            {Object.values(ROLE_DEFINITIONS).map((role) => (
              <option key={role.role} value={role.role}>
                {role.icon} {role.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm font-bold text-slate-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)}{" "}
            of {filteredUsers.length} users
          </p>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Organization
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Last Login
                </th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr
                  key={user.userId}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm font-bold text-[#06054e] mt-1">
                        <User size={14} />
                        <span>@{user.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Phone size={14} />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {user.clubId && (
                        <div className="flex items-center gap-2 text-slate-600 mb-1">
                          <Building2 size={14} />
                          <span className="font-bold">Club: {user.clubId}</span>
                        </div>
                      )}
                      {user.associationId && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 size={14} />
                          <span className="font-bold">
                            Assoc: {user.associationId}
                          </span>
                        </div>
                      )}
                      {!user.clubId && !user.associationId && (
                        <span className="text-slate-400 font-bold">
                          System-wide
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(user.status, user.emailVerified)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 font-bold">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "Never"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {canManageUser(user) && (
                        <>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Edit2 size={18} />
                          </button>

                          {user.status === "active" ? (
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate user"
                            >
                              <UserX size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Activate user"
                            >
                              <UserCheck size={18} />
                            </button>
                          )}

                          {user.status !== "suspended" && (
                            <button
                              onClick={() => suspendUser(user)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Suspend user"
                            >
                              <Ban size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <UsersIcon
                      size={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-lg font-bold text-slate-600">
                      No users found
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      {users.length === 0
                        ? "Create your first user to get started"
                        : "Try adjusting your search or filters"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-slate-700 flex items-center gap-2 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, arr) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-2 text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                            currentPage === page
                              ? "bg-[#06054e] text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-slate-700 flex items-center gap-2 transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadUsers}
      />

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={loadUsers}
      />
    </div>
  );
}
