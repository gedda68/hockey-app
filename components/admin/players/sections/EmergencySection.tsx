// sections/EmergencySection.tsx
// COMPLETE: Auto-fill from member linking + Relationship type-ahead from config DB

"use client";

import { useState, useEffect } from "react";
import {
  BaseSectionProps,
  EmergencyContact,
  Guardian,
  isMinor,
} from "@/types/player.types";
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
  configType: string;
  id: string; // Config uses 'id' field
  name: string; // Config uses 'name' field
  code?: string;
  description?: string;
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

  // Fetch relationships from config API
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        console.log("📋 Fetching relationships from config API...");
        const res = await fetch("/api/admin/config/relationship-type");

        if (res.ok) {
          const relationshipTypes = await res.json(); // Direct array from config API

          console.log(
            `✅ Loaded ${relationshipTypes.length} relationship types`,
          );
          console.log("📦 Sample relationship:", relationshipTypes[0]);

          // Filter only active relationships and sort by displayOrder
          const activeRelationships = relationshipTypes
            .filter((rel: RelationshipType) => rel.isActive !== false)
            .sort(
              (a: RelationshipType, b: RelationshipType) =>
                (a.displayOrder || 0) - (b.displayOrder || 0),
            );

          setRelationships(activeRelationships);
        } else {
          console.warn("⚠️ Could not load relationships, using fallback");
          setRelationships([
            {
              configType: "relationship-type",
              id: "parent",
              name: "Parent",
              isActive: true,
              displayOrder: 1,
            },
            {
              configType: "relationship-type",
              id: "mother",
              name: "Mother",
              isActive: true,
              displayOrder: 2,
            },
            {
              configType: "relationship-type",
              id: "father",
              name: "Father",
              isActive: true,
              displayOrder: 3,
            },
            {
              configType: "relationship-type",
              id: "guardian",
              name: "Guardian",
              isActive: true,
              displayOrder: 4,
            },
            {
              configType: "relationship-type",
              id: "sibling",
              name: "Sibling",
              isActive: true,
              displayOrder: 5,
            },
            {
              configType: "relationship-type",
              id: "friend",
              name: "Friend",
              isActive: true,
              displayOrder: 10,
            },
            {
              configType: "relationship-type",
              id: "other",
              name: "Other",
              isActive: true,
              displayOrder: 99,
            },
          ]);
        }
      } catch (error) {
        console.error("❌ Error loading relationships:", error);
        setRelationships([
          {
            configType: "relationship-type",
            id: "parent",
            name: "Parent",
            isActive: true,
            displayOrder: 1,
          },
          {
            configType: "relationship-type",
            id: "other",
            name: "Other",
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

  // Filter relationships based on search
  const getFilteredRelationships = (searchTerm: string) => {
    if (!searchTerm) return relationships;
    const lower = searchTerm.toLowerCase();
    return relationships.filter(
      (rel) =>
        (rel.name?.toLowerCase() || "").includes(lower) ||
        (rel.description?.toLowerCase() || "").includes(lower),
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
      linkedMemberId: "",
    };
    onChange("emergencyContacts", [...formData.emergencyContacts, newContact]);
  };

  const removeEmergencyContact = (id: string) => {
    onChange(
      "emergencyContacts",
      formData.emergencyContacts.filter((c) => c.id !== id),
    );
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
      linkedMemberId: "",
    };
    onChange("guardians", [...formData.guardians, newGuardian]);
  };

  const removeGuardian = (id: string) => {
    const remaining = formData.guardians.filter((g) => g.id !== id);
    if (remaining.length > 0 && !remaining.some((g) => g.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onChange("guardians", remaining);
  };

  const updateGuardian = (
    id: string,
    field: keyof Guardian,
    value: string | boolean,
  ) => {
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

  // Link member to emergency contact - WITH AUTO-FILL
  const linkMemberToContact = (
    contactId: string,
    member: MemberSearchResult,
  ) => {
    console.log(
      "🔗 Linking member to emergency contact:",
      member.displayName,
      member.memberId,
    );

    // Auto-fill: firstName + space + lastName
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    console.log("📝 Auto-filling contact details:", {
      name: fullName,
      email: member.email || "N/A",
      phone: member.phone || "N/A",
    });

    // Update all fields at once
    const updatedContact = formData.emergencyContacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          name: fullName,
          email: member.email || c.email, // Use member email if available
          phone: member.phone || c.phone, // Use member phone if available
          linkedMemberId: member.memberId,
        };
      }
      return c;
    });

    onChange("emergencyContacts", updatedContact);

    // Clear search results
    const newResults = { ...contactSearchResults };
    delete newResults[contactId];
    setContactSearchResults(newResults);

    alert(
      `✅ Linked to member: ${fullName}\nMember ID: ${member.memberId}\n\n✨ Auto-filled:\n• Name: ${fullName}\n• Email: ${member.email || "Not available"}\n• Phone: ${member.phone || "Not available"}`,
    );
  };

  const unlinkContact = (contactId: string) => {
    if (
      confirm(
        "Unlink this contact from the member record? (This will not clear the contact details)",
      )
    ) {
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

  // Link member to guardian - WITH AUTO-FILL
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

    console.log("📝 Auto-filling guardian details:", {
      name: fullName,
      email: member.email || "N/A",
      phone: member.phone || "N/A",
    });

    // Update all fields at once
    const updatedGuardians = formData.guardians.map((g) => {
      if (g.id === guardianId) {
        return {
          ...g,
          name: fullName,
          email: member.email || g.email, // Use member email if available
          phone: member.phone || g.phone, // Use member phone if available
          linkedMemberId: member.memberId,
        };
      }
      return g;
    });

    onChange("guardians", updatedGuardians);

    // Clear search results
    const newResults = { ...guardianSearchResults };
    delete newResults[guardianId];
    setGuardianSearchResults(newResults);

    alert(
      `✅ Linked to member: ${fullName}\nMember ID: ${member.memberId}\n\n✨ Auto-filled:\n• Name: ${fullName}\n• Email: ${member.email || "Not available"}\n• Phone: ${member.phone || "Not available"}`,
    );
  };

  const unlinkGuardian = (guardianId: string) => {
    if (
      confirm(
        "Unlink this guardian from the member record? (This will not clear the guardian details)",
      )
    ) {
      updateGuardian(guardianId, "linkedMemberId", "");
      console.log("🔓 Unlinked guardian from member");
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Contacts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              Emergency Contacts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              At least one emergency contact is required
            </p>
          </div>
          <button
            type="button"
            onClick={addEmergencyContact}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 text-sm transition-all"
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
            <p className="text-xs text-red-600 mt-1">
              Click "Add Contact" to add at least one emergency contact
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.emergencyContacts.map((contact, index) => {
              const contactResults = contactSearchResults[contact.id] || [];
              const isLinked = !!contact.linkedMemberId;
              const currentRelationshipSearch =
                relationshipSearch[contact.id] || contact.relationship || "";

              return (
                <div
                  key={contact.id}
                  className="p-6 bg-white border-2 border-slate-100 rounded-2xl relative"
                >
                  {/* Linked Badge */}
                  {isLinked && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                        <LinkIcon size={12} className="text-green-700" />
                        <span className="text-xs font-black text-green-700">
                          LINKED
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black uppercase text-slate-600">
                      Emergency Contact #{index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(contact.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Name Field with Member Search */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => {
                            updateEmergencyContact(
                              contact.id,
                              "name",
                              e.target.value,
                            );
                            searchMemberForContact(contact.id, e.target.value);
                          }}
                          className="w-full px-4 py-3 pr-10 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                          placeholder="Full name"
                          disabled={isLinked}
                        />
                        {searchingContact === contact.id && (
                          <div className="absolute right-3 top-3">
                            <Loader2
                              size={20}
                              className="animate-spin text-slate-400"
                            />
                          </div>
                        )}
                      </div>

                      {/* Member Search Results */}
                      {!isLinked && contactResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border-2 border-blue-200 rounded-xl shadow-lg">
                          <p className="text-xs font-bold text-blue-700 px-3 py-2 bg-blue-50 border-b border-blue-200">
                            Found {contactResults.length} member(s) - click to
                            link & auto-fill:
                          </p>
                          {contactResults.map((member) => (
                            <button
                              key={member.memberId}
                              type="button"
                              onClick={() =>
                                linkMemberToContact(contact.id, member)
                              }
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                            >
                              <p className="text-sm font-bold text-slate-900">
                                {member.displayName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {member.email || "No email"} •{" "}
                                {member.phone || "No phone"}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Linked Member Info */}
                      {isLinked && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700">
                              <strong>Linked to member:</strong>{" "}
                              {contact.linkedMemberId}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => unlinkContact(contact.id)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1"
                          >
                            <X size={12} />
                            Unlink
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Relationship - Type-ahead from Config */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      {loadingRelationships ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl">
                          <Loader2
                            size={16}
                            className="animate-spin text-slate-400"
                          />
                          <span className="text-sm text-slate-500 font-bold">
                            Loading relationships...
                          </span>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={currentRelationshipSearch}
                            onChange={(e) => {
                              setRelationshipSearch((prev) => ({
                                ...prev,
                                [contact.id]: e.target.value,
                              }));
                              updateEmergencyContact(
                                contact.id,
                                "relationship",
                                e.target.value,
                              );
                            }}
                            placeholder="Type to search (e.g., Mother, Father, Guardian)"
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                          />

                          {/* Relationship Dropdown */}
                          {currentRelationshipSearch &&
                            getFilteredRelationships(currentRelationshipSearch)
                              .length > 0 &&
                            !relationships.some(
                              (r) =>
                                r.name.toLowerCase() ===
                                currentRelationshipSearch.toLowerCase(),
                            ) && (
                              <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                                {getFilteredRelationships(
                                  currentRelationshipSearch,
                                ).map((rel) => (
                                  <button
                                    key={rel.id}
                                    type="button"
                                    onClick={() => {
                                      updateEmergencyContact(
                                        contact.id,
                                        "relationship",
                                        rel.name,
                                      );
                                      setRelationshipSearch((prev) => ({
                                        ...prev,
                                        [contact.id]: rel.name,
                                      }));
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between transition-colors border-b border-slate-100 last:border-b-0"
                                  >
                                    <span className="font-bold text-slate-900">
                                      {rel.name}
                                    </span>
                                    {rel.description && (
                                      <span className="text-xs text-slate-400">
                                        {rel.description}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                        </>
                      )}
                    </div>

                    {/* Phone & Email - Auto-filled from member */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Phone <span className="text-red-500">*</span>
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
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                          placeholder="0400 000 000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) =>
                            updateEmergencyContact(
                              contact.id,
                              "email",
                              e.target.value,
                            )
                          }
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guardians Section - Only for Minors */}
      {playerIsMinor && (
        <div className="pt-6 border-t-2 border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Parent/Guardian Information
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Required for players under 18 years old
              </p>
            </div>
            <button
              type="button"
              onClick={addGuardian}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-sm transition-all"
            >
              <UserPlus size={16} />
              Add Guardian
            </button>
          </div>

          {formData.guardians.length === 0 ? (
            <div className="p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl text-center">
              <Shield size={40} className="mx-auto text-blue-300 mb-3" />
              <p className="text-blue-700 font-bold">No guardians added</p>
              <p className="text-xs text-blue-600 mt-1">
                This player is a minor - at least one parent/guardian is
                required
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.guardians.map((guardian, index) => {
                const guardianResults =
                  guardianSearchResults[guardian.id] || [];
                const isLinked = !!guardian.linkedMemberId;
                const currentRelationshipSearch =
                  relationshipSearch[guardian.id] ||
                  guardian.relationship ||
                  "";

                return (
                  <div
                    key={guardian.id}
                    className="p-6 bg-white border-2 border-slate-100 rounded-2xl relative"
                  >
                    {/* Linked & Primary Badges */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {guardian.isPrimary && (
                        <div className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full">
                          <span className="text-xs font-black text-yellow-700">
                            PRIMARY
                          </span>
                        </div>
                      )}
                      {isLinked && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                          <LinkIcon size={12} className="text-green-700" />
                          <span className="text-xs font-black text-green-700">
                            LINKED
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black uppercase text-slate-600">
                        Guardian #{index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeGuardian(guardian.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Primary Guardian Checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={guardian.isPrimary}
                          onChange={() => setPrimaryGuardian(guardian.id)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <label className="text-sm font-bold text-slate-700">
                          Primary Guardian (main contact)
                        </label>
                      </div>

                      {/* Name Field with Member Search */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={guardian.name}
                            onChange={(e) => {
                              updateGuardian(
                                guardian.id,
                                "name",
                                e.target.value,
                              );
                              searchMemberForGuardian(
                                guardian.id,
                                e.target.value,
                              );
                            }}
                            className="w-full px-4 py-3 pr-10 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                            placeholder="Full name"
                            disabled={isLinked}
                          />
                          {searchingGuardian === guardian.id && (
                            <div className="absolute right-3 top-3">
                              <Loader2
                                size={20}
                                className="animate-spin text-slate-400"
                              />
                            </div>
                          )}
                        </div>

                        {/* Member Search Results */}
                        {!isLinked && guardianResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border-2 border-blue-200 rounded-xl shadow-lg">
                            <p className="text-xs font-bold text-blue-700 px-3 py-2 bg-blue-50 border-b border-blue-200">
                              Found {guardianResults.length} member(s) - click
                              to link & auto-fill:
                            </p>
                            {guardianResults.map((member) => (
                              <button
                                key={member.memberId}
                                type="button"
                                onClick={() =>
                                  linkMemberToGuardian(guardian.id, member)
                                }
                                className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                              >
                                <p className="text-sm font-bold text-slate-900">
                                  {member.displayName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {member.email || "No email"} •{" "}
                                  {member.phone || "No phone"}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Linked Member Info */}
                        {isLinked && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs text-green-700">
                                <strong>Linked to member:</strong>{" "}
                                {guardian.linkedMemberId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => unlinkGuardian(guardian.id)}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1"
                            >
                              <X size={12} />
                              Unlink
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Relationship - Type-ahead from Config */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Relationship <span className="text-red-500">*</span>
                        </label>
                        {loadingRelationships ? (
                          <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl">
                            <Loader2
                              size={16}
                              className="animate-spin text-slate-400"
                            />
                            <span className="text-sm text-slate-500 font-bold">
                              Loading relationships...
                            </span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={currentRelationshipSearch}
                              onChange={(e) => {
                                setRelationshipSearch((prev) => ({
                                  ...prev,
                                  [guardian.id]: e.target.value,
                                }));
                                updateGuardian(
                                  guardian.id,
                                  "relationship",
                                  e.target.value,
                                );
                              }}
                              placeholder="Type to search (e.g., Mother, Father, Guardian)"
                              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                            />

                            {/* Relationship Dropdown */}
                            {currentRelationshipSearch &&
                              getFilteredRelationships(
                                currentRelationshipSearch,
                              ).length > 0 &&
                              !relationships.some(
                                (r) =>
                                  r.name.toLowerCase() ===
                                  currentRelationshipSearch.toLowerCase(),
                              ) && (
                                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                                  {getFilteredRelationships(
                                    currentRelationshipSearch,
                                  ).map((rel) => (
                                    <button
                                      key={rel.id}
                                      type="button"
                                      onClick={() => {
                                        updateGuardian(
                                          guardian.id,
                                          "relationship",
                                          rel.name,
                                        );
                                        setRelationshipSearch((prev) => ({
                                          ...prev,
                                          [guardian.id]: rel.name,
                                        }));
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between transition-colors border-b border-slate-100 last:border-b-0"
                                    >
                                      <span className="font-bold text-slate-900">
                                        {rel.name}
                                      </span>
                                      {rel.description && (
                                        <span className="text-xs text-slate-400">
                                          {rel.description}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </>
                        )}
                      </div>

                      {/* Phone & Email - Auto-filled from member */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={guardian.phone}
                            onChange={(e) =>
                              updateGuardian(
                                guardian.id,
                                "phone",
                                e.target.value,
                              )
                            }
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                            placeholder="0400 000 000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={guardian.email}
                            onChange={(e) =>
                              updateGuardian(
                                guardian.id,
                                "email",
                                e.target.value,
                              )
                            }
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-900 font-bold">
          💡 <strong>Auto-Fill Feature:</strong> Start typing a name and select
          from matching members to automatically fill email and phone numbers.
        </p>
      </div>
    </div>
  );
}
