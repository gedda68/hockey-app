"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { shouldDefaultClubListToAssociation } from "@/lib/auth/clubListScope";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  MapPin,
  Users,
  Loader2,
} from "lucide-react";

interface Club {
  id: string;
  slug?: string;
  name: string;
  shortName: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  address: {
    suburb: string;
    state: string;
  };
  homeGround: string;
  established: string;
  active: boolean;
  parentAssociationId: string;
}

interface Association {
  associationId: string;
  code: string;
  name: string;
}

export default function ClubsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAssociation, setFilterAssociation] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  useEffect(() => {
    if (!user) return;
    if (shouldDefaultClubListToAssociation(user) && user.associationId) {
      setFilterAssociation(user.associationId);
    }
  }, [user]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterAssociation) params.append("associationId", filterAssociation);
        if (filterStatus) params.append("status", filterStatus);

        const res = await fetch(`/api/admin/clubs?${params}`);
        const data = await res.json();
        setClubs(data.clubs || []);
      } catch (error) {
        console.error("Error fetching clubs:", error);
      } finally {
        setLoading(false);
      }
    };
    const fetchAssociations = async () => {
      try {
        const res = await fetch("/api/admin/associations");
        const data = await res.json();
        setAssociations(data.associations || []);
      } catch (error) {
        console.error("Error fetching associations:", error);
      }
    };
    void fetchClubs();
    void fetchAssociations();
  }, [filterAssociation, filterStatus]);

  const associationOptions = useMemo(() => {
    if (!user || user.role === "super-admin") return associations;
    const ids = new Set<string>();
    if (user.associationId) ids.add(user.associationId);
    for (const sr of user.scopedRoles ?? []) {
      if (sr.scopeType === "association" && sr.scopeId) ids.add(sr.scopeId);
    }
    if (ids.size === 0) return associations;
    return associations.filter((a) => ids.has(a.associationId));
  }, [associations, user]);

  const fetchAssociations = async () => {
    try {
      const res = await fetch("/api/admin/associations");
      const data = await res.json();
      setAssociations(data.associations || []);
    } catch (error) {
      console.error("Error fetching associations:", error);
    }
  };

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAssociation) params.append("associationId", filterAssociation);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(`/api/admin/clubs?${params}`);
      const data = await res.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClubs = clubs.filter((club) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      club.name.toLowerCase().includes(searchLower) ||
      club.shortName.toLowerCase().includes(searchLower) ||
      club.address.suburb.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-[#06054e] text-white flex items-center justify-center">
                <Building2 size={40} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-[#06054e] tracking-tight">
                  Clubs
                </h1>
                <p className="text-slate-500 font-bold">
                  Manage hockey clubs and their details
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/clubs/new")}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              <Plus size={20} />
              New Club
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or suburb..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
                />
              </div>
            </div>

            {/* Association Filter */}
            <div>
              <select
                value={filterAssociation}
                onChange={(e) => setFilterAssociation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
              >
                {user?.role === "super-admin" ? (
                  <option value="">All Associations</option>
                ) : null}
                {associationOptions.map((assoc) => (
                  <option key={assoc.associationId} value={assoc.associationId}>
                    {assoc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-slate-500 font-bold">
              {filteredClubs.length} club{filteredClubs.length !== 1 ? "s" : ""}{" "}
              found
            </span>
            {(search ||
              filterStatus !== "active" ||
              (user?.role === "super-admin" && filterAssociation !== "")) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterAssociation(
                    shouldDefaultClubListToAssociation(user)
                      ? (user?.associationId ?? "")
                      : "",
                  );
                  setFilterStatus("active");
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Clubs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#06054e]" size={40} />
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
            <Building2 size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-600 mb-2">
              No clubs found
            </h3>
            <p className="text-slate-400 mb-6">
              {search || filterAssociation
                ? "Try adjusting your filters"
                : "Get started by creating your first club"}
            </p>
            {!search && !filterAssociation && (
              <button
                onClick={() => router.push("/admin/clubs/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e]"
              >
                <Plus size={20} />
                Create Club
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <div
                key={club.id}
                className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all cursor-pointer group"
                onClick={() => router.push(`/admin/clubs/${club.slug || club.id}/edit`)}
              >
                {/* Header with club colors */}
                <div
                  className="h-24 relative"
                  style={{
                    background: `linear-gradient(135deg, ${club.colors.primary} 0%, ${club.colors.accent} 20%, ${club.colors.secondary} 100%)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-between p-6">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
                      <img
                        src={club.logo}
                        alt={`${club.name} logo`}
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/clubs/${club.slug || club.id}/edit`);
                      }}
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-black text-[#06054e] mb-2 group-hover:text-yellow-600 transition-colors">
                    {club.name}
                  </h3>

                  <div className="space-y-2 text-sm">
                    {club.homeGround && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={16} className="flex-shrink-0" />
                        <span className="font-bold">{club.homeGround}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 size={16} className="flex-shrink-0" />
                      <span className="font-bold">
                        {club.address.suburb}, {club.address.state}
                      </span>
                    </div>

                    {club.established && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users size={16} className="flex-shrink-0" />
                        <span className="font-bold">
                          Est. {club.established}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black ${
                        club.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {club.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
