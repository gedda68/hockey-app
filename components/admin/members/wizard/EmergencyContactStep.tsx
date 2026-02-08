// components/admin/members/wizard/EmergencyContactStep.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, User, CheckCircle } from "lucide-react";

interface ConfigItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface MemberSearchResult {
  memberId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  mobile?: string;
  dateOfBirth: string;
}

export default function EmergencyContactStep({
  data,
  onChange,
  errors,
}: {
  data: any;
  onChange: (data: any) => void;
  errors: Record<string, string>;
}) {
  const [relationshipTypes, setRelationshipTypes] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Member search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchRelationshipTypes();
  }, []);

  const fetchRelationshipTypes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/relationship-type");
      if (res.ok) {
        const relationshipsData = await res.json();
        setRelationshipTypes(
          relationshipsData.filter((item: ConfigItem) => item.isActive),
        );
      }
    } catch (error) {
      console.error("Error fetching relationship types:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for members
  const searchMembers = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(
        `/api/admin/members?search=${encodeURIComponent(query)}&limit=10`,
      );
      if (res.ok) {
        const responseData = await res.json();
        const results = responseData.members.map((member: any) => ({
          memberId: member.memberId,
          firstName: member.personalInfo.firstName,
          lastName: member.personalInfo.lastName,
          displayName: member.personalInfo.displayName,
          email: member.contact.email,
          phone: member.contact.phone,
          mobile: member.contact.mobile,
          dateOfBirth: member.personalInfo.dateOfBirth,
        }));

        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error searching members:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle member selection from search
  const selectMember = (member: MemberSearchResult) => {
    onChange({
      ...data,
      name: member.displayName,
      phone: member.mobile || member.phone || "",
      email: member.email || "",
    });

    setSelectedMemberId(member.memberId);
    setSearchQuery("");
    setShowResults(false);
  };

  // Clear member selection
  const clearMemberSelection = () => {
    setSelectedMemberId(null);
    setSearchQuery("");
  };

  // Handle manual name input
  const handleNameChange = (value: string) => {
    onChange({ ...data, name: value });
    setSearchQuery(value);

    // Clear selected member if user types manually
    if (selectedMemberId) {
      setSelectedMemberId(null);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06054e]"></div>
          <p className="mt-2 text-slate-600 font-bold">
            Loading form options...
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-bold">
              ℹ️ Emergency contact information is required for all members. This
              person will be contacted in case of emergency.
            </p>
          </div>

          {/* Name Field with Type-Ahead Search */}
          <div className="relative">
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Emergency Contact Name *
            </label>

            {selectedMemberId ? (
              // Selected member display
              <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg">
                      {data.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-black flex items-center gap-1">
                        <CheckCircle size={12} />
                        MEMBER
                      </span>
                      <span className="text-xs text-slate-600">
                        ID: {selectedMemberId}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearMemberSelection}
                  className="text-sm text-blue-600 hover:text-blue-800 font-bold px-4 py-2 bg-white rounded-lg border border-blue-200"
                >
                  Change
                </button>
              </div>
            ) : (
              // Search input
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={data.name || ""}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    placeholder="Type name to search members or enter manually..."
                    className={`w-full p-3 pr-10 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                      errors.name ? "border-red-500" : "border-slate-200"
                    }`}
                  />
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                </div>

                {/* Loading indicator */}
                {isSearching && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <div className="p-2 bg-blue-50 border-b border-blue-200">
                      <p className="text-xs font-black text-blue-800 uppercase">
                        Found Members
                      </p>
                    </div>
                    {searchResults.map((result) => (
                      <button
                        key={result.memberId}
                        type="button"
                        onClick={() => selectMember(result)}
                        className="w-full p-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">
                                {result.displayName}
                              </p>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-black">
                                MEMBER
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Age: {calculateAge(result.dateOfBirth)} •{" "}
                              {result.email}
                              {result.mobile && ` • ${result.mobile}`}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold ml-2">
                            {result.memberId}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results / Non-member message */}
                {showResults &&
                  data.name &&
                  data.name.length >= 2 &&
                  !isSearching &&
                  searchResults.length === 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl p-4">
                      <p className="text-sm text-slate-600 font-bold">
                        ✓ No members found - contact will be saved as non-member
                      </p>
                    </div>
                  )}
              </div>
            )}

            {errors.name && (
              <p className="text-red-500 text-xs mt-1 font-bold">
                {errors.name}
              </p>
            )}

            <p className="text-xs text-slate-500 mt-1">
              {selectedMemberId
                ? "Contact details auto-filled from member profile"
                : "Search existing members or enter a non-member's details manually"}
            </p>
          </div>

          {/* Relationship */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Relationship to Member *
            </label>
            <select
              value={data.relationship || ""}
              onChange={(e) =>
                onChange({ ...data, relationship: e.target.value })
              }
              className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.relationship ? "border-red-500" : "border-slate-200"
              }`}
            >
              <option value="">Select relationship...</option>
              {relationshipTypes.map((rel) => (
                <option key={rel.id} value={rel.id}>
                  {rel.name}
                </option>
              ))}
            </select>
            {errors.relationship && (
              <p className="text-red-500 text-xs mt-1 font-bold">
                {errors.relationship}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Phone Number *
            </label>
            <input
              type="tel"
              value={data.phone || ""}
              onChange={(e) => onChange({ ...data, phone: e.target.value })}
              className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.phone ? "border-red-500" : "border-slate-200"
              }`}
              placeholder="04XX XXX XXX or 07 XXXX XXXX"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1 font-bold">
                {errors.phone}
              </p>
            )}
            {selectedMemberId && (
              <p className="text-xs text-green-600 mt-1 font-bold">
                ✓ Auto-filled from member profile
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              value={data.email || ""}
              onChange={(e) => onChange({ ...data, email: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              placeholder="emergency@example.com (optional)"
            />
            {selectedMemberId && data.email && (
              <p className="text-xs text-green-600 mt-1 font-bold">
                ✓ Auto-filled from member profile
              </p>
            )}
          </div>

          {/* Additional Info */}
          {selectedMemberId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <CheckCircle
                  className="text-green-600 flex-shrink-0 mt-0.5"
                  size={18}
                />
                <div>
                  <p className="font-bold text-green-800">
                    Linked to Club Member
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    This emergency contact is a member of the club. Their
                    contact details are automatically synchronized.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!selectedMemberId && data.name && data.name.length >= 2 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-bold">
                ℹ️ This emergency contact is not a club member. Their details
                are stored separately.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
