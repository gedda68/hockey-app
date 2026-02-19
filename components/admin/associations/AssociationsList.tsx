// components/admin/associations/AssociationsList.tsx
// Admin: List and manage all associations

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { ToastContainer, useToast } from "@/components/ui/Toast";

// 5-level system
export const LEVEL_MAP: Record<
  number,
  { label: string; color: string; short: string }
> = {
  0: {
    label: "National",
    short: "L0",
    color: "bg-purple-100 text-purple-700 border-purple-300",
  },
  1: {
    label: "Sub-national",
    short: "L1",
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
  },
  2: {
    label: "State",
    short: "L2",
    color: "bg-blue-100   text-blue-700   border-blue-300",
  },
  3: {
    label: "Regional",
    short: "L3",
    color: "bg-teal-100   text-teal-700   border-teal-300",
  },
  4: {
    label: "City",
    short: "L4",
    color: "bg-green-100  text-green-700  border-green-300",
  },
};

interface Association {
  associationId: string;
  code: string;
  name: string;
  level: number;
  status: string;
  parent?: { name: string; code: string };
  childrenCount: number;
  clubsCount: number;
}

interface DeleteModalProps {
  association: Association;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteModal({
  association,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-100 p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={28} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Delete Association
            </h2>
            <p className="text-sm font-bold text-slate-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className="text-slate-700 font-bold mb-2">
          Are you sure you want to delete{" "}
          <span className="text-[#06054e]">{association.name}</span>?
        </p>
        {(association.childrenCount > 0 || association.clubsCount > 0) && (
          <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
            <p className="text-xs font-black text-yellow-800 uppercase mb-1">
              Warning
            </p>
            <p className="text-sm font-bold text-yellow-700">
              This association has {association.childrenCount} child
              association(s) and {association.clubsCount} club(s). These
              relationships must be removed first.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssociationsList() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [filteredAssociations, setFilteredAssociations] = useState<
    Association[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Association | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, dismiss, success, error: toastError } = useToast();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  const fetchAssociations = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (levelFilter !== null) params.append("level", levelFilter.toString());

      const res = await fetch(`/api/admin/associations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch associations");

      const data = await res.json();
      const associationsArray = Array.isArray(data)
        ? data
        : data.associations || [];

      setAssociations(associationsArray);
      setFilteredAssociations(associationsArray);
    } catch (err: any) {
      setError(err.message || "Failed to load associations");
      setAssociations([]);
      setFilteredAssociations([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, levelFilter]);

  useEffect(() => {
    fetchAssociations();
  }, [fetchAssociations]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredAssociations(associations);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredAssociations(
      associations.filter(
        (a) =>
          a.name.toLowerCase().includes(lower) ||
          a.code.toLowerCase().includes(lower),
      ),
    );
  }, [searchTerm, associations]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `/api/admin/associations/${deleteTarget.associationId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete association");
      }

      success("Association deleted", `${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
      fetchAssociations();
    } catch (err: any) {
      toastError("Delete failed", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getLevelBadge = (level: number) => {
    const info = LEVEL_MAP[level] || {
      label: `Level ${level}`,
      short: `L${level}`,
      color: "bg-slate-100 text-slate-700 border-slate-300",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-black border-2 whitespace-nowrap ${info.color}`}
      >
        {info.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700 border-green-300",
      inactive: "bg-slate-100 text-slate-700 border-slate-300",
      suspended: "bg-red-100 text-red-700 border-red-300",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-black border-2 capitalize ${
          colors[status] || colors.active
        }`}
      >
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={48} className="animate-spin text-[#06054e]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <AlertCircle size={32} className="text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-black text-red-800 mb-2">Error</h2>
            <p className="text-red-700 font-bold">{error}</p>
            <button
              onClick={fetchAssociations}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
                <Building2 size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-[#06054e]">
                  Associations
                </h1>
                <p className="text-lg text-slate-600 font-bold">
                  Manage hockey associations and hierarchy
                </p>
              </div>
            </div>

            <Link
              href="/admin/associations/new"
              className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              <Plus size={20} />
              New Association
            </Link>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Level Filter */}
            <select
              value={levelFilter === null ? "" : levelFilter}
              onChange={(e) =>
                setLevelFilter(
                  e.target.value === "" ? null : parseInt(e.target.value),
                )
              }
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            >
              <option value="">All Levels</option>
              <option value="0">Level 1 – National</option>
              <option value="1">Level 2 – Sub-national</option>
              <option value="2">Level 3 – State</option>
              <option value="3">Level 4 – Regional</option>
              <option value="4">Level 5 – City</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5">
            <div className="text-xs font-black uppercase text-slate-500 mb-1">
              Total
            </div>
            <div className="text-3xl font-black text-[#06054e]">
              {associations.length}
            </div>
          </div>
          {[0, 1, 2, 3, 4].map((lvl) => {
            const info = LEVEL_MAP[lvl];
            const count = associations.filter((a) => a.level === lvl).length;
            return (
              <div
                key={lvl}
                className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5"
              >
                <div className="text-xs font-black uppercase text-slate-500 mb-1">
                  {info.label}
                </div>
                <div
                  className={`text-3xl font-black ${info.color.split(" ")[1]}`}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Associations Table */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          {filteredAssociations.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-xl font-bold text-slate-500">
                No associations found
              </p>
              <Link
                href="/admin/associations/new"
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
              >
                <Plus size={18} />
                Create First Association
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Association
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Level
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Parent
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Children
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Clubs
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssociations.map((assoc) => (
                    <tr
                      key={assoc.associationId}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {assoc.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-[#06054e]">
                          {assoc.code}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getLevelBadge(assoc.level)}
                      </td>
                      <td className="px-6 py-4">
                        {assoc.parent ? (
                          <div className="text-sm font-bold text-slate-600">
                            {assoc.parent.code}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-400">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-slate-400" />
                          <span className="font-bold text-slate-700">
                            {assoc.childrenCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-slate-400" />
                          <span className="font-bold text-slate-700">
                            {assoc.clubsCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(assoc.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/associations/${assoc.associationId}`}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={18} className="text-blue-600" />
                          </Link>
                          <Link
                            href={`/admin/associations/${assoc.associationId}/edit`}
                            className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} className="text-yellow-600" />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(assoc)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          association={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
