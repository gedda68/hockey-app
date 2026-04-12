// Add roster row — division triple comes from association-published catalog when present.

"use client";

import { useState, useEffect, useMemo } from "react";

interface Club {
  clubId: string;
  name: string;
  associationId?: string;
}

type CatalogSlot = {
  category: string;
  division: string;
  gender: string;
  sortOrder: number;
  maxTeamsPerClub: number;
};

interface AddRosterModalProps {
  clubs: Club[];
  defaultClubId?: string;
  disableClubSelection?: boolean;
  season: string;
  onClose: () => void;
  onSubmit: (data: {
    clubId: string;
    category: string;
    division: string;
    gender: string;
  }) => void;
}

function tripleKey(category: string, division: string, gender: string): string {
  return `${category.trim().toLowerCase()}|${division.trim()}|${gender.trim().toLowerCase()}`;
}

const TEAM_CATEGORIES = ["junior", "senior", "masters", "social"] as const;
const GENDERS = ["male", "female", "mixed"] as const;

export default function AddRosterModal({
  clubs,
  defaultClubId,
  disableClubSelection = false,
  season,
  onClose,
  onSubmit,
}: AddRosterModalProps) {
  const [clubId, setClubId] = useState(defaultClubId || "");
  const [category, setCategory] = useState<string>("junior");
  const [division, setDivision] = useState("");
  const [gender, setGender] = useState<string>("male");
  const [divisions, setDivisions] = useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogActive, setCatalogActive] = useState(false);
  const [catalogSlots, setCatalogSlots] = useState<CatalogSlot[]>([]);
  const [existingTriples, setExistingTriples] = useState<string[]>([]);
  const [catalogPickKey, setCatalogPickKey] = useState("");

  useEffect(() => {
    if (defaultClubId) setClubId(defaultClubId);
  }, [defaultClubId]);

  useEffect(() => {
    if (!clubId || !season) {
      setCatalogActive(false);
      setCatalogSlots([]);
      setExistingTriples([]);
      setCatalogPickKey("");
      return;
    }

    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const res = await fetch(
          `/api/admin/clubs/${encodeURIComponent(clubId)}/roster-division-options?season=${encodeURIComponent(season)}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (cancelled) return;
        setCatalogActive(Boolean(data.catalogActive && data.slots?.length));
        const slots = (data.slots || []) as CatalogSlot[];
        setCatalogSlots(
          [...slots].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
          ),
        );
        setExistingTriples(data.existingTriples || []);
        setCatalogPickKey("");
      } catch {
        if (!cancelled) {
          setCatalogActive(false);
          setCatalogSlots([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, season]);

  const availableCatalogSlots = useMemo(() => {
    const ex = new Set(existingTriples);
    return catalogSlots.filter(
      (s) => !ex.has(tripleKey(s.category, s.division, s.gender)),
    );
  }, [catalogSlots, existingTriples]);

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
          setDivisions(data.divisions || []);
        } else {
          setDivisions(getDefaultDivisions(category));
        }
      } catch {
        setDivisions(getDefaultDivisions(category));
      } finally {
        setLoadingDivisions(false);
      }
    };

    void fetchDivisions();
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
    if (!clubId || !selectedClub) {
      alert("Select a club");
      return;
    }

    if (catalogActive) {
      if (!catalogPickKey) {
        alert("Select a division offering from the association list");
        return;
      }
      const slot = availableCatalogSlots.find(
        (s) => tripleKey(s.category, s.division, s.gender) === catalogPickKey,
      );
      if (!slot) {
        alert("That division is not available (you may already have a roster there).");
        return;
      }
      onSubmit({
        clubId: selectedClub.clubId,
        category: slot.category,
        division: slot.division,
        gender: slot.gender,
      });
      return;
    }

    if (!category || !division || !gender) {
      alert("Please fill in all required fields");
      return;
    }

    onSubmit({
      clubId: selectedClub.clubId,
      category,
      division,
      gender,
    });
  };

  const selectedClub = clubs.find((c) => c.clubId === clubId);

  const useCatalogUi = catalogActive && !catalogLoading;
  const canSubmit = Boolean(
    selectedClub &&
      (useCatalogUi
        ? catalogPickKey && availableCatalogSlots.length > 0
        : division && category && gender),
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase text-[#06054e]">
                    Add Team Roster
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Season {season} · Divisions offered by the association apply
                    to clubs under that body.
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

            <div className="px-8 py-6 space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Assign to Club *
                </label>
                {disableClubSelection && clubId ? (
                  <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="font-bold text-blue-900">
                      {selectedClub?.name || "Your Club"}
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      Rosters are only created for your club. Players must be
                      registered members of this club.
                    </div>
                  </div>
                ) : (
                  <select
                    value={clubId}
                    onChange={(e) => setClubId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                  >
                    <option value="">Select Club...</option>
                    {clubs.map((club) => (
                      <option key={club.clubId} value={club.clubId}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                )}
                {clubs.length === 0 && (
                  <p className="text-xs text-red-600 mt-2 font-bold">
                    No clubs available.
                  </p>
                )}
              </div>

              {catalogLoading && clubId && (
                <p className="text-sm text-slate-500">Loading division catalogue…</p>
              )}

              {useCatalogUi && (
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
                  <h3 className="text-xs font-black uppercase text-indigo-900">
                    Association-published divisions
                  </h3>
                  {availableCatalogSlots.length === 0 ? (
                    <p className="text-sm text-indigo-900">
                      Every published slot for this season already has a roster
                      row for this club, or the association has not published
                      offerings yet. Use <strong>Add team</strong> on an existing
                      roster, or ask the association to publish divisions.
                    </p>
                  ) : (
                    <>
                      <label className="block text-xs font-bold text-indigo-800">
                        Choose division offering *
                      </label>
                      <select
                        value={catalogPickKey}
                        onChange={(e) => setCatalogPickKey(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl font-bold"
                        required={useCatalogUi}
                      >
                        <option value="">Select…</option>
                        {availableCatalogSlots.map((s) => {
                          const k = tripleKey(s.category, s.division, s.gender);
                          return (
                            <option key={k} value={k}>
                              {s.division} · {s.category} · {s.gender}
                              {s.maxTeamsPerClub > 1
                                ? ` (up to ${s.maxTeamsPerClub} teams)`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                    </>
                  )}
                </div>
              )}

              {!useCatalogUi && clubId && !catalogLoading && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  No published catalogue for this club’s association and season
                  — free selection is enabled. The association should publish
                  divisions for production use.
                </p>
              )}

              {!useCatalogUi && (
                <>
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
                </>
              )}

              {clubId && selectedClub && (useCatalogUi ? catalogPickKey : division) && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm text-green-900">
                  <span className="font-black uppercase text-green-700 text-xs block mb-1">
                    Preview
                  </span>
                  {selectedClub.name}
                  {useCatalogUi && catalogPickKey
                    ? (() => {
                        const s = availableCatalogSlots.find(
                          (x) =>
                            tripleKey(x.category, x.division, x.gender) ===
                            catalogPickKey,
                        );
                        return s
                          ? ` — ${s.division} · ${s.category} · ${s.gender}`
                          : "";
                      })()
                    : ` — ${category} ${division} ${gender}`}
                </div>
              )}
            </div>

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
                disabled={!canSubmit}
                className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Roster
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
