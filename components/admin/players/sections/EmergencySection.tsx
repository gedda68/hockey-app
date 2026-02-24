// sections/EmergencySection.tsx
// FIXED: Uses correct database fields (typeId, forward, reverse, category)

"use client";

import { useState, useEffect } from "react";
import {
  BaseSectionProps,
  EmergencyContact,
  Guardian,
  isMinor,
} from "../types/player.types";
import {
  AlertCircle,
  Plus,
  Trash2,
  UserPlus,
  Shield,
  Search,
  Loader2,
  X,
  CheckCircle,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

interface MemberSearchResult {
  memberId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
}

interface RelationshipType {
  _id?: string;
  typeId: string; // ← Database uses typeId
  forward: string; // ← Display field is "forward"
  reverse: string; // ← Reverse relationship
  category: string;
  isActive: boolean;
  displayOrder: number;
}

export default function EmergencySection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const playerIsMinor = formData.dateOfBirth
    ? isMinor(formData.dateOfBirth)
    : false;

  const [searchingContact, setSearchingContact] = useState<string | null>(null);
  const [searchingGuardian, setSearchingGuardian] = useState<string | null>(
    null,
  );
  const [contactSearchResults, setContactSearchResults] = useState<
    Record<string, MemberSearchResult[]>
  >({});
  const [guardianSearchResults, setGuardianSearchResults] = useState<
    Record<string, MemberSearchResult[]>
  >({});
  const [relationships, setRelationships] = useState<RelationshipType[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(true);
  const [relationshipSearch, setRelationshipSearch] = useState<
    Record<string, string>
  >({});

  // Fetch relationships from database
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        console.log("📋 Fetching relationships from database...");
        const res = await fetch("/api/admin/relationship-types");

        if (res.ok) {
          const data = await res.json();
          const relationshipTypes =
            data.relationshipTypes || data.relationships || data || [];

          console.log(
            `✅ Loaded ${relationshipTypes.length} relationship types`,
          );
          console.log("📦 Sample relationship:", relationshipTypes[0]);

          // Filter only active relationships and sort by displayOrder
          const activeRelationships = relationshipTypes
            .filter((rel: any) => rel.isActive !== false)
            .sort(
              (a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0),
            );

          setRelationships(activeRelationships);
        } else {
          console.warn("⚠️ Could not load relationships, using fallback");
          setRelationships([
            {
              typeId: "parent",
              forward: "Parent",
              reverse: "Child",
              category: "family",
              isActive: true,
              displayOrder: 1,
            },
            {
              typeId: "mother",
              forward: "Mother",
              reverse: "Child",
              category: "family",
              isActive: true,
              displayOrder: 2,
            },
            {
              typeId: "father",
              forward: "Father",
              reverse: "Child",
              category: "family",
              isActive: true,
              displayOrder: 3,
            },
            {
              typeId: "guardian",
              forward: "Guardian",
              reverse: "Ward",
              category: "family",
              isActive: true,
              displayOrder: 4,
            },
            {
              typeId: "sibling",
              forward: "Sibling",
              reverse: "Sibling",
              category: "family",
              isActive: true,
              displayOrder: 5,
            },
            {
              typeId: "friend",
              forward: "Friend",
              reverse: "Friend",
              category: "other",
              isActive: true,
              displayOrder: 10,
            },
            {
              typeId: "other",
              forward: "Other",
              reverse: "Other",
              category: "other",
              isActive: true,
              displayOrder: 99,
            },
          ]);
        }
      } catch (error) {
        console.error("❌ Error loading relationships:", error);
        setRelationships([
          {
            typeId: "parent",
            forward: "Parent",
            reverse: "Child",
            category: "family",
            isActive: true,
            displayOrder: 1,
          },
          {
            typeId: "other",
            forward: "Other",
            reverse: "Other",
            category: "other",
            isActive: true,
            displayOrder: 99,
          },
        ]);
      } finally {
        setLoadingRelationships(false);
      }
    };

    fetchRelationships();
  }, []);

  // Filter relationships based on search - FIXED to use forward field
  const getFilteredRelationships = (searchTerm: string) => {
    if (!searchTerm) return relationships;
    const lower = searchTerm.toLowerCase();
    return relationships.filter(
      (rel) =>
        (rel.forward?.toLowerCase() || "").includes(lower) ||
        (rel.reverse?.toLowerCase() || "").includes(lower) ||
        (rel.category?.toLowerCase() || "").includes(lower),
    );
  };

  // Emergency Contacts Management
  const addEmergencyContact = () => {
    const newContact: EmergencyContact = {
      id: `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      relationship: "",
      phone: "",
      email: "",
    };
    onChange("emergencyContacts", [...formData.emergencyContacts, newContact]);
  };

  const removeEmergencyContact = (id: string) => {
    onChange(
      "emergencyContacts",
      formData.emergencyContacts.filter((c) => c.id !== id),
    );
    const newResults = { ...contactSearchResults };
    delete newResults[id];
    setContactSearchResults(newResults);
    const newSearch = { ...relationshipSearch };
    delete newSearch[`contact-${id}`];
    setRelationshipSearch(newSearch);
  };

  const updateEmergencyContact = (
    id: string,
    field: keyof EmergencyContact,
    value: string,
  ) => {
    onChange(
      "emergencyContacts",
      formData.emergencyContacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    );
  };

  // Guardians Management
  const addGuardian = () => {
    const newGuardian: Guardian = {
      id: `guardian-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      relationship: "",
      phone: "",
      email: "",
      isPrimary: formData.guardians.length === 0,
    };
    onChange("guardians", [...formData.guardians, newGuardian]);
  };

  const removeGuardian = (id: string) => {
    onChange(
      "guardians",
      formData.guardians.filter((g) => g.id !== id),
    );
    const newResults = { ...guardianSearchResults };
    delete newResults[id];
    setGuardianSearchResults(newResults);
    const newSearch = { ...relationshipSearch };
    delete newSearch[`guardian-${id}`];
    setRelationshipSearch(newSearch);
  };

  const updateGuardian = (id: string, field: keyof Guardian, value: any) => {
    onChange(
      "guardians",
      formData.guardians.map((g) =>
        g.id === id ? { ...g, [field]: value } : g,
      ),
    );
  };

  const setPrimaryGuardian = (id: string) => {
    onChange(
      "guardians",
      formData.guardians.map((g) => ({
        ...g,
        isPrimary: g.id === id,
      })),
    );
  };

  // Search members for emergency contact
  const searchMemberForContact = async (contactId: string, name: string) => {
    if (!name || name.length < 3) {
      const newResults = { ...contactSearchResults };
      delete newResults[contactId];
      setContactSearchResults(newResults);
      return;
    }

    setSearchingContact(contactId);

    try {
      console.log("🔍 Searching members for contact:", name);

      const res = await fetch(
        `/api/admin/members?search=${encodeURIComponent(name)}&limit=5`,
      );

      if (!res.ok) {
        console.error("❌ Member search failed:", res.status);
        setSearchingContact(null);
        return;
      }

      const data = await res.json();
      const members = data.members || [];

      console.log(`✅ Found ${members.length} members`);

      if (members.length > 0) {
        const results: MemberSearchResult[] = members.map((m: any) => ({
          memberId: m.memberId || m.id,
          firstName: m.personalInfo?.firstName || m.firstName || "",
          lastName: m.personalInfo?.lastName || m.lastName || "",
          displayName:
            m.personalInfo?.displayName ||
            m.displayName ||
            `${m.personalInfo?.firstName || m.firstName} ${m.personalInfo?.lastName || m.lastName}`,
          email: m.contact?.email || m.email || "",
          phone: m.contact?.phone || m.phone || "",
        }));

        setContactSearchResults((prev) => ({
          ...prev,
          [contactId]: results,
        }));

        console.log(`📋 Showing ${results.length} member options`);
      } else {
        const newResults = { ...contactSearchResults };
        delete newResults[contactId];
        setContactSearchResults(newResults);
      }
    } catch (error) {
      console.error("❌ Error searching members:", error);
    } finally {
      setSearchingContact(null);
    }
  };

  // Link member to emergency contact
  const linkMemberToContact = (
    contactId: string,
    member: MemberSearchResult,
  ) => {
    console.log(
      "🔗 Linking member to contact:",
      member.displayName,
      member.memberId,
    );

    // Auto-fill: firstName + space + lastName
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    console.log("📝 Auto-filling contact:", {
      name: fullName,
      email: member.email,
      phone: member.phone,
    });

    updateEmergencyContact(contactId, "name", fullName);
    if (member.email) updateEmergencyContact(contactId, "email", member.email);
    if (member.phone) updateEmergencyContact(contactId, "phone", member.phone);
    updateEmergencyContact(contactId, "linkedMemberId", member.memberId);

    // Clear search results
    const newResults = { ...contactSearchResults };
    delete newResults[contactId];
    setContactSearchResults(newResults);

    alert(
      `✅ Linked to member: ${fullName}\nMember ID: ${member.memberId}\n\nAuto-filled:\n• Name: ${fullName}\n• Email: ${member.email || "N/A"}\n• Phone: ${member.phone || "N/A"}`,
    );
  };

  const unlinkContact = (contactId: string) => {
    if (confirm("Unlink this contact from the member record?")) {
      updateEmergencyContact(contactId, "linkedMemberId", "");
      console.log("🔓 Unlinked contact from member");
    }
  };

  // Search members for guardian
  const searchMemberForGuardian = async (guardianId: string, name: string) => {
    if (!name || name.length < 3) {
      const newResults = { ...guardianSearchResults };
      delete newResults[guardianId];
      setGuardianSearchResults(newResults);
      return;
    }

    setSearchingGuardian(guardianId);

    try {
      console.log("🔍 Searching members for guardian:", name);

      const res = await fetch(
        `/api/admin/members?search=${encodeURIComponent(name)}&limit=5`,
      );

      if (!res.ok) {
        console.error("❌ Member search failed:", res.status);
        setSearchingGuardian(null);
        return;
      }

      const data = await res.json();
      const members = data.members || [];

      console.log(`✅ Found ${members.length} members`);

      if (members.length > 0) {
        const results: MemberSearchResult[] = members.map((m: any) => ({
          memberId: m.memberId || m.id,
          firstName: m.personalInfo?.firstName || m.firstName || "",
          lastName: m.personalInfo?.lastName || m.lastName || "",
          displayName:
            m.personalInfo?.displayName ||
            m.displayName ||
            `${m.personalInfo?.firstName || m.firstName} ${m.personalInfo?.lastName || m.lastName}`,
          email: m.contact?.email || m.email || "",
          phone: m.contact?.phone || m.phone || "",
        }));

        setGuardianSearchResults((prev) => ({
          ...prev,
          [guardianId]: results,
        }));

        console.log(`📋 Showing ${results.length} member options`);
      } else {
        const newResults = { ...guardianSearchResults };
        delete newResults[guardianId];
        setGuardianSearchResults(newResults);
      }
    } catch (error) {
      console.error("❌ Error searching members:", error);
    } finally {
      setSearchingGuardian(null);
    }
  };

  // Link member to guardian
  const linkMemberToGuardian = (
    guardianId: string,
    member: MemberSearchResult,
  ) => {
    console.log(
      "🔗 Linking member to guardian:",
      member.displayName,
      member.memberId,
    );

    // Auto-fill: firstName + space + lastName
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    console.log("📝 Auto-filling guardian:", {
      name: fullName,
      email: member.email,
      phone: member.phone,
    });

    updateGuardian(guardianId, "name", fullName);
    if (member.email) updateGuardian(guardianId, "email", member.email);
    if (member.phone) updateGuardian(guardianId, "phone", member.phone);
    updateGuardian(guardianId, "linkedMemberId", member.memberId);

    // Clear search results
    const newResults = { ...guardianSearchResults };
    delete newResults[guardianId];
    setGuardianSearchResults(newResults);

    alert(
      `✅ Linked to member: ${fullName}\nMember ID: ${member.memberId}\n\nAuto-filled:\n• Name: ${fullName}\n• Email: ${member.email || "N/A"}\n• Phone: ${member.phone || "N/A"}`,
    );
  };

  const unlinkGuardian = (guardianId: string) => {
    if (confirm("Unlink this guardian from the member record?")) {
      updateGuardian(guardianId, "linkedMemberId", "");
      console.log("🔓 Unlinked guardian from member");
    }
  };

  const goToMemberProfile = (memberId: string) => {
    window.open(`/admin/members/${memberId}`, "_blank");
  };

  return (
    <div className="space-y-8">
      {/* ========================================
          EMERGENCY CONTACTS SECTION
      ======================================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              Emergency Contacts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              At least one emergency contact is required
            </p>
          </div>
          <button
            type="button"
            onClick={addEmergencyContact}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 text-sm transition-all"
          >
            <Plus size={16} />
            Add Contact
          </button>
        </div>

        {formData.emergencyContacts.length === 0 ? (
          <div className="p-8 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl text-center">
            <AlertCircle size={40} className="mx-auto text-red-300 mb-3" />
            <p className="text-red-700 font-bold">
              No emergency contacts added
            </p>
            <p className="text-xs text-red-500 mt-1">
              Please add at least one emergency contact
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.emergencyContacts.map((contact, index) => {
              const isSearching = searchingContact === contact.id;
              const searchResults = contactSearchResults[contact.id] || [];
              const hasResults = searchResults.length > 0;
              const isLinked = !!(contact as any).linkedMemberId;
              const relationshipSearchTerm =
                relationshipSearch[`contact-${contact.id}`] ||
                contact.relationship ||
                "";
              const filteredRelationships = getFilteredRelationships(
                relationshipSearchTerm,
              );

              return (
                <div
                  key={contact.id}
                  className="p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl"
                >
                  {/* Linked Member Badge */}
                  {isLinked && (
                    <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-green-600" />
                        <div>
                          <p className="text-xs font-black text-green-900">
                            ✅ Linked to Member
                          </p>
                          <p className="text-xs text-green-700">
                            Member ID: {(contact as any).linkedMemberId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            goToMemberProfile((contact as any).linkedMemberId)
                          }
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                        >
                          View
                          <ExternalLink size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => unlinkContact(contact.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 flex items-center gap-1"
                        >
                          <X size={10} />
                          Unlink
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase text-slate-600">
                        Emergency Contact #{index + 1}
                      </h4>
                      {isSearching && (
                        <Loader2
                          size={14}
                          className="animate-spin text-blue-600"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(contact.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Name with Search */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                        <span>Name *</span>
                        {contact.name.length >= 3 &&
                          !hasResults &&
                          !isLinked && (
                            <button
                              type="button"
                              onClick={() =>
                                searchMemberForContact(contact.id, contact.name)
                              }
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold"
                            >
                              <Search size={12} />
                              Search & Link Member
                            </button>
                          )}
                      </label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => {
                          updateEmergencyContact(
                            contact.id,
                            "name",
                            e.target.value,
                          );
                          if (e.target.value.length >= 3 && !isLinked) {
                            setTimeout(
                              () =>
                                searchMemberForContact(
                                  contact.id,
                                  e.target.value,
                                ),
                              1000,
                            );
                          }
                        }}
                        placeholder="Full Name"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        💡 Auto-fills "firstName lastName" from member
                      </p>
                    </div>

                    {/* Member Search Results */}
                    {hasResults && (
                      <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-blue-900">
                            ✅ Found {searchResults.length} Member
                            {searchResults.length !== 1 ? "s" : ""}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const newResults = { ...contactSearchResults };
                              delete newResults[contact.id];
                              setContactSearchResults(newResults);
                            }}
                            className="text-blue-700 hover:text-blue-900"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {searchResults.map((member) => (
                            <button
                              key={member.memberId}
                              type="button"
                              onClick={() =>
                                linkMemberToContact(contact.id, member)
                              }
                              className="w-full p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 text-left transition-all"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-black text-slate-900 text-sm flex items-center gap-2">
                                    {member.firstName} {member.lastName}
                                    <LinkIcon
                                      size={12}
                                      className="text-blue-600"
                                    />
                                  </p>
                                  <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                    {member.email && <p>📧 {member.email}</p>}
                                    {member.phone && <p>📱 {member.phone}</p>}
                                    <p className="text-blue-600 font-bold">
                                      ID: {member.memberId}
                                    </p>
                                  </div>
                                </div>
                                <CheckCircle
                                  size={16}
                                  className="text-blue-600 flex-shrink-0 ml-2"
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Type-ahead Relationship - FIXED to use forward field */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Relationship *{" "}
                        <span className="text-slate-400 font-normal">
                          (Type to search)
                        </span>
                      </label>
                      {loadingRelationships ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl">
                          <Loader2
                            size={14}
                            className="animate-spin text-slate-400"
                          />
                          <span className="text-sm text-slate-500">
                            Loading...
                          </span>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={relationshipSearchTerm}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRelationshipSearch((prev) => ({
                                ...prev,
                                [`contact-${contact.id}`]: value,
                              }));
                              updateEmergencyContact(
                                contact.id,
                                "relationship",
                                value,
                              );
                            }}
                            placeholder="Type to search (e.g., Parent, Friend)..."
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                          />
                          {relationshipSearchTerm &&
                            filteredRelationships.length > 0 && (
                              <div className="mt-1 max-h-40 overflow-y-auto bg-white border-2 border-slate-200 rounded-lg shadow-lg">
                                {filteredRelationships
                                  .slice(0, 8)
                                  .map((rel) => (
                                    <button
                                      key={rel.typeId}
                                      type="button"
                                      onClick={() => {
                                        updateEmergencyContact(
                                          contact.id,
                                          "relationship",
                                          rel.forward,
                                        );
                                        setRelationshipSearch((prev) => ({
                                          ...prev,
                                          [`contact-${contact.id}`]:
                                            rel.forward,
                                        }));
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between transition-colors"
                                    >
                                      <span className="font-bold">
                                        {rel.forward}
                                      </span>
                                      <span className="text-xs text-slate-400 capitalize">
                                        {rel.category}
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            )}
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) =>
                          updateEmergencyContact(
                            contact.id,
                            "phone",
                            e.target.value,
                          )
                        }
                        placeholder="0400 000 000"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contact.email || ""}
                        onChange={(e) =>
                          updateEmergencyContact(
                            contact.id,
                            "email",
                            e.target.value,
                          )
                        }
                        placeholder="email@example.com (optional)"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================
          GUARDIANS SECTION (Only for Minors)
      ======================================== */}
      {playerIsMinor && (
        <div className="pt-8 border-t-2 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Shield size={18} className="text-yellow-600" />
                Parents/Guardians
              </h3>
              <p className="text-xs text-yellow-700 mt-1 font-bold">
                ⚠️ Required for players under 18 years old
              </p>
            </div>
            <button
              type="button"
              onClick={addGuardian}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-[#06054e] rounded-xl font-bold hover:bg-yellow-500 text-sm transition-all"
            >
              <UserPlus size={16} />
              Add Guardian
            </button>
          </div>

          {formData.guardians.length === 0 ? (
            <div className="p-8 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-2xl text-center">
              <Shield size={40} className="mx-auto text-yellow-400 mb-3" />
              <p className="text-yellow-800 font-bold">No guardians added</p>
              <p className="text-xs text-yellow-600 mt-1">
                Guardian information is required for players under 18 years old
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.guardians.map((guardian, index) => {
                const isSearching = searchingGuardian === guardian.id;
                const searchResults = guardianSearchResults[guardian.id] || [];
                const hasResults = searchResults.length > 0;
                const isLinked = !!(guardian as any).linkedMemberId;
                const relationshipSearchTerm =
                  relationshipSearch[`guardian-${guardian.id}`] ||
                  guardian.relationship ||
                  "";
                const filteredRelationships = getFilteredRelationships(
                  relationshipSearchTerm,
                );

                return (
                  <div
                    key={guardian.id}
                    className={`p-6 border-2 rounded-2xl ${
                      guardian.isPrimary
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    {/* Linked Member Badge */}
                    {isLinked && (
                      <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LinkIcon size={16} className="text-green-600" />
                          <div>
                            <p className="text-xs font-black text-green-900">
                              ✅ Linked to Member
                            </p>
                            <p className="text-xs text-green-700">
                              Member ID: {(guardian as any).linkedMemberId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              goToMemberProfile(
                                (guardian as any).linkedMemberId,
                              )
                            }
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                          >
                            View
                            <ExternalLink size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => unlinkGuardian(guardian.id)}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 flex items-center gap-1"
                          >
                            <X size={10} />
                            Unlink
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xs font-black uppercase text-slate-600">
                          Guardian #{index + 1}
                        </h4>
                        {guardian.isPrimary && (
                          <span className="px-2 py-1 bg-yellow-400 text-[#06054e] rounded-full text-xs font-black">
                            PRIMARY
                          </span>
                        )}
                        {isSearching && (
                          <Loader2
                            size={14}
                            className="animate-spin text-blue-600"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!guardian.isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryGuardian(guardian.id)}
                            className="text-xs text-yellow-600 font-bold hover:underline"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeGuardian(guardian.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Name with Search */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                          <span>Name *</span>
                          {guardian.name.length >= 3 &&
                            !hasResults &&
                            !isLinked && (
                              <button
                                type="button"
                                onClick={() =>
                                  searchMemberForGuardian(
                                    guardian.id,
                                    guardian.name,
                                  )
                                }
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold"
                              >
                                <Search size={12} />
                                Search & Link Member
                              </button>
                            )}
                        </label>
                        <input
                          type="text"
                          value={guardian.name}
                          onChange={(e) => {
                            updateGuardian(guardian.id, "name", e.target.value);
                            if (e.target.value.length >= 3 && !isLinked) {
                              setTimeout(
                                () =>
                                  searchMemberForGuardian(
                                    guardian.id,
                                    e.target.value,
                                  ),
                                1000,
                              );
                            }
                          }}
                          placeholder="Full Name"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          💡 Auto-fills "firstName lastName" from member
                        </p>
                      </div>

                      {/* Member Search Results */}
                      {hasResults && (
                        <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black text-blue-900">
                              ✅ Found {searchResults.length} Member
                              {searchResults.length !== 1 ? "s" : ""}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const newResults = { ...guardianSearchResults };
                                delete newResults[guardian.id];
                                setGuardianSearchResults(newResults);
                              }}
                              className="text-blue-700 hover:text-blue-900"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {searchResults.map((member) => (
                              <button
                                key={member.memberId}
                                type="button"
                                onClick={() =>
                                  linkMemberToGuardian(guardian.id, member)
                                }
                                className="w-full p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 text-left transition-all"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-black text-slate-900 text-sm flex items-center gap-2">
                                      {member.firstName} {member.lastName}
                                      <LinkIcon
                                        size={12}
                                        className="text-blue-600"
                                      />
                                    </p>
                                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                      {member.email && <p>📧 {member.email}</p>}
                                      {member.phone && <p>📱 {member.phone}</p>}
                                      <p className="text-blue-600 font-bold">
                                        ID: {member.memberId}
                                      </p>
                                    </div>
                                  </div>
                                  <CheckCircle
                                    size={16}
                                    className="text-blue-600 flex-shrink-0 ml-2"
                                  />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Type-ahead Relationship - FIXED to use forward field */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Relationship *{" "}
                          <span className="text-slate-400 font-normal">
                            (Type to search)
                          </span>
                        </label>
                        {loadingRelationships ? (
                          <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl">
                            <Loader2
                              size={14}
                              className="animate-spin text-slate-400"
                            />
                            <span className="text-sm text-slate-500">
                              Loading...
                            </span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={relationshipSearchTerm}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRelationshipSearch((prev) => ({
                                  ...prev,
                                  [`guardian-${guardian.id}`]: value,
                                }));
                                updateGuardian(
                                  guardian.id,
                                  "relationship",
                                  value,
                                );
                              }}
                              placeholder="Type to search (e.g., Mother, Father)..."
                              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                            />
                            {relationshipSearchTerm &&
                              filteredRelationships.length > 0 && (
                                <div className="mt-1 max-h-40 overflow-y-auto bg-white border-2 border-slate-200 rounded-lg shadow-lg">
                                  {filteredRelationships
                                    .slice(0, 8)
                                    .map((rel) => (
                                      <button
                                        key={rel.typeId}
                                        type="button"
                                        onClick={() => {
                                          updateGuardian(
                                            guardian.id,
                                            "relationship",
                                            rel.forward,
                                          );
                                          setRelationshipSearch((prev) => ({
                                            ...prev,
                                            [`guardian-${guardian.id}`]:
                                              rel.forward,
                                          }));
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between transition-colors"
                                      >
                                        <span className="font-bold">
                                          {rel.forward}
                                        </span>
                                        <span className="text-xs text-slate-400 capitalize">
                                          {rel.category}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              )}
                          </>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={guardian.phone}
                          onChange={(e) =>
                            updateGuardian(guardian.id, "phone", e.target.value)
                          }
                          placeholder="0400 000 000"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={guardian.email}
                          onChange={(e) =>
                            updateGuardian(guardian.id, "email", e.target.value)
                          }
                          placeholder="email@example.com"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
