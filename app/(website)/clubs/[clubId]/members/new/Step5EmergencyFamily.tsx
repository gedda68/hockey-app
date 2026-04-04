"use client";

import { Shield, AlertCircle, Plus, Trash2 } from "lucide-react";
import type { MemberDoc } from "@/types/api";

interface RelationshipOption { relationshipId: string; name: string }
interface RelationshipTypeOption { typeId: string; name: string; forward: string; reverse: string }

interface EmergencyContact {
  contactId: string;
  priority: number;
  name: string;
  relationship: string;
  phone: string;
  mobile: string;
  email: string;
}

interface FamilyRelationship {
  relationshipId: string;
  relatedMemberId: string;
  relationshipType: string;
  forwardRelation: string;
  reverseRelation: string;
  searchQuery: string;
}

interface FormData {
  emergencyContacts: EmergencyContact[];
  familyRelationships: FamilyRelationship[];
  [key: string]: unknown;
}

interface Step5EmergencyFamilyProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  relationships: RelationshipOption[];
  relationshipTypes: RelationshipTypeOption[];
  hasFamilyMembers: boolean;
  setHasFamilyMembers: (value: boolean) => void;
  searchResults: Record<number, MemberDoc[]>;
  setSearchResults: React.Dispatch<React.SetStateAction<Record<number, MemberDoc[]>>>;
  addEmergencyContact: () => void;
  removeEmergencyContact: (index: number) => void;
  updateEmergencyContact: (index: number, field: string, value: string) => void;
  addFamilyRelationship: () => void;
  removeFamilyRelationship: (index: number) => void;
  updateFamilyRelationship: (index: number, field: string, value: string) => void;
  searchMembers: (query: string, index: number) => void;
}

export function Step5EmergencyFamily({
  formData,
  relationships,
  relationshipTypes,
  hasFamilyMembers,
  setHasFamilyMembers,
  searchResults,
  setSearchResults,
  addEmergencyContact,
  removeEmergencyContact,
  updateEmergencyContact,
  addFamilyRelationship,
  removeFamilyRelationship,
  updateFamilyRelationship,
  searchMembers,
}: Step5EmergencyFamilyProps) {
  return (
    <>
      {/* WARNING BANNER - Shows if no emergency contacts */}
      {formData.emergencyContacts.length === 0 && (
        <div className="bg-red-50 border-4 border-red-500 rounded-[2rem] p-6 mb-6 shadow-xl">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-black text-red-900 mb-2">
                ⚠️ Emergency Contact Required
              </h3>
              <p className="text-red-800 font-bold mb-3">
                You must add at least one emergency contact before you can create this member.
              </p>
              <p className="text-sm text-red-700 font-bold">
                👇 Click the &quot;Add Emergency Contact&quot; button below to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
          <Shield size={24} />
          Emergency Contacts
        </h2>

        <div className="space-y-6">
          {formData.emergencyContacts.map((contact, index) => (
            <div
              key={contact.contactId}
              className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-700">
                  Contact {index + 1} (Priority {contact.priority})
                </h3>
                <button
                  type="button"
                  onClick={() => removeEmergencyContact(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.name}
                    onChange={(e) => updateEmergencyContact(index, "name", e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="Jane Smith"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Relationship *
                  </label>
                  <select
                    required
                    value={contact.relationship}
                    onChange={(e) => updateEmergencyContact(index, "relationship", e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  >
                    <option value="">Select relationship</option>
                    {relationships.map((rel) => (
                      <option key={rel.relationshipId} value={rel.relationshipId}>
                        {rel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contact.phone}
                    onChange={(e) => updateEmergencyContact(index, "phone", e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="0411 111 111"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={contact.mobile}
                    onChange={(e) => updateEmergencyContact(index, "mobile", e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="0422 222 222"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateEmergencyContact(index, "email", e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
            </div>
          ))}

          {formData.emergencyContacts.length < 3 && (
            <button
              type="button"
              onClick={addEmergencyContact}
              className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-[#06054e] hover:text-[#06054e] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus size={20} />
              Add Emergency Contact{" "}
              {formData.emergencyContacts.length > 0
                ? `(${formData.emergencyContacts.length}/3)`
                : ""}
            </button>
          )}
        </div>
      </div>

      {/* Family Relationships */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="hasFamilyMembers"
            checked={hasFamilyMembers}
            onChange={(e) => setHasFamilyMembers(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
          />
          <label htmlFor="hasFamilyMembers" className="text-lg font-black text-slate-700">
            👥 This member has family in the club
          </label>
        </div>

        {hasFamilyMembers && (
          <div className="space-y-6 mt-6">
            {formData.familyRelationships.map((rel, index) => (
              <div
                key={rel.relationshipId}
                className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-700">
                    Relationship {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeFamilyRelationship(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-2">
                      Search Member
                    </label>
                    <input
                      type="text"
                      value={rel.searchQuery || ""}
                      onChange={(e) => {
                        updateFamilyRelationship(index, "searchQuery", e.target.value);
                        searchMembers(e.target.value, index);
                      }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                      placeholder="Type member name or ID..."
                    />

                    {searchResults[index] && searchResults[index].length > 0 && (
                      <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {searchResults[index].map((member) => (
                          <button
                            key={member.memberId}
                            type="button"
                            onClick={() => {
                              updateFamilyRelationship(index, "relatedMemberId", member.memberId);
                              updateFamilyRelationship(
                                index,
                                "searchQuery",
                                `${member.personalInfo.firstName} ${member.personalInfo.lastName} (${member.memberId})`,
                              );
                              setSearchResults((prev) => ({ ...prev, [index]: [] }));
                            }}
                            className="w-full p-3 text-left hover:bg-slate-50 transition-all"
                          >
                            <p className="font-bold">
                              {member.personalInfo.firstName} {member.personalInfo.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{member.memberId}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-2">
                      Relationship Type
                    </label>
                    <select
                      value={rel.relationshipType}
                      onChange={(e) =>
                        updateFamilyRelationship(index, "relationshipType", e.target.value)
                      }
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    >
                      <option value="">Select relationship</option>
                      {relationshipTypes.map((rt) => (
                        <option key={rt.typeId} value={rt.typeId}>
                          {rt.forward} (→ {rt.reverse})
                        </option>
                      ))}
                    </select>
                  </div>

                  {rel.relatedMemberId && rel.forwardRelation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm text-blue-800">
                        ℹ️ <strong>{rel.searchQuery.split(" (")[0]}</strong> will be linked as
                        your <strong>{rel.reverseRelation}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addFamilyRelationship}
              className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-[#06054e] hover:text-[#06054e] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus size={20} />
              Add Family Relationship
            </button>
          </div>
        )}
      </div>
    </>
  );
}
