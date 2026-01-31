"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { Association } from "@/lib/db/schemas/association.schema";
import Link from "next/link";
import Image from "next/image";

interface Club {
  _id: string;
  id: string;
  slug: string;
  parentAssociationId?: string;
  name?: string;
  title?: string;
  shortName?: string;
  abbreviation?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  color?: string;
  bgColor?: string;
  active?: boolean;
  established?: string;
  homeGround?: string;
}

const DEFAULT_COLORS = {
  primary: "#06054e",
  secondary: "#090836",
  accent: "#ffd700",
};
const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"];

// --- Helper Components ---

function ClubLogo({
  logoBase,
  clubName,
}: {
  logoBase: string | null;
  clubName: string;
}) {
  const [srcIndex, setSrcIndex] = useState(0);
  if (!logoBase) return <FallbackIcon />;

  const candidates = LOGO_EXTENSIONS.map(
    (ext) => `/logos/clubs/${logoBase}.${ext}`
  );

  return (
    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
      <Image
        src={candidates[srcIndex]}
        alt={`${clubName} logo`}
        width={32}
        height={32}
        className="object-contain"
        onError={() => {
          if (srcIndex < candidates.length - 1) setSrcIndex((i) => i + 1);
        }}
      />
    </div>
  );
}

function FallbackIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
      <ImageIcon size={16} className="text-slate-400" />
    </div>
  );
}

function getClubColors(club: Club) {
  if (club.colors?.primary && club.colors?.secondary) {
    return {
      primary: club.colors.primary,
      secondary: club.colors.secondary,
      accent: club.colors.accent || DEFAULT_COLORS.accent,
    };
  }
  return {
    primary: club.color || DEFAULT_COLORS.primary,
    secondary: club.bgColor || DEFAULT_COLORS.secondary,
    accent: DEFAULT_COLORS.accent,
  };
}

// --- Main Page ---

export default function ClubsAdminPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [associations, setAssoc] = useState<Association[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssociationId, setSelectedAssociationId] =
    useState<string>("all");

  useEffect(() => {
    fetchClubs();
    fetchAssoc();
  }, []);

  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/clubs");
      if (!res.ok) throw new Error("Failed to fetch clubs");
      const data = await res.json();
      setClubs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssoc = async () => {
    try {
      const res = await fetch("/api/admin/associations");
      const data = await res.json();
      setAssoc(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (clubId: string, clubName: string) => {
    if (!confirm(`Are you sure you want to delete "${clubName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/clubs?id=${clubId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchClubs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const associationIndex = associations.reduce<Record<string, Association>>(
    (acc, assoc) => {
      if (assoc._id) acc[String(assoc._id)] = assoc;
      if (assoc.associationId) acc[String(assoc.associationId)] = assoc;
      return acc;
    },
    {}
  );

  const filteredClubs =
    selectedAssociationId === "all"
      ? clubs
      : clubs.filter((club) => {
          const pId = club.parentAssociationId;
          if (!pId) return false;
          const assoc = associationIndex[String(pId)];
          return (
            assoc &&
            (String(assoc._id) === selectedAssociationId ||
              assoc.associationId === selectedAssociationId)
          );
        });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <Building2 className="text-yellow-500" /> Club Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage all registered hockey clubs
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/clubs/new")}
            className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
          >
            <Plus size={20} /> Create Club
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-red-900">Error Loading Clubs</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
              <Building2 size={24} /> All Clubs ({filteredClubs.length})
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-xs font-black uppercase text-white/80">
                Association
              </label>
              <select
                value={selectedAssociationId}
                onChange={(e) => setSelectedAssociationId(e.target.value)}
                className="px-4 py-2 rounded-xl bg-white text-slate-800 font-semibold focus:outline-none"
              >
                <option value="all">All Associations</option>
                {associations.map((assoc) => (
                  <option
                    key={assoc._id?.toString() || assoc.associationId}
                    value={assoc.associationId || String(assoc._id)}
                  >
                    {assoc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
              </div>
            ) : filteredClubs.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-black text-slate-700 uppercase">
                    <th className="text-left py-4 px-6">Club Name</th>
                    <th className="text-left py-4 px-6">Association</th>
                    <th className="text-left py-4 px-6">Short Name</th>
                    <th className="text-left py-4 px-6">Colors</th>
                    <th className="text-left py-4 px-6">Status</th>
                    <th className="text-right py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClubs.map((club) => {
                    const clubName = club.name || club.title || "Unknown Club";
                    const clubShortName =
                      club.shortName || club.abbreviation || "—";
                    const colors = getClubColors(club);
                    const assocName = club.parentAssociationId
                      ? associationIndex[String(club.parentAssociationId)]?.name
                      : "—";
                    const logoBase =
                      club.shortName || club.slug || club.abbreviation || null;

                    return (
                      <tr
                        key={club._id || club.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/clubs/${club.slug || club.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <ClubLogo logoBase={logoBase} clubName={clubName} />
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 underline-offset-4 group-hover:underline">
                              {clubName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {assocName}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 font-semibold">
                          {clubShortName}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-1">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: colors.primary }}
                              title="Primary"
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: colors.secondary }}
                              title="Secondary"
                            />
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${club.active !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {club.active !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/clubs/edit/${club.id || club._id}`
                                )
                              }
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(club.id || club._id, clubName)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-500 font-bold">
                No clubs found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
