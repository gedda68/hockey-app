// components/admin/members/wizard/PersonalInfoStep.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  X,
  Users,
  Search,
  User,
  Upload,
  Camera,
  Loader2,
} from "lucide-react";
import Image from "next/image";

interface ConfigItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface RelatedMember {
  id: string;
  memberId?: string;
  name: string;
  relationshipType: string;
}

interface MemberSearchResult {
  memberId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
}

export default function PersonalInfoStep({
  data,
  onChange,
  errors,
}: {
  data: any;
  onChange: (data: any) => void;
  errors: Record<string, string>;
}) {
  const [salutations, setSalutations] = useState<ConfigItem[]>([]);
  const [genders, setGenders] = useState<ConfigItem[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member search state
  const [memberSearchQuery, setMemberSearchQuery] = useState<
    Record<string, string>
  >({});
  const [memberSearchResults, setMemberSearchResults] = useState<
    Record<string, MemberSearchResult[]>
  >({});
  const [searchingMembers, setSearchingMembers] = useState<
    Record<string, boolean>
  >({});
  const [showSearchResults, setShowSearchResults] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setIsLoading(true);
    try {
      const [salutationsRes, gendersRes, relationshipsRes] = await Promise.all([
        fetch("/api/admin/config/salutation"),
        fetch("/api/admin/config/gender"),
        fetch("/api/admin/config/relationship-type"),
      ]);

      if (salutationsRes.ok) {
        const salutationsData = await salutationsRes.json();
        setSalutations(
          salutationsData.filter((item: ConfigItem) => item.isActive),
        );
      }

      if (gendersRes.ok) {
        const gendersData = await gendersRes.json();
        setGenders(gendersData.filter((item: ConfigItem) => item.isActive));
      }

      if (relationshipsRes.ok) {
        const relationshipsData = await relationshipsRes.json();
        setRelationshipTypes(
          relationshipsData.filter((item: ConfigItem) => item.isActive),
        );
      }
    } catch (error) {
      console.error("Error fetching config data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PHOTO UPLOAD HANDLERS
  // ============================================

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "member-photos");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const responseData = await response.json();
      onChange({ ...data, photoUrl: responseData.url });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    onChange({ ...data, photoUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateAvatar = () => {
    const displayName =
      data.displayName ||
      `${data.firstName || ""} ${data.lastName || ""}`.trim();
    if (!displayName) {
      alert("Please enter a name first");
      return;
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=400&background=06054e&color=fff&bold=true&format=png`;
    onChange({ ...data, photoUrl: avatarUrl });
  };

  // ============================================
  // MEMBER SEARCH HANDLERS
  // ============================================

  const searchMembers = async (memberId: string, query: string) => {
    if (!query || query.trim().length < 2) {
      setMemberSearchResults((prev) => ({ ...prev, [memberId]: [] }));
      setShowSearchResults((prev) => ({ ...prev, [memberId]: false }));
      return;
    }

    setSearchingMembers((prev) => ({ ...prev, [memberId]: true }));

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
          dateOfBirth: member.personalInfo.dateOfBirth,
        }));

        setMemberSearchResults((prev) => ({ ...prev, [memberId]: results }));
        setShowSearchResults((prev) => ({ ...prev, [memberId]: true }));
      }
    } catch (error) {
      console.error("Error searching members:", error);
    } finally {
      setSearchingMembers((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  // Debounced search
  useEffect(() => {
    const timers: Record<string, NodeJS.Timeout> = {};

    Object.entries(memberSearchQuery).forEach(([memberId, query]) => {
      timers[memberId] = setTimeout(() => {
        searchMembers(memberId, query);
      }, 300);
    });

    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, [memberSearchQuery]);

  // ============================================
  // RELATED MEMBERS HANDLERS
  // ============================================

  const addRelatedMember = () => {
    const newMember: RelatedMember = {
      id: `temp-${Date.now()}`,
      name: "",
      relationshipType: "",
    };

    const relatedMembers = data.relatedMembers || [];
    onChange({
      ...data,
      relatedMembers: [...relatedMembers, newMember],
    });
  };

  const selectMemberFromSearch = (
    relatedMemberId: string,
    member: MemberSearchResult,
  ) => {
    const relatedMembers = (data.relatedMembers || []).map(
      (m: RelatedMember) =>
        m.id === relatedMemberId
          ? {
              ...m,
              memberId: member.memberId,
              name: member.displayName,
            }
          : m,
    );

    onChange({ ...data, relatedMembers });
    setMemberSearchQuery((prev) => ({ ...prev, [relatedMemberId]: "" }));
    setShowSearchResults((prev) => ({ ...prev, [relatedMemberId]: false }));
  };

  const updateRelatedMember = (id: string, field: string, value: string) => {
    const relatedMembers = (data.relatedMembers || []).map(
      (member: RelatedMember) =>
        member.id === id ? { ...member, [field]: value } : member,
    );
    onChange({ ...data, relatedMembers });

    if (field === "name") {
      setMemberSearchQuery((prev) => ({ ...prev, [id]: value }));
    }
  };

  const removeRelatedMember = (id: string) => {
    const relatedMembers = (data.relatedMembers || []).filter(
      (member: RelatedMember) => member.id !== id,
    );
    onChange({ ...data, relatedMembers });

    // Clean up search state
    setMemberSearchQuery((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setMemberSearchResults((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setShowSearchResults((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const clearMemberSelection = (id: string) => {
    const relatedMembers = (data.relatedMembers || []).map(
      (member: RelatedMember) =>
        member.id === id
          ? { ...member, memberId: undefined, name: "" }
          : member,
    );
    onChange({ ...data, relatedMembers });
    setMemberSearchQuery((prev) => ({ ...prev, [id]: "" }));
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
          {/* ============================================ */}
          {/* PHOTO UPLOAD SECTION */}
          {/* ============================================ */}

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
              <Camera className="text-blue-600" size={20} />
              Member Photo
            </h3>

            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Photo Preview */}
              <div className="relative">
                {data.photoUrl ? (
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl">
                      <Image
                        src={data.photoUrl}
                        alt={data.displayName || "Member photo"}
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110"
                      title="Remove photo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-200 border-4 border-dashed border-slate-300 flex items-center justify-center">
                    <User className="text-slate-400" size={48} />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {data.photoUrl ? "Change Photo" : "Upload Photo"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
                >
                  <User size={18} />
                  Generate Avatar
                </button>

                <p className="text-xs text-slate-600 text-center">
                  JPG, PNG up to 5MB • Square format recommended
                </p>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* NAME FIELDS */}
          {/* ============================================ */}

          <div className="grid grid-cols-2 gap-6">
            {/* Salutation */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Salutation
              </label>
              <select
                value={data.salutation || ""}
                onChange={(e) =>
                  onChange({ ...data, salutation: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              >
                <option value="">Select...</option>
                {salutations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Gender *
              </label>
              <select
                value={data.gender || ""}
                onChange={(e) => onChange({ ...data, gender: e.target.value })}
                className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                  errors.gender ? "border-red-500" : "border-slate-200"
                }`}
              >
                <option value="">Select...</option>
                {genders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1 font-bold">
                  {errors.gender}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* First Name */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                First Name *
              </label>
              <input
                type="text"
                value={data.firstName || ""}
                onChange={(e) =>
                  onChange({ ...data, firstName: e.target.value })
                }
                className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                  errors.firstName ? "border-red-500" : "border-slate-200"
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1 font-bold">
                  {errors.firstName}
                </p>
              )}
            </div>

            {/* Middle Name */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Middle Name
              </label>
              <input
                type="text"
                value={data.middleName || ""}
                onChange={(e) =>
                  onChange({ ...data, middleName: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                placeholder="Optional"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Last Name *
              </label>
              <input
                type="text"
                value={data.lastName || ""}
                onChange={(e) =>
                  onChange({ ...data, lastName: e.target.value })
                }
                className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                  errors.lastName ? "border-red-500" : "border-slate-200"
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1 font-bold">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={data.displayName || ""}
              onChange={(e) =>
                onChange({ ...data, displayName: e.target.value })
              }
              placeholder={
                data.firstName && data.lastName
                  ? data.middleName
                    ? `${data.firstName} ${data.middleName} ${data.lastName}`
                    : `${data.firstName} ${data.lastName}`
                  : "Auto-generated from name"
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave blank to auto-generate
            </p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Date of Birth *
            </label>
            <input
              type="date"
              value={data.dateOfBirth || ""}
              onChange={(e) =>
                onChange({ ...data, dateOfBirth: e.target.value })
              }
              className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.dateOfBirth ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.dateOfBirth && (
              <p className="text-red-500 text-xs mt-1 font-bold">
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          {/* ============================================ */}
          {/* RELATED MEMBERS SECTION */}
          {/* ============================================ */}

          <div className="border-t pt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                <div>
                  <h3 className="font-black text-slate-900">Related Members</h3>
                  <p className="text-xs text-slate-500">
                    Search and link family members or other related members
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addRelatedMember}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Related Member
              </button>
            </div>

            {data.relatedMembers && data.relatedMembers.length > 0 ? (
              <div className="space-y-4">
                {data.relatedMembers.map((member: RelatedMember) => (
                  <div
                    key={member.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-4">
                        {/* Member Search/Selection */}
                        <div className="relative">
                          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                            Search Member
                          </label>

                          {member.memberId ? (
                            // Selected member display
                            <div className="flex items-center justify-between p-3 bg-green-50 border-2 border-green-500 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                  <User className="text-white" size={20} />
                                </div>
                                <div>
                                  <p className="font-black text-slate-900">
                                    {member.name}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    Member ID: {member.memberId}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => clearMemberSelection(member.id)}
                                className="text-sm text-red-600 hover:text-red-800 font-bold"
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
                                  value={member.name}
                                  onChange={(e) =>
                                    updateRelatedMember(
                                      member.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  onFocus={() =>
                                    setShowSearchResults((prev) => ({
                                      ...prev,
                                      [member.id]: true,
                                    }))
                                  }
                                  placeholder="Type name to search existing members..."
                                  className="w-full p-3 pr-10 bg-white border border-slate-300 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                                />
                                <Search
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  size={20}
                                />
                              </div>

                              {/* Search Results Dropdown */}
                              {showSearchResults[member.id] &&
                                memberSearchResults[member.id] &&
                                memberSearchResults[member.id].length > 0 && (
                                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                    {memberSearchResults[member.id].map(
                                      (result) => (
                                        <button
                                          key={result.memberId}
                                          type="button"
                                          onClick={() =>
                                            selectMemberFromSearch(
                                              member.id,
                                              result,
                                            )
                                          }
                                          className="w-full p-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-bold text-slate-900">
                                                {result.displayName}
                                              </p>
                                              <p className="text-xs text-slate-500">
                                                {result.firstName}{" "}
                                                {result.lastName} • Age:{" "}
                                                {calculateAge(
                                                  result.dateOfBirth,
                                                )}
                                              </p>
                                            </div>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                              {result.memberId}
                                            </span>
                                          </div>
                                        </button>
                                      ),
                                    )}
                                  </div>
                                )}

                              {/* Loading indicator */}
                              {searchingMembers[member.id] && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                              )}

                              {/* No results message */}
                              {showSearchResults[member.id] &&
                                member.name &&
                                member.name.length >= 2 &&
                                !searchingMembers[member.id] &&
                                (!memberSearchResults[member.id] ||
                                  memberSearchResults[member.id].length ===
                                    0) && (
                                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl p-4 text-center">
                                    <p className="text-sm text-slate-600">
                                      No members found. Name will be saved as
                                      non-member relation.
                                    </p>
                                  </div>
                                )}
                            </div>
                          )}

                          <p className="text-xs text-slate-500 mt-1">
                            Search by first name, last name, or member ID
                          </p>
                        </div>

                        {/* Relationship Type */}
                        <div>
                          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                            Relationship *
                          </label>
                          <select
                            value={member.relationshipType}
                            onChange={(e) =>
                              updateRelatedMember(
                                member.id,
                                "relationshipType",
                                e.target.value,
                              )
                            }
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                          >
                            <option value="">Select relationship...</option>
                            {relationshipTypes.map((rel) => (
                              <option key={rel.id} value={rel.id}>
                                {rel.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeRelatedMember(member.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-8"
                        title="Remove"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                <Users className="mx-auto mb-2 text-slate-400" size={32} />
                <p className="text-slate-600 font-bold">
                  No related members added
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Add Related Member" to search and link family members
                </p>
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-800 font-bold">
                <strong>💡 Tip:</strong> Type the name of an existing member to
                search and link them. If the person isn't a member yet, their
                name will still be saved.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
