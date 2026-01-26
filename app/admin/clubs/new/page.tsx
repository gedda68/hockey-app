"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save, Plus, Trash2, ArrowLeft, Edit2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Committee Member",
  "Coach Coordinator",
  "Registrar",
  "Junior Coordinator",
  "Senior Coordinator",
  "Volunteer Coordinator",
];

interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
}

export default function CreateClubPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPositionManager, setShowPositionManager] = useState(false);
  const [newPosition, setNewPosition] = useState("");

  const [club, setClub] = useState({
    id: `club-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "",
    shortName: "",
    slug: "",
    logo: "",
    colors: {
      primary: "#06054e",
      secondary: "#090836",
      accent: "#ffd700",
    },
    address: {
      street: "",
      suburb: "",
      state: "QLD",
      postcode: "",
      country: "Australia",
    },
    contact: {
      email: "",
      phone: "",
      website: "",
    },
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
    },
    committee: [] as CommitteeMember[],
    committeePositions: [...DEFAULT_POSITIONS], // Start with default positions
    established: "",
    homeGround: "",
    description: "",
    about: "",
    active: true,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setClub({
      ...club,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!club.name || !club.shortName) {
      alert("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...club,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create club");
      }

      alert("Club created successfully!");
      router.push("/admin/clubs");
    } catch (error: any) {
      console.error("Error creating club:", error);
      alert(error.message || "Failed to create club");
    } finally {
      setIsSaving(false);
    }
  };

  // Position Management
  const addPosition = () => {
    if (!newPosition.trim()) return;

    if (club.committeePositions.includes(newPosition.trim())) {
      alert("This position already exists");
      return;
    }

    setClub({
      ...club,
      committeePositions: [...club.committeePositions, newPosition.trim()],
    });
    setNewPosition("");
  };

  const removePosition = (position: string) => {
    const inUse = club.committee.some((member) => member.position === position);
    if (inUse) {
      alert(
        `Cannot delete "${position}" - it's currently assigned to committee members`
      );
      return;
    }

    if (!confirm(`Remove position "${position}"?`)) return;

    setClub({
      ...club,
      committeePositions: club.committeePositions.filter((p) => p !== position),
    });
  };

  const resetToDefaultPositions = () => {
    if (!confirm("Reset to default positions?")) return;

    setClub({
      ...club,
      committeePositions: [...DEFAULT_POSITIONS],
    });
  };

  // Committee Member Management
  const addCommitteeMember = () => {
    const newMember: CommitteeMember = {
      id: `member-${Date.now()}-${club.committee.length}`,
      name: "",
      position: club.committeePositions[0] || "Committee Member",
      email: "",
      phone: "",
    };

    setClub({
      ...club,
      committee: [...club.committee, newMember],
    });
  };

  const updateCommitteeMember = (
    id: string,
    field: keyof CommitteeMember,
    value: string
  ) => {
    setClub({
      ...club,
      committee: club.committee.map((member) =>
        member.id === id ? { ...member, [field]: value } : member
      ),
    });
  };

  const removeCommitteeMember = (id: string) => {
    if (!confirm("Remove this committee member?")) return;

    setClub({
      ...club,
      committee: club.committee.filter((member) => member.id !== id),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <Building2 className="text-yellow-500" />
              Create New Club
            </h1>
            <p className="text-slate-600 mt-2">Add a new club to the league</p>
          </div>
          <button
            onClick={() => router.push("/admin/clubs")}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700"
          >
            <ArrowLeft size={20} />
            Back to Clubs
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information - Same as before */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  required
                  value={club.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="e.g., Commercial Hockey Club"
                />
                {club.slug && (
                  <p className="mt-2 text-xs text-slate-500 ml-2">
                    Slug: {club.slug}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Short Name *
                </label>
                <input
                  type="text"
                  required
                  value={club.shortName}
                  onChange={(e) =>
                    setClub({ ...club, shortName: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="e.g., CHC"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Established
                </label>
                <input
                  type="text"
                  value={club.established}
                  onChange={(e) =>
                    setClub({ ...club, established: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="e.g., 1944"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Home Ground
                </label>
                <input
                  type="text"
                  value={club.homeGround}
                  onChange={(e) =>
                    setClub({ ...club, homeGround: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="e.g., Perry Park"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={club.active}
                  onChange={(e) =>
                    setClub({ ...club, active: e.target.checked })
                  }
                  className="w-6 h-6 rounded border-slate-300"
                />
                <label htmlFor="active" className="font-bold text-slate-700">
                  Active Club
                </label>
              </div>
            </div>
          </div>

          {/* Committee Positions Manager */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase text-[#06054e]">
                Committee Positions
              </h2>
              <button
                type="button"
                onClick={() => setShowPositionManager(!showPositionManager)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                <Edit2 size={18} />
                {showPositionManager ? "Hide" : "Customize"} Positions
              </button>
            </div>

            {showPositionManager && (
              <div className="mb-6 p-6 bg-indigo-50 rounded-2xl border-2 border-indigo-200">
                <h3 className="font-black text-indigo-900 mb-4">
                  Customize Committee Positions
                </h3>

                {/* Add New Position */}
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addPosition())
                    }
                    className="flex-1 p-3 bg-white border-2 border-indigo-300 rounded-xl outline-none font-bold"
                    placeholder="Enter new position name..."
                  />
                  <button
                    type="button"
                    onClick={addPosition}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Current Positions */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-indigo-700 mb-2">
                    Available Positions ({club.committeePositions.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {club.committeePositions.map((position) => {
                      const inUse = club.committee.some(
                        (m) => m.position === position
                      );
                      return (
                        <div
                          key={position}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm ${
                            inUse
                              ? "bg-green-100 text-green-700 border-2 border-green-300"
                              : "bg-white text-indigo-700 border-2 border-indigo-300"
                          }`}
                        >
                          <span>{position}</span>
                          {inUse && (
                            <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
                              In Use
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removePosition(position)}
                            className="ml-1 text-red-600 hover:text-red-800"
                            title={
                              inUse
                                ? "Cannot delete - in use"
                                : "Delete position"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetToDefaultPositions}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Reset to Default Positions
                </button>
              </div>
            )}

            <p className="text-sm text-slate-600">
              Customize the committee positions for this club. These will be
              available when adding committee members.
            </p>
          </div>

          {/* Committee Members */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase text-[#06054e]">
                Committee Members
              </h2>
              <button
                type="button"
                onClick={addCommitteeMember}
                className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
              >
                <Plus size={20} />
                Add Member
              </button>
            </div>

            <div className="space-y-4">
              {club.committee.map((member, index) => (
                <div
                  key={member.id}
                  className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-black text-slate-700">
                      Member {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeCommitteeMember(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "name",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                        placeholder="Full name"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                        Position
                      </label>
                      <select
                        value={member.position}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "position",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                      >
                        {club.committeePositions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500 ml-2">
                        Customize positions above
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "email",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={member.phone}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "phone",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                        placeholder="0400 000 000"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {club.committee.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-bold">No committee members added yet</p>
                  <p className="text-sm mt-2">
                    Click "Add Member" to get started
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/clubs")}
              className="px-8 py-4 bg-slate-200 hover:bg-slate-300 rounded-2xl font-black uppercase transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase flex items-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <Save size={20} />
              {isSaving ? "Creating..." : "Create Club"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
