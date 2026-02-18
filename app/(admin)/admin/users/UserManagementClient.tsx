// app/(admin)/admin/users/UserManagementClient.tsx
// User management UI with role-based features

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ROLE_DEFINITIONS, type UserRole } from "@/lib/types/roles";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Building2,
  Users,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  associationId: string | null;
  clubId: string | null;
  status: "active" | "inactive" | "suspended";
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function UserManagementClient() {
  return (
    <ProtectedRoute requiredPermission={["system.users"]}>
      <UserManagementContent />
    </ProtectedRoute>
  );
}

function UserManagementContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

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
          <XCircle size={14} />
          Suspended
        </span>
      );
    }

    if (status === "inactive") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border-2 border-slate-300">
          <AlertCircle size={14} />
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
              Manage users and assign roles
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Create User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Total Users
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {users.length}
                </p>
              </div>
              <Users size={32} className="text-slate-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Active
                </p>
                <p className="text-3xl font-black text-green-600 mt-1">
                  {users.filter((u) => u.status === "active").length}
                </p>
              </div>
              <CheckCircle size={32} className="text-green-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Admins
                </p>
                <p className="text-3xl font-black text-purple-600 mt-1">
                  {
                    users.filter((u) =>
                      [
                        "super-admin",
                        "association-admin",
                        "club-admin",
                      ].includes(u.role)
                    ).length
                  }
                </p>
              </div>
              <Shield size={32} className="text-purple-300" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Unverified
                </p>
                <p className="text-3xl font-black text-yellow-600 mt-1">
                  {users.filter((u) => !u.emailVerified).length}
                </p>
              </div>
              <AlertCircle size={32} className="text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {filteredUsers.map((user) => (
                <tr
                  key={user.userId}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
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
                      <button
                        onClick={() => {
                          /* Edit user */
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          /* Delete user */
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user"
                        disabled={user.userId === currentUser?.userId}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-bold text-slate-600">
                      No users found
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
