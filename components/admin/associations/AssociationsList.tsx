// components/admin/AssociationsList.tsx
// Admin: List and manage all associations

"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  ChevronRight,
  Users,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

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

export default function AssociationsList() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [filteredAssociations, setFilteredAssociations] = useState<
    Association[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  useEffect(() => {
    fetchAssociations();
  }, [statusFilter, levelFilter]);

  useEffect(() => {
    filterAssociations();
  }, [searchTerm, associations]);

  const fetchAssociations = async () => {
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

      // VITAL CHECK: Ensure data is an array before setting state
      const associationsArray = Array.isArray(data)
        ? data
        : data.associations || [];

      setAssociations(associationsArray);
      setFilteredAssociations(associationsArray);
    } catch (err: any) {
      setError(err.message || "Failed to load associations");
      // Reset to empty array on error to prevent .filter crashes
      setAssociations([]);
      setFilteredAssociations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAssociations = () => {
    if (!searchTerm) {
      setFilteredAssociations(associations);
      return;
    }

    const filtered = associations.filter(
      (assoc) =>
        assoc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assoc.code.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    setFilteredAssociations(filtered);
  };

  const handleDelete = async (associationId: string) => {
    if (!confirm("Are you sure you want to delete this association?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/associations/${associationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete association");
      }

      // Refresh list
      fetchAssociations();
    } catch (err: any) {
      alert(err.message || "Failed to delete association");
    }
  };

  const getLevelBadge = (level: number) => {
    const badges = {
      0: {
        label: "National",
        color: "bg-purple-100 text-purple-700 border-purple-300",
      },
      1: { label: "State", color: "bg-blue-100 text-blue-700 border-blue-300" },
      2: {
        label: "Regional",
        color: "bg-green-100 text-green-700 border-green-300",
      },
    };

    const badge = badges[level as keyof typeof badges] || {
      label: `Level ${level}`,
      color: "bg-slate-100 text-slate-700 border-slate-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-bold border-2 ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-700 border-green-300",
      inactive: "bg-slate-100 text-slate-700 border-slate-300",
      suspended: "bg-red-100 text-red-700 border-red-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-bold border-2 capitalize ${
          colors[status as keyof typeof colors] || colors.active
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
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
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
            </div>
          </div>

          {/* Level Filter */}
          <div>
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
              <option value="0">National</option>
              <option value="1">State</option>
              <option value="2">Regional</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <div className="text-sm font-black uppercase text-slate-500 mb-2">
            Total Associations
          </div>
          <div className="text-4xl font-black text-[#06054e]">
            {associations.length}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <div className="text-sm font-black uppercase text-slate-500 mb-2">
            National
          </div>
          <div className="text-4xl font-black text-purple-600">
            {associations.filter((a) => a.level === 0).length}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <div className="text-sm font-black uppercase text-slate-500 mb-2">
            State
          </div>
          <div className="text-4xl font-black text-blue-600">
            {associations.filter((a) => a.level === 1).length}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <div className="text-sm font-black uppercase text-slate-500 mb-2">
            Regional
          </div>
          <div className="text-4xl font-black text-green-600">
            {associations.filter((a) => a.level === 2).length}
          </div>
        </div>
      </div>

      {/* Associations List */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {filteredAssociations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-xl font-bold text-slate-500">
              No associations found
            </p>
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
                    <td className="px-6 py-4">{getLevelBadge(assoc.level)}</td>
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
                          onClick={() => handleDelete(assoc.associationId)}
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
  );
}
