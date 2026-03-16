// app/admin/teams/components/modals/AddRosterModal.tsx
// FINAL FIX: Ensure clubId (not name) is sent

"use client";

import { useState, useEffect } from "react";

interface Club {
  clubId: string;
  name: string;
  associationId?: string;
}

interface AddRosterModalProps {
  clubs: Club[];
  defaultClubId?: string;
  disableClubSelection?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    clubId: string;
    category: string;
    division: string;
    gender: string;
  }) => void;
}

const TEAM_CATEGORIES = ["junior", "senior", "masters", "social"] as const;
const GENDERS = ["male", "female", "mixed"] as const;

export default function AddRosterModal({
  clubs,
  defaultClubId,
  disableClubSelection = false,
  onClose,
  onSubmit,
}: AddRosterModalProps) {
  const [clubId, setClubId] = useState(defaultClubId || "");
  const [category, setCategory] = useState<string>("junior");
  const [division, setDivision] = useState("");
  const [gender, setGender] = useState<string>("male");
  const [divisions, setDivisions] = useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

  // Debug: Log clubs structure
  useEffect(() => {
    console.log("📋 Clubs array structure:", clubs);
    clubs.forEach((club, idx) => {
      console.log(`Club ${idx}:`, {
        clubId: club.clubId,
        name: club.name,
        hasClubId: !!club.clubId,
        typeofClubId: typeof club.clubId,
      });
    });
  }, [clubs]);

  // Debug: Log selected club
  useEffect(() => {
    console.log("✅ Selected clubId:", clubId);
    const found = clubs.find((c) => c.clubId === clubId);
    console.log("🏢 Selected club object:", found);
  }, [clubs, clubId]);

  // Fetch divisions when category changes
  useEffect(() => {
    if (!category) return;

    const fetchDivisions = async () => {
      setLoadingDivisions(true);
      try {
        const response = await fetch(
          `/api/admin/divisions?category=${category}`,
        );
        if (response.ok) {
          const data = await response.json();
          console.log(`📊 Divisions for ${category}:`, data.divisions);
          setDivisions(data.divisions || []);
        } else {
          setDivisions(getDefaultDivisions(category));
        }
      } catch (error) {
        console.error("❌ Error fetching divisions:", error);
        setDivisions(getDefaultDivisions(category));
      } finally {
        setLoadingDivisions(false);
      }
    };

    fetchDivisions();
    setDivision("");
  }, [category]);

  const getDefaultDivisions = (cat: string): string[] => {
    switch (cat) {
      case "junior":
        return ["U6", "U8", "U10", "U12", "U14", "U16", "U18"];
      case "senior":
        return [
          "Open",
          "Premier",
          "Division 1",
          "Division 2",
          "Division 3",
          "BHL1",
          "BHL2",
          "BHL3",
          "BHL4",
          "BHL5",
          "BHL6",
          "BHL7",
        ];
      case "masters":
        return ["O35", "O40", "O45", "O50", "O55", "O60", "O65"];
      case "social":
        return ["Mixed Social", "Recreational"];
      default:
        return [];
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedClub = clubs.find((c) => c.clubId === clubId);

    console.log("🚀 SUBMIT - Form data:", {
      clubId,
      selectedClub,
      category,
      division,
      gender,
    });

    if (!clubId || !category || !division || !gender) {
      alert("Please fill in all required fields");
      return;
    }

    // CRITICAL: Verify we're sending clubId, not name
    if (!selectedClub) {
      console.error("❌ ERROR: Club not found in clubs array!");
      console.log("Looking for clubId:", clubId);
      console.log("Available clubs:", clubs);
      alert("Error: Selected club not found. Please try again.");
      return;
    }

    console.log("✅ Submitting with clubId:", selectedClub.clubId);

    // Send the actual clubId, not the name
    onSubmit({
      clubId: selectedClub.clubId, // Use clubId from the found club
      category,
      division,
      gender,
    });
  };

  // Get selected club for display
  const selectedClub = clubs.find((c) => c.clubId === clubId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase text-[#06054e]">
                    Add Team Roster
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Create a new roster for a club
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Club Assignment */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Assign to Club *
                </label>
                {disableClubSelection && clubId ? (
                  // Locked for club admins
                  <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <div>
                        <div className="font-bold text-blue-900">
                          {selectedClub?.name || "Your Club"}
                        </div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          This roster will be assigned to your club
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Dropdown for super admins
                  <>
                    <select
                      value={clubId}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        console.log(
                          "🔄 Dropdown changed - Raw value:",
                          newValue,
                        );
                        console.log("🔄 Type of value:", typeof newValue);

                        // Find the club to verify
                        const foundClub = clubs.find(
                          (c) => c.clubId === newValue,
                        );
                        console.log("🔍 Found club by clubId:", foundClub);

                        setClubId(newValue);
                      }}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                    >
                      <option value="">Select Club...</option>
                      {clubs.map((club) => {
                        // Debug each option
                        console.log("Rendering option:", {
                          key: club.clubId,
                          value: club.clubId,
                          display: club.name,
                        });

                        return (
                          <option
                            key={club.clubId}
                            value={club.clubId} // MUST be clubId, not name
                          >
                            {club.name}
                          </option>
                        );
                      })}
                    </select>

                    {/* Show selected club details for debugging */}
                    {clubId && (
                      <div className="mt-2 space-y-2">
                        {selectedClub ? (
                          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-xs font-bold text-green-700">
                              ✅ Selected: {selectedClub.name}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Club ID: {selectedClub.clubId}
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-xs font-bold text-red-700">
                              ⚠️ Warning: Club not found
                            </div>
                            <div className="text-xs text-red-600 mt-1">
                              Selected value: {clubId}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-2 flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      This roster will be assigned to the selected club
                    </p>
                  </>
                )}
                {clubs.length === 0 && (
                  <p className="text-xs text-red-600 mt-2 font-bold">
                    ⚠️ No clubs available. Please ensure clubs are configured.
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TEAM_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-6 py-3 rounded-xl font-black uppercase text-sm transition-all ${
                        category === cat
                          ? "bg-[#06054e] text-white shadow-lg"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Division */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Division *
                </label>
                {loadingDivisions ? (
                  <div className="px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-400 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-[#06054e] rounded-full animate-spin"></div>
                    Loading divisions...
                  </div>
                ) : (
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                  >
                    <option value="">Select Division...</option>
                    {divisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Gender *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`px-4 py-3 rounded-xl font-black uppercase text-sm transition-all ${
                        gender === g
                          ? "bg-[#06054e] text-white shadow-lg"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {clubId && division && selectedClub && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="text-xs font-black uppercase text-green-600 mb-2">
                    Roster Preview
                  </div>
                  <div className="text-lg font-black text-green-900 mb-2">
                    {selectedClub.name} - {category} {division} {gender}
                  </div>
                  <div className="text-xs text-green-700">
                    Will be saved with Club ID:{" "}
                    <code className="bg-green-100 px-1 py-0.5 rounded">
                      {selectedClub.clubId}
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-8 py-6 rounded-b-3xl flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!clubId || !division || !selectedClub}
                className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedClub
                  ? `Create Roster for ${selectedClub.name}`
                  : "Create Roster"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
