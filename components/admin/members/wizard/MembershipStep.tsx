// components/admin/members/wizard/MembershipStep.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Building2, MapPin } from "lucide-react";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import {
  nationalAssociations,
  childAssociations,
  clubsUnder,
  selectionForClub,
  type HAssociation,
  type HClub,
} from "@/lib/members/associationHierarchy";

const LABEL = "text-xs font-black uppercase text-slate-400 mb-2 block";

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function MembershipStep({
  membershipData,
  roles,
  onMembershipChange,
  onRolesChange,
  onClubChange,
  errors,
}: {
  membershipData: any;
  roles: string[];
  onMembershipChange: (data: any) => void;
  onRolesChange: (roles: string[]) => void;
  onClubChange?: (clubId: string) => void;
  errors: Record<string, string>;
}) {
  // Everything comes from the `associations` and `clubs` collections, linked by parentAssociationId.
  const [associations, setAssociations] = useState<HAssociation[]>([]);
  const [allClubs, setAllClubs] = useState<HClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedNational, setSelectedNational] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedClub, setSelectedClub] = useState("");

  // Membership types & roles
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/lookups/association-hierarchy");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAssociations(data.associations || []);
        setAllClubs(data.clubs || []);
      } catch (e) {
        console.error("Association lookup failed", e);
        setLoadError("Could not load associations and clubs.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const nationals = useMemo(
    () => nationalAssociations(associations),
    [associations],
  );
  const states = useMemo(
    () => childAssociations(associations, selectedNational),
    [associations, selectedNational],
  );
  const cities = useMemo(
    () => childAssociations(associations, selectedState),
    [associations, selectedState],
  );
  // Normally clubs hang off a city/region association; if a state has no city level, offer its own clubs.
  const stateIsLeaf = !!selectedState && cities.length === 0;
  const clubs = useMemo(
    () => clubsUnder(allClubs, stateIsLeaf ? selectedState : selectedCity),
    [allClubs, selectedCity, selectedState, stateIsLeaf],
  );

  // Editing an existing member: prefill every level from the club they already belong to.
  const existingClubId: string = membershipData?.clubId || "";
  useEffect(() => {
    if (!existingClubId || selectedClub === existingClubId || isLoading) return;
    const sel = selectionForClub(associations, allClubs, existingClubId);
    setSelectedNational(sel.national);
    setSelectedState(sel.state);
    setSelectedCity(sel.city);
    setSelectedClub(existingClubId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingClubId, isLoading, associations, allClubs]);

  useEffect(() => {
    if (selectedClub) {
      fetchMembershipTypes();
      fetchRoles();
    }
  }, [selectedClub]);

  const fetchMembershipTypes = async () => {
    try {
      const res = await fetch("/api/admin/config/membership-type");
      if (res.ok) setMembershipTypes(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/config/member-role");
      if (res.ok) setAvailableRoles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // ── Selection handlers — each clears everything below it ────────────────────
  const pickNational = (id: string) => {
    setSelectedNational(id);
    setSelectedState("");
    setSelectedCity("");
    setSelectedClub("");
    setMembershipTypes([]);
  };
  const pickState = (id: string) => {
    setSelectedState(id);
    setSelectedCity("");
    setSelectedClub("");
    setMembershipTypes([]);
  };
  const pickCity = (id: string) => {
    setSelectedCity(id);
    setSelectedClub("");
    setMembershipTypes([]);
  };
  const pickClub = (id: string) => {
    setSelectedClub(id);
    const club = allClubs.find((c) => c.id === id);
    if (!club) return;
    if (onClubChange) onClubChange(club.id);
    onMembershipChange({
      ...membershipData,
      clubId: club.id,
      clubName: club.name,
    });
  };

  const nameOf = (list: { name: string }[], pick: (x: any) => boolean) =>
    list.find(pick)?.name || "";
  const nationalName = nameOf(
    associations,
    (a) => a.associationId === selectedNational,
  );
  const stateName = nameOf(
    associations,
    (a) => a.associationId === selectedState,
  );
  const cityName = nameOf(
    associations,
    (a) => a.associationId === selectedCity,
  );
  const clubName =
    nameOf(allClubs, (c) => c.id === selectedClub) ||
    membershipData?.clubName ||
    "";

  const assocOptions = (list: HAssociation[]) =>
    list.map((a) => ({
      value: a.associationId,
      label: a.code ? `${a.name} (${a.code})` : a.name,
    }));

  const toggleMembershipType = (typeId: string) => {
    const cur: string[] = membershipData.membershipTypes || [];
    onMembershipChange({
      ...membershipData,
      membershipTypes: cur.includes(typeId)
        ? cur.filter((id) => id !== typeId)
        : [...cur, typeId],
    });
  };

  const toggleRole = (roleId: string) => {
    onRolesChange(
      roles.includes(roleId)
        ? roles.filter((id) => id !== roleId)
        : [...roles, roleId],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Association Hierarchy Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="text-blue-600" size={20} />
          Select Your Association & Club
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Follow the hierarchy to find your club: National → State → City/Region
          → Club
        </p>

        {(selectedNational ||
          selectedState ||
          selectedCity ||
          selectedClub) && (
          <div className="mb-6 flex items-center gap-2 text-sm font-bold flex-wrap">
            {[nationalName, stateName, cityName].filter(Boolean).map((n, i) => (
              <span key={i} className="flex items-center gap-2 text-blue-600">
                {n}
                <ChevronRight size={14} className="text-slate-400" />
              </span>
            ))}
            {clubName && (
              <span className="text-green-600 font-black">{clubName}</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>1. National Association *</label>
            <TypeaheadSelect
              ariaLabel="National association"
              placeholder={
                isLoading ? "Loading…" : "Search national association..."
              }
              options={assocOptions(nationals)}
              value={selectedNational}
              onChange={pickNational}
            />
          </div>
          <div>
            <label className={LABEL}>2. State Association *</label>
            <TypeaheadSelect
              ariaLabel="State association"
              placeholder={
                !selectedNational
                  ? "Select national first..."
                  : "Search state association..."
              }
              options={assocOptions(states)}
              value={selectedState}
              onChange={pickState}
            />
          </div>
          <div>
            <label className={LABEL}>3. City/Region Association *</label>
            <TypeaheadSelect
              ariaLabel="City or region association"
              placeholder={
                !selectedState
                  ? "Select state first..."
                  : "Search city/region..."
              }
              options={assocOptions(cities)}
              value={selectedCity}
              onChange={pickCity}
            />
          </div>
          <div>
            <label className={LABEL}>4. Club *</label>
            <TypeaheadSelect
              ariaLabel="Club"
              placeholder={
                !(selectedCity || stateIsLeaf)
                  ? "Select city/region first..."
                  : "Search club..."
              }
              options={clubs.map((c) => ({
                value: c.id,
                label: c.shortName ? `${c.name} (${c.shortName})` : c.name,
              }))}
              value={selectedClub}
              onChange={pickClub}
            />
          </div>
        </div>

        {loadError && (
          <p className="mt-4 text-sm font-bold text-red-600">{loadError}</p>
        )}
      </div>

      {/* Post-club-selection sections */}
      {selectedClub && (
        <>
          {/* Selected Club banner */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Building2 className="text-green-600" size={24} />
              <div>
                <p className="text-xs font-black uppercase text-green-600">
                  Selected Club
                </p>
                <p className="font-black text-slate-900 text-lg">{clubName}</p>
              </div>
            </div>
          </div>

          {/* Membership Types */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Membership Types * (Select at least one)
            </label>
            {errors.membershipTypes && (
              <p className="text-red-500 text-xs mb-2 font-bold">
                {errors.membershipTypes}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {membershipTypes.map((type) => {
                const id = type.typeId || type.id;
                const selected = (
                  membershipData.membershipTypes || []
                ).includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleMembershipType(id)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      selected
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-black text-slate-900">
                          {type.name}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {type.description}
                        </div>
                        {type.annualFee && (
                          <div className="text-sm font-bold text-green-600 mt-2">
                            ${type.annualFee}/year
                          </div>
                        )}
                      </div>
                      {selected && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Roles (optional)
            </label>
            <div className="grid grid-cols-3 gap-4">
              {availableRoles.map((role) => {
                const id = role.roleId || role.id;
                const selected = roles.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleRole(id)}
                    className={`p-3 border-2 rounded-xl text-left transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {role.icon && (
                        <span className="text-xl">{role.icon}</span>
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900">
                          {role.name}
                        </div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Join Date & Status */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Join Date
              </label>
              <input
                type="date"
                value={membershipData.joinDate}
                onChange={(e) =>
                  onMembershipChange({
                    ...membershipData,
                    joinDate: e.target.value,
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Status
              </label>
              <select
                value={membershipData.status}
                onChange={(e) =>
                  onMembershipChange({
                    ...membershipData,
                    status: e.target.value,
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Life">Life Member</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Prompt when no club selected yet */}
      {!selectedClub && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-bold">
            ⚠️ Please select your club using the hierarchy above to continue
          </p>
        </div>
      )}
    </div>
  );
}
