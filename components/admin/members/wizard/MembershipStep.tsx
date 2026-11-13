// components/admin/members/wizard/MembershipStep.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Building2, MapPin } from "lucide-react";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import TypeaheadMultiSelect from "@/components/ui/TypeaheadMultiSelect";
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
      fetchOptions();
    }
  }, [selectedClub]);

  const fetchOptions = async () => {
    try {
      const res = await fetch("/api/admin/lookups/membership-options");
      if (!res.ok) return;
      const data = await res.json();
      setMembershipTypes(data.membershipTypes || []);
      setAvailableRoles(data.roles || []);
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
            <TypeaheadMultiSelect
              ariaLabel="Membership types"
              placeholder="Search and select membership types..."
              options={membershipTypes.map((t) => ({
                value: t.id,
                label: t.name,
                hint:
                  [t.description, t.annualFee ? `$${t.annualFee}/year` : ""]
                    .filter(Boolean)
                    .join(" · ") || undefined,
              }))}
              values={membershipData.membershipTypes || []}
              onChange={(v) =>
                onMembershipChange({ ...membershipData, membershipTypes: v })
              }
            />
          </div>

          {/* Roles */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Membership Roles
            </label>
            <TypeaheadMultiSelect
              ariaLabel="Roles"
              placeholder="Search and select roles..."
              options={availableRoles.map((r) => ({
                value: r.id,
                label: r.name,
                hint: r.description,
              }))}
              values={roles}
              onChange={onRolesChange}
            />
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
