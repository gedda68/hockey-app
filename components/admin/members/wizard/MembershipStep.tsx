// components/admin/members/wizard/MembershipStep.tsx
"use client";

import { useState, useEffect } from "react";
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
  // Association hierarchy state
  const [nationalAssociations, setNationalAssociations] = useState<
    Association[]
  >([]);
  const [subNationalAssociations, setSubNationalAssociations] = useState<
    Association[]
  >([]);
  const [stateAssociations, setStateAssociations] = useState<Association[]>([]);
  const [cityAssociations, setCityAssociations] = useState<Association[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  const [selectedNational, setSelectedNational] = useState<string>("");
  const [selectedSubNational, setSelectedSubNational] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedClub, setSelectedClub] = useState<string>("");

  // Type-ahead search states
  const [nationalSearch, setNationalSearch] = useState("");
  const [subNationalSearch, setSubNationalSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");

  // Dropdown open states
  const [nationalOpen, setNationalOpen] = useState(false);
  const [subNationalOpen, setSubNationalOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);

  const [isLoadingAssociations, setIsLoadingAssociations] = useState(false);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);

  // Membership types and roles
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  // Load national associations on mount
  useEffect(() => {
    fetchNationalAssociations();
  }, []);

  // Fetch level 0 (National) associations
  const fetchNationalAssociations = async () => {
    setIsLoadingAssociations(true);
    try {
      const res = await fetch("/api/admin/associations?level=0&status=active");
      if (res.ok) {
        const data = await res.json();
        const assocs = data.associations || [];
        setNationalAssociations(assocs);
        console.log(
          "🏆 Loaded national associations (Level 0):",
          assocs.length,
          assocs,
        );
      } else {
        console.error(
          "Failed to fetch national associations:",
          await res.text(),
        );
      }
    } catch (error) {
      console.error("Error fetching national associations:", error);
    } finally {
      setIsLoadingAssociations(false);
    }
  };

  // Fetch level 1 (Sub-National) associations - Masters, Indoor, etc.
  // If none exist, automatically fetch Level 2 with national as parent
  const fetchSubNationalAssociations = async (nationalId: string) => {
    setIsLoadingAssociations(true);
    try {
      // Try to find Level 1 associations
      const res = await fetch(
        `/api/admin/associations?level=1&parentId=${nationalId}&status=active`,
      );
      if (res.ok) {
        const data = await res.json();
        const assocs = data.associations || [];
        setSubNationalAssociations(assocs);
        console.log(
          "🎯 Loaded sub-national associations (Level 1):",
          assocs.length,
          assocs,
        );

        // If no level 1 associations exist, check for Level 2 with national parent
        if (assocs.length === 0) {
          console.log(
            "⏩ No Level 1 associations, checking Level 2 with national parent...",
          );
          fetchStateAssociations(nationalId);
        }
      } else {
        console.error(
          "Failed to fetch sub-national associations:",
          await res.text(),
        );
      }
    } catch (error) {
      console.error("Error fetching sub-national associations:", error);
    } finally {
      setIsLoadingAssociations(false);
    }
  };

  // Fetch level 2 (State) associations
  const fetchStateAssociations = async (parentId: string) => {
    setIsLoadingAssociations(true);
    try {
      const res = await fetch(
        `/api/admin/associations?level=2&parentId=${parentId}&status=active`,
      );
      if (res.ok) {
        const data = await res.json();
        const assocs = data.associations || [];
        setStateAssociations(assocs);
        console.log(
          "🏛️ Loaded state associations (Level 2):",
          assocs.length,
          assocs,
        );
      } else {
        console.error("Failed to fetch state associations:", await res.text());
      }
    } catch (error) {
      console.error("Error fetching state associations:", error);
    } finally {
      setIsLoadingAssociations(false);
    }
  };

  // Fetch level 3 (City) associations
  const fetchCityAssociations = async (stateId: string) => {
    setIsLoadingAssociations(true);
    try {
      const res = await fetch(
        `/api/admin/associations?level=3&parentId=${stateId}&status=active`,
      );
      if (res.ok) {
        const data = await res.json();
        const assocs = data.associations || [];
        setCityAssociations(assocs);
        console.log(
          "🏙️ Loaded city associations (Level 3):",
          assocs.length,
          assocs,
        );
      } else {
        console.error("Failed to fetch city associations:", await res.text());
      }
    } catch (error) {
      console.error("Error fetching city associations:", error);
    } finally {
      setIsLoadingAssociations(false);
    }
  };

  // Fetch clubs when city is selected
  const fetchClubs = async (cityAssociationId: string) => {
    setIsLoadingClubs(true);
    try {
      const res = await fetch(
        `/api/admin/clubs?parentAssociationId=${cityAssociationId}&status=active`,
      );
      if (res.ok) {
        const data = await res.json();
        const clubsList = data.clubs || [];
        setClubs(clubsList);
        console.log("🏛️ Loaded clubs:", clubsList.length, clubsList);
      } else {
        console.error("Failed to fetch clubs:", await res.text());
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setIsLoadingClubs(false);
    }
  };

  // Fetch membership types and roles when club is selected
  useEffect(() => {
    if (selectedClub) {
      fetchMembershipTypes();
      fetchRoles();
    }
  }, [selectedClub]);

  const fetchMembershipTypes = async () => {
    try {
      const res = await fetch("/api/admin/config/membership-type");
      if (res.ok) {
        const data = await res.json();
        setMembershipTypes(data);
      }
    } catch (error) {
      console.error("Error fetching membership types:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/config/member-role");
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  // Handle national association selection
  const handleNationalSelect = (assoc: Association) => {
    setSelectedNational(assoc.associationId);
    setNationalSearch(assoc.name);
    setNationalOpen(false);

    // Reset all downstream selections
    setSelectedSubNational("");
    setSelectedState("");
    setSelectedCity("");
    setSelectedClub("");
    setSubNationalSearch("");
    setStateSearch("");
    setCitySearch("");
    setClubSearch("");
    setSubNationalAssociations([]);
    setStateAssociations([]);
    setCityAssociations([]);
    setClubs([]);
    setMembershipTypes([]);

    // Check for level 1 (sub-national) associations
    fetchSubNationalAssociations(assoc.associationId);
  };

  // Handle sub-national association selection (Level 1)
  const handleSubNationalSelect = (assoc: Association) => {
    setSelectedSubNational(assoc.associationId);
    setSubNationalSearch(assoc.name);
    setSubNationalOpen(false);

    // Reset downstream selections
    setSelectedState("");
    setSelectedCity("");
    setSelectedClub("");
    setStateSearch("");
    setCitySearch("");
    setClubSearch("");
    setStateAssociations([]);
    setCityAssociations([]);
    setClubs([]);
    setMembershipTypes([]);

    fetchStateAssociations(assoc.associationId);
  };

  // Handle state association selection (Level 2)
  const handleStateSelect = (assoc: Association) => {
    setSelectedState(assoc.associationId);
    setStateSearch(assoc.name);
    setStateOpen(false);

    // Reset downstream selections
    setSelectedCity("");
    setSelectedClub("");
    setCitySearch("");
    setClubSearch("");
    setCityAssociations([]);
    setClubs([]);
    setMembershipTypes([]);

    fetchCityAssociations(assoc.associationId);
  };

  // Handle city association selection (Level 3)
  const handleCitySelect = (assoc: Association) => {
    setSelectedCity(assoc.associationId);
    setCitySearch(assoc.name);
    setCityOpen(false);

    // Reset club selection
    setSelectedClub("");
    setClubSearch("");
    setClubs([]);
    setMembershipTypes([]);

    fetchClubs(assoc.associationId);
  };

  // Handle club selection
  const handleClubSelect = (club: Club) => {
    setSelectedClub(club.id);
    setClubSearch(club.name);
    setClubOpen(false);

    if (onClubChange) {
      onClubChange(club.id);
    }

    // Update the whole membership object to include the name for display purposes
    onMembershipChange({
      ...membershipData,
      clubId: club.id,
      clubName: club.name, // Store the name for the Review Step
    });
  };

  // Filter functions for type-ahead
  const filteredNational = nationalAssociations.filter(
    (a) =>
      a.name.toLowerCase().includes(nationalSearch.toLowerCase()) ||
      a.code.toLowerCase().includes(nationalSearch.toLowerCase()),
  );

  const filteredSubNational = subNationalAssociations.filter(
    (a) =>
      a.name.toLowerCase().includes(subNationalSearch.toLowerCase()) ||
      a.code.toLowerCase().includes(subNationalSearch.toLowerCase()),
  );

  const filteredState = stateAssociations.filter(
    (a) =>
      a.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
      a.code.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  const filteredCity = cityAssociations.filter(
    (a) =>
      a.name.toLowerCase().includes(citySearch.toLowerCase()) ||
      a.code.toLowerCase().includes(citySearch.toLowerCase()),
  );

  const filteredClubs = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
      c.shortName.toLowerCase().includes(clubSearch.toLowerCase()),
  );

  const toggleMembershipType = (typeId: string) => {
    const newTypes = membershipData.membershipTypes.includes(typeId)
      ? membershipData.membershipTypes.filter((id: string) => id !== typeId)
      : [...membershipData.membershipTypes, typeId];

    onMembershipChange({ ...membershipData, membershipTypes: newTypes });
  };

  const toggleRole = (roleId: string) => {
    const newRoles = roles.includes(roleId)
      ? roles.filter((id) => id !== roleId)
      : [...roles, roleId];

    onRolesChange(newRoles);
  };

  // Type-ahead select component
  const TypeAheadSelect = ({
    label,
    placeholder,
    value,
    searchValue,
    onSearchChange,
    options,
    onSelect,
    isOpen,
    setIsOpen,
    disabled,
    renderOption,
  }: any) => (
    <div className="relative">
      <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-3 pr-10 bg-white border-2 border-slate-300 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />
      </div>

      {isOpen && !disabled && options.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {options.map((option: any) => (
            <button
              key={option.associationId || option.id}
              type="button"
              onClick={() => onSelect(option)}
              className="w-full p-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
            >
              {renderOption(option)}
            </button>
          ))}
        </div>
      )}

      {isOpen && !disabled && searchValue && options.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl p-4 text-center text-slate-500">
          No results found
        </div>
      )}
    </div>
  );

  // Determine hierarchy display
  const getHierarchyText = () => {
    if (subNationalAssociations.length > 0) {
      return "National → Sub-National → State → City → Club";
    }
    return "National → State → City → Club";
  };

  return (
    <div className="space-y-8">
      {/* Association Hierarchy Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="text-blue-600" size={20} />
          Select Your Association & Club
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Follow the hierarchy to find your club: {getHierarchyText()}
        </p>

        {/* Breadcrumb */}
        {(selectedNational ||
          selectedSubNational ||
          selectedState ||
          selectedCity ||
          selectedClub) && (
          <div className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-600 flex-wrap">
            {selectedNational && (
              <>
                <span className="text-blue-600">{nationalSearch}</span>
                {(selectedSubNational || selectedState) && (
                  <ChevronRight size={16} />
                )}
              </>
            )}
            {selectedSubNational && (
              <>
                <span className="text-purple-600">{subNationalSearch}</span>
                {selectedState && <ChevronRight size={16} />}
              </>
            )}
            {selectedState && (
              <>
                <span className="text-blue-600">{stateSearch}</span>
                {selectedCity && <ChevronRight size={16} />}
              </>
            )}
            {selectedCity && (
              <>
                <span className="text-blue-600">{citySearch}</span>
                {selectedClub && <ChevronRight size={16} />}
              </>
            )}
            {selectedClub && (
              <span className="text-green-600 font-black">{clubSearch}</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* National Association (Level 0) */}
          <TypeAheadSelect
            label="1. National Association *"
            placeholder="Search national association..."
            value={selectedNational}
            searchValue={nationalSearch}
            onSearchChange={setNationalSearch}
            options={filteredNational}
            onSelect={handleNationalSelect}
            isOpen={nationalOpen}
            setIsOpen={setNationalOpen}
            disabled={isLoadingAssociations}
            renderOption={(assoc: Association) => (
              <div>
                <div className="font-bold">{assoc.name}</div>
                <div className="text-xs text-slate-500">{assoc.code}</div>
              </div>
            )}
          />

          {/* Sub-National Association (Level 1) - Only show if they exist */}
          {subNationalAssociations.length > 0 && (
            <TypeAheadSelect
              label="2. Sub-National Body (Optional)"
              placeholder="Search sub-national body..."
              value={selectedSubNational}
              searchValue={subNationalSearch}
              onSearchChange={setSubNationalSearch}
              options={filteredSubNational}
              onSelect={handleSubNationalSelect}
              isOpen={subNationalOpen}
              setIsOpen={setSubNationalOpen}
              disabled={!selectedNational || isLoadingAssociations}
              renderOption={(assoc: Association) => (
                <div>
                  <div className="font-bold">{assoc.name}</div>
                  <div className="text-xs text-slate-500">
                    {assoc.code} • Masters/Indoor/etc.
                  </div>
                </div>
              )}
            />
          )}

          {/* State Association (Level 2) */}
          <TypeAheadSelect
            label={`${subNationalAssociations.length > 0 ? "3" : "2"}. State Association *`}
            placeholder={
              !selectedNational
                ? "Select national first..."
                : subNationalAssociations.length > 0 && !selectedSubNational
                  ? "Select sub-national or state..."
                  : "Search state association..."
            }
            value={selectedState}
            searchValue={stateSearch}
            onSearchChange={setStateSearch}
            options={filteredState}
            onSelect={handleStateSelect}
            isOpen={stateOpen}
            setIsOpen={setStateOpen}
            disabled={
              !selectedNational ||
              (subNationalAssociations.length > 0 &&
                !selectedSubNational &&
                stateAssociations.length === 0) ||
              isLoadingAssociations
            }
            renderOption={(assoc: Association) => (
              <div>
                <div className="font-bold">{assoc.name}</div>
                <div className="text-xs text-slate-500">{assoc.code}</div>
              </div>
            )}
          />

          {/* City Association (Level 3) */}
          <TypeAheadSelect
            label={`${subNationalAssociations.length > 0 ? "4" : "3"}. City/Region Association *`}
            placeholder={
              !selectedState ? "Select state first..." : "Search city/region..."
            }
            value={selectedCity}
            searchValue={citySearch}
            onSearchChange={setCitySearch}
            options={filteredCity}
            onSelect={handleCitySelect}
            isOpen={cityOpen}
            setIsOpen={setCityOpen}
            disabled={!selectedState || isLoadingAssociations}
            renderOption={(assoc: Association) => (
              <div>
                <div className="font-bold">{assoc.name}</div>
                <div className="text-xs text-slate-500">{assoc.code}</div>
              </div>
            )}
          />

          {/* Club */}
          <TypeAheadSelect
            label={`${subNationalAssociations.length > 0 ? "5" : "4"}. Club *`}
            placeholder={
              !selectedCity ? "Select city first..." : "Search club..."
            }
            value={selectedClub}
            searchValue={clubSearch}
            onSearchChange={setClubSearch}
            options={filteredClubs}
            onSelect={handleClubSelect}
            isOpen={clubOpen}
            setIsOpen={setClubOpen}
            disabled={!selectedCity || isLoadingClubs}
            renderOption={(club: Club) => (
              <div key={club.id}>
                <div className="font-bold">{club.name}</div>
                <div className="text-xs text-slate-500">{club.shortName}</div>
              </div>
            )}
          />
        </div>

        {/* Loading indicator */}
        {(isLoadingAssociations || isLoadingClubs) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="font-bold">Loading options...</span>
          </div>
        )}
      </div>

      {/* Only show membership types if club is selected */}
      {selectedClub && (
        <>
          {/* Selected Club Display */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Building2 className="text-green-600" size={24} />
              <div>
                <p className="text-xs font-black uppercase text-green-600">
                  Selected Club
                </p>
                <p className="font-black text-slate-900 text-lg">
                  {clubSearch}
                </p>
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
              {membershipTypes.map((type) => (
                <button
                  key={type.typeId || type.id}
                  type="button"
                  onClick={() => toggleMembershipType(type.typeId || type.id)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    membershipData.membershipTypes.includes(
                      type.typeId || type.id,
                    )
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
                    {membershipData.membershipTypes.includes(
                      type.typeId || type.id,
                    ) && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
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
              ))}
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Roles (optional)
            </label>
            <div className="grid grid-cols-3 gap-4">
              {availableRoles.map((role) => (
                <button
                  key={role.roleId || role.id}
                  type="button"
                  onClick={() => toggleRole(role.roleId || role.id)}
                  className={`p-3 border-2 rounded-xl text-left transition-all ${
                    roles.includes(role.roleId || role.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {role.icon && <span className="text-xl">{role.icon}</span>}
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">
                        {role.name}
                      </div>
                    </div>
                    {roles.includes(role.roleId || role.id) && (
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
              ))}
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

      {/* Helpful message when no club selected */}
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
