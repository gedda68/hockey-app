// components/admin/members/wizard/MembershipStep.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Building2, MapPin, Search } from "lucide-react";

interface Association {
  associationId: string;
  name: string;
  code: string;
  level: number;
  parentAssociationId?: string;
}

interface Club {
  id: string;
  name: string;
  shortName: string;
  parentAssociationId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TypeAheadSelect — defined at MODULE SCOPE so its reference is stable across
// renders. If it lived inside MembershipStep, React would treat it as a new
// component type on every render and unmount+remount the input, stealing focus.
// ─────────────────────────────────────────────────────────────────────────────
interface TypeAheadProps {
  label: string;
  placeholder: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  options: any[];
  onSelect: (option: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled: boolean;
  renderOption: (option: any) => React.ReactNode;
  getKey: (option: any) => string;
}

function TypeAheadSelect({
  label,
  placeholder,
  searchValue,
  onSearchChange,
  options,
  onSelect,
  isOpen,
  setIsOpen,
  disabled,
  renderOption,
  getKey,
}: TypeAheadProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the whole container
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full p-3 pr-10 bg-white border-2 border-slate-300 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={getKey(option)}
                type="button"
                // onMouseDown instead of onClick — fires before the input's onBlur,
                // so the selection registers before the dropdown could close
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur
                  onSelect(option);
                }}
                className="w-full p-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
              >
                {renderOption(option)}
              </button>
            ))
          ) : searchValue ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No results found for &ldquo;{searchValue}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

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
  // Association hierarchy data
  const [nationalAssociations, setNationalAssociations]       = useState<Association[]>([]);
  const [subNationalAssociations, setSubNationalAssociations] = useState<Association[]>([]);
  const [stateAssociations, setStateAssociations]             = useState<Association[]>([]);
  const [cityAssociations, setCityAssociations]               = useState<Association[]>([]);
  const [clubs, setClubs]                                     = useState<Club[]>([]);

  // Selected IDs
  const [selectedNational,    setSelectedNational]    = useState<string>("");
  const [selectedSubNational, setSelectedSubNational] = useState<string>("");
  const [selectedState,       setSelectedState]       = useState<string>("");
  const [selectedCity,        setSelectedCity]        = useState<string>("");
  const [selectedClub,        setSelectedClub]        = useState<string>("");

  // Search text (display value in each input)
  const [nationalSearch,    setNationalSearch]    = useState("");
  const [subNationalSearch, setSubNationalSearch] = useState("");
  const [stateSearch,       setStateSearch]       = useState("");
  const [citySearch,        setCitySearch]        = useState("");
  const [clubSearch,        setClubSearch]        = useState("");

  // Dropdown open states
  const [nationalOpen,    setNationalOpen]    = useState(false);
  const [subNationalOpen, setSubNationalOpen] = useState(false);
  const [stateOpen,       setStateOpen]       = useState(false);
  const [cityOpen,        setCityOpen]        = useState(false);
  const [clubOpen,        setClubOpen]        = useState(false);

  const [isLoadingAssociations, setIsLoadingAssociations] = useState(false);
  const [isLoadingClubs,        setIsLoadingClubs]        = useState(false);
  const [cityFallback,          setCityFallback]          = useState(false); // true when level-3 had no results

  // Membership types & roles
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [availableRoles,  setAvailableRoles]  = useState<any[]>([]);

  // Load national associations on mount
  useEffect(() => { fetchNationalAssociations(); }, []);

  // ── Fetch helpers ───────────────────────────────────────────────────────────

  const fetchNationalAssociations = async () => {
    setIsLoadingAssociations(true);
    try {
      const res = await fetch("/api/admin/associations?level=0&status=active");
      if (res.ok) {
        const data = await res.json();
        setNationalAssociations(data.associations || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingAssociations(false); }
  };

  const fetchSubNationalAssociations = async (nationalId: string) => {
    setIsLoadingAssociations(true);
    try {
      const res = await fetch(`/api/admin/associations?level=1&parentId=${nationalId}&status=active`);
      if (res.ok) {
        const data = await res.json();
        const assocs: Association[] = data.associations || [];
        setSubNationalAssociations(assocs);
        // If no level-1 bodies exist, go straight to state (level 2)
        if (assocs.length === 0) fetchStateAssociations(nationalId);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingAssociations(false); }
  };

  const fetchStateAssociations = async (parentId: string) => {
    setIsLoadingAssociations(true);
    try {
      const res = await fetch(`/api/admin/associations?level=2&parentId=${parentId}&status=active`);
      if (res.ok) {
        const data = await res.json();
        setStateAssociations(data.associations || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingAssociations(false); }
  };

  /**
   * Fetch city/region associations (level 3) by state parent.
   *
   * Fallback strategy — real-world data is often not perfectly levelled:
   *   1. Try level=3 with parentId=stateId  (strict)
   *   2. If empty, try any association with parentId=stateId (no level filter)
   *   3. If still empty, treat the STATE itself as the city level and load clubs
   *      directly from it — set cityFallback=true so we skip the city selector.
   */
  const fetchCityAssociations = useCallback(async (stateId: string) => {
    setIsLoadingAssociations(true);
    setCityFallback(false);
    try {
      // 1. Strict: level 3 children of this state
      const res1 = await fetch(`/api/admin/associations?level=3&parentId=${stateId}&status=active`);
      if (res1.ok) {
        const data1 = await res1.json();
        const strict: Association[] = data1.associations || [];
        if (strict.length > 0) {
          setCityAssociations(strict);
          return;
        }
      }

      // 2. Looser: any child association of this state (ignore level)
      const res2 = await fetch(`/api/admin/associations?parentId=${stateId}&status=active`);
      if (res2.ok) {
        const data2 = await res2.json();
        const loose: Association[] = data2.associations || [];
        if (loose.length > 0) {
          setCityAssociations(loose);
          return;
        }
      }

      // 3. Fallback: no city level exists — go straight to clubs under this state
      setCityAssociations([]);
      setCityFallback(true);
      fetchClubs(stateId);
    } catch (e) { console.error(e); }
    finally { setIsLoadingAssociations(false); }
  }, []);

  const fetchClubs = async (parentAssocId: string) => {
    setIsLoadingClubs(true);
    try {
      const res = await fetch(`/api/admin/clubs?parentAssociationId=${parentAssocId}&status=active`);
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingClubs(false); }
  };

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
    } catch (e) { console.error(e); }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/config/member-role");
      if (res.ok) setAvailableRoles(await res.json());
    } catch (e) { console.error(e); }
  };

  // ── Selection handlers — each resets downstream state ───────────────────────

  const handleNationalSelect = (assoc: Association) => {
    setSelectedNational(assoc.associationId);
    setNationalSearch(assoc.name);
    setNationalOpen(false);
    setSelectedSubNational(""); setSelectedState(""); setSelectedCity(""); setSelectedClub("");
    setSubNationalSearch(""); setStateSearch(""); setCitySearch(""); setClubSearch("");
    setSubNationalAssociations([]); setStateAssociations([]); setCityAssociations([]); setClubs([]);
    setMembershipTypes([]); setCityFallback(false);
    fetchSubNationalAssociations(assoc.associationId);
  };

  const handleSubNationalSelect = (assoc: Association) => {
    setSelectedSubNational(assoc.associationId);
    setSubNationalSearch(assoc.name);
    setSubNationalOpen(false);
    setSelectedState(""); setSelectedCity(""); setSelectedClub("");
    setStateSearch(""); setCitySearch(""); setClubSearch("");
    setStateAssociations([]); setCityAssociations([]); setClubs([]);
    setMembershipTypes([]); setCityFallback(false);
    fetchStateAssociations(assoc.associationId);
  };

  const handleStateSelect = (assoc: Association) => {
    setSelectedState(assoc.associationId);
    setStateSearch(assoc.name);
    setStateOpen(false);
    setSelectedCity(""); setSelectedClub("");
    setCitySearch(""); setClubSearch("");
    setCityAssociations([]); setClubs([]);
    setMembershipTypes([]); setCityFallback(false);
    fetchCityAssociations(assoc.associationId);
  };

  const handleCitySelect = (assoc: Association) => {
    setSelectedCity(assoc.associationId);
    setCitySearch(assoc.name);
    setCityOpen(false);
    setSelectedClub(""); setClubSearch(""); setClubs([]); setMembershipTypes([]);
    fetchClubs(assoc.associationId);
  };

  const handleClubSelect = (club: Club) => {
    setSelectedClub(club.id);
    setClubSearch(club.name);
    setClubOpen(false);
    if (onClubChange) onClubChange(club.id);
    onMembershipChange({ ...membershipData, clubId: club.id, clubName: club.name });
  };

  // ── Filter helpers ──────────────────────────────────────────────────────────

  const filteredNational    = nationalAssociations.filter((a) =>
    a.name.toLowerCase().includes(nationalSearch.toLowerCase()) ||
    (a.code || "").toLowerCase().includes(nationalSearch.toLowerCase()));

  const filteredSubNational = subNationalAssociations.filter((a) =>
    a.name.toLowerCase().includes(subNationalSearch.toLowerCase()) ||
    (a.code || "").toLowerCase().includes(subNationalSearch.toLowerCase()));

  const filteredState       = stateAssociations.filter((a) =>
    a.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    (a.code || "").toLowerCase().includes(stateSearch.toLowerCase()));

  const filteredCity        = cityAssociations.filter((a) =>
    a.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    (a.code || "").toLowerCase().includes(citySearch.toLowerCase()));

  const filteredClubs       = clubs.filter((c) =>
    c.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
    (c.shortName || "").toLowerCase().includes(clubSearch.toLowerCase()));

  // ── Misc ────────────────────────────────────────────────────────────────────

  const hasSubNational = subNationalAssociations.length > 0;
  const levelNum = (base: number) => (hasSubNational ? base + 1 : base);

  const toggleMembershipType = (typeId: string) => {
    const cur: string[] = membershipData.membershipTypes || [];
    onMembershipChange({
      ...membershipData,
      membershipTypes: cur.includes(typeId) ? cur.filter((id) => id !== typeId) : [...cur, typeId],
    });
  };

  const toggleRole = (roleId: string) => {
    onRolesChange(
      roles.includes(roleId) ? roles.filter((id) => id !== roleId) : [...roles, roleId],
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
          Follow the hierarchy to find your club:{" "}
          {hasSubNational
            ? "National → Sub-National → State → City → Club"
            : "National → State → City → Club"}
        </p>

        {/* Breadcrumb */}
        {(selectedNational || selectedState || selectedCity || selectedClub) && (
          <div className="mb-6 flex items-center gap-2 text-sm font-bold flex-wrap">
            {selectedNational    && <><span className="text-blue-600">{nationalSearch}</span>   {selectedState  && <ChevronRight size={14} className="text-slate-400" />}</>}
            {selectedSubNational && <><span className="text-purple-600">{subNationalSearch}</span>{selectedState && <ChevronRight size={14} className="text-slate-400" />}</>}
            {selectedState       && <><span className="text-blue-600">{stateSearch}</span>      {selectedCity   && <ChevronRight size={14} className="text-slate-400" />}</>}
            {selectedCity        && <><span className="text-blue-600">{citySearch}</span>       {selectedClub   && <ChevronRight size={14} className="text-slate-400" />}</>}
            {selectedClub        && <span className="text-green-600 font-black">{clubSearch}</span>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. National */}
          <TypeAheadSelect
            label="1. National Association *"
            placeholder="Search national association..."
            searchValue={nationalSearch}
            onSearchChange={setNationalSearch}
            options={filteredNational}
            onSelect={handleNationalSelect}
            isOpen={nationalOpen}
            setIsOpen={setNationalOpen}
            disabled={isLoadingAssociations}
            getKey={(a: Association) => a.associationId}
            renderOption={(a: Association) => (
              <div><div className="font-bold">{a.name}</div><div className="text-xs text-slate-500">{a.code}</div></div>
            )}
          />

          {/* 2. Sub-National (only when they exist) */}
          {hasSubNational && (
            <TypeAheadSelect
              label="2. Sub-National Body (Optional)"
              placeholder="Search sub-national body..."
              searchValue={subNationalSearch}
              onSearchChange={setSubNationalSearch}
              options={filteredSubNational}
              onSelect={handleSubNationalSelect}
              isOpen={subNationalOpen}
              setIsOpen={setSubNationalOpen}
              disabled={!selectedNational || isLoadingAssociations}
              getKey={(a: Association) => a.associationId}
              renderOption={(a: Association) => (
                <div><div className="font-bold">{a.name}</div><div className="text-xs text-slate-500">{a.code} · Masters / Indoor / etc.</div></div>
              )}
            />
          )}

          {/* State */}
          <TypeAheadSelect
            label={`${levelNum(2)}. State Association *`}
            placeholder={!selectedNational ? "Select national first..." : "Search state association..."}
            searchValue={stateSearch}
            onSearchChange={setStateSearch}
            options={filteredState}
            onSelect={handleStateSelect}
            isOpen={stateOpen}
            setIsOpen={setStateOpen}
            disabled={!selectedNational || isLoadingAssociations}
            getKey={(a: Association) => a.associationId}
            renderOption={(a: Association) => (
              <div><div className="font-bold">{a.name}</div><div className="text-xs text-slate-500">{a.code}</div></div>
            )}
          />

          {/* City/Region — hidden when state IS the city (fallback mode) */}
          {!cityFallback && (
            <TypeAheadSelect
              label={`${levelNum(3)}. City/Region Association *`}
              placeholder={!selectedState ? "Select state first..." : "Search city/region..."}
              searchValue={citySearch}
              onSearchChange={setCitySearch}
              options={filteredCity}
              onSelect={handleCitySelect}
              isOpen={cityOpen}
              setIsOpen={setCityOpen}
              disabled={!selectedState || isLoadingAssociations}
              getKey={(a: Association) => a.associationId}
              renderOption={(a: Association) => (
                <div><div className="font-bold">{a.name}</div><div className="text-xs text-slate-500">{a.code}</div></div>
              )}
            />
          )}

          {/* Club */}
          <TypeAheadSelect
            label={`${cityFallback ? levelNum(3) : levelNum(4)}. Club *`}
            placeholder={
              cityFallback
                ? !selectedState ? "Select state first..." : "Search club..."
                : !selectedCity  ? "Select city first..."  : "Search club..."
            }
            searchValue={clubSearch}
            onSearchChange={setClubSearch}
            options={filteredClubs}
            onSelect={handleClubSelect}
            isOpen={clubOpen}
            setIsOpen={setClubOpen}
            disabled={cityFallback ? !selectedState : !selectedCity || isLoadingClubs}
            getKey={(c: Club) => c.id}
            renderOption={(c: Club) => (
              <div><div className="font-bold">{c.name}</div><div className="text-xs text-slate-500">{c.shortName}</div></div>
            )}
          />
        </div>

        {/* Loading */}
        {(isLoadingAssociations || isLoadingClubs) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="font-bold">Loading options…</span>
          </div>
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
                <p className="text-xs font-black uppercase text-green-600">Selected Club</p>
                <p className="font-black text-slate-900 text-lg">{clubSearch}</p>
              </div>
            </div>
          </div>

          {/* Membership Types */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Membership Types * (Select at least one)
            </label>
            {errors.membershipTypes && (
              <p className="text-red-500 text-xs mb-2 font-bold">{errors.membershipTypes}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {membershipTypes.map((type) => {
                const id = type.typeId || type.id;
                const selected = (membershipData.membershipTypes || []).includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleMembershipType(id)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      selected ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-black text-slate-900">{type.name}</div>
                        <div className="text-sm text-slate-600 mt-1">{type.description}</div>
                        {type.annualFee && (
                          <div className="text-sm font-bold text-green-600 mt-2">${type.annualFee}/year</div>
                        )}
                      </div>
                      {selected && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
                      selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {role.icon && <span className="text-xl">{role.icon}</span>}
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900">{role.name}</div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
                onChange={(e) => onMembershipChange({ ...membershipData, joinDate: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Status</label>
              <select
                value={membershipData.status}
                onChange={(e) => onMembershipChange({ ...membershipData, status: e.target.value })}
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
