// app/admin/components/clubs/AddClubModal.tsx
// COMPLETE: Lexical RTF, Social Media, Bulk Committee, Image Upload, Fixed Layout

"use client";

import { useState } from "react";
import {
  Club,
  ClubColors,
  ClubAddress,
  ClubContact,
  CommitteeMember,
  SocialMedia,
} from "../../types/clubs";
import ImageUpload from "../ImageUpload";
import LexicalEditor from "../LexicalEditor";

interface AddClubModalProps {
  onClose: () => void;
  onSubmit: (club: Club) => void;
}

export default function AddClubModal({ onClose, onSubmit }: AddClubModalProps) {
  const [club, setClub] = useState<Club>({
    id: `club-${Date.now()}`,
    name: "",
    shortName: "",
    logo: "",
    colors: {
      primary: "#06054e",
      secondary: "#4338ca",
      accent: "",
    },
    address: {
      street: "",
      suburb: "",
      state: "QLD",
      postcode: "",
      country: "Australia",
    },
    contact: {
      email: "",
      phone: "",
      website: "",
    },
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
    },
    committee: [],
    established: "",
    homeGround: "",
    description: "",
    about: "",
    active: true,
  });

  const [currentTab, setCurrentTab] = useState<
    "basic" | "contact" | "colors" | "committee"
  >("basic");

  // Committee bulk add state
  const [bulkCommitteeText, setBulkCommitteeText] = useState("");
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(
    null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!club.name) {
      alert("Please enter a club name");
      return;
    }
    onSubmit(club);
  };

  const updateColors = (key: keyof ClubColors, value: string) => {
    setClub({ ...club, colors: { ...club.colors, [key]: value } });
  };

  const updateAddress = (key: keyof ClubAddress, value: string) => {
    setClub({ ...club, address: { ...club.address, [key]: value } });
  };

  const updateContact = (key: keyof ClubContact, value: string) => {
    setClub({ ...club, contact: { ...club.contact, [key]: value } });
  };

  const updateSocialMedia = (key: keyof SocialMedia, value: string) => {
    setClub({
      ...club,
      socialMedia: {
        ...club.socialMedia,
        [key]: value,
      },
    });
  };

  // Committee management - BULK ADD
  const parseBulkCommittee = () => {
    const lines = bulkCommitteeText
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const newMembers: CommitteeMember[] = [];

    lines.forEach((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        newMembers.push({
          id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: parts[0],
          position: parts[1],
          email: parts[2] || "",
          phone: parts[3] || "",
        });
      }
    });

    if (newMembers.length > 0) {
      setClub({
        ...club,
        committee: [...(club.committee || []), ...newMembers],
      });
      setBulkCommitteeText("");
      alert(`✅ Added ${newMembers.length} committee member(s)`);
    } else {
      alert(
        "No valid committee members found. Use format: Name, Position, Email, Phone"
      );
    }
  };

  const updateCommitteeMember = () => {
    if (!editingMember) return;

    setClub({
      ...club,
      committee:
        club.committee?.map((m) =>
          m.id === editingMember.id ? editingMember : m
        ) || [],
    });

    setEditingMember(null);
  };

  const removeCommitteeMember = (id: string) => {
    if (confirm("Remove this committee member?")) {
      setClub({
        ...club,
        committee: club.committee?.filter((m) => m.id !== id) || [],
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-5xl my-8 flex flex-col shadow-2xl"
        style={{ maxHeight: "calc(100vh - 4rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Add New Club
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create a new hockey club profile
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b-2 border-slate-300 bg-slate-50 shadow-sm">
          <div className="flex px-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-200">
            {[
              { key: "basic", label: "Basic Info" },
              { key: "contact", label: "Contact & Social" },
              { key: "colors", label: "Colors" },
              { key: "committee", label: "Committee" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCurrentTab(tab.key as any)}
                className={`px-6 py-4 font-black text-sm transition-all whitespace-nowrap relative flex-shrink-0 ${
                  currentTab === tab.key
                    ? "text-indigo-600 bg-white border-b-4 border-indigo-600 -mb-[2px]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                style={{ minHeight: "56px" }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 bg-slate-50"
          style={{ minHeight: "400px", maxHeight: "calc(100vh - 300px)" }}
        >
          {/* Basic Info Tab */}
          {currentTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={club.name}
                  onChange={(e) => setClub({ ...club, name: e.target.value })}
                  placeholder="Brisbane Hockey Club"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={club.shortName}
                    onChange={(e) =>
                      setClub({ ...club, shortName: e.target.value })
                    }
                    placeholder="BHC"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Established
                  </label>
                  <input
                    type="text"
                    value={club.established}
                    onChange={(e) =>
                      setClub({ ...club, established: e.target.value })
                    }
                    placeholder="1985"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* IMAGE UPLOAD */}
              <ImageUpload
                currentImage={club.logo}
                onImageUploaded={(url) => setClub({ ...club, logo: url })}
                category="clubs"
                label="Club Logo"
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Home Ground
                </label>
                <input
                  type="text"
                  value={club.homeGround}
                  onChange={(e) =>
                    setClub({ ...club, homeGround: e.target.value })
                  }
                  placeholder="State Hockey Centre"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                />
              </div>

              {/* DESCRIPTION - LEXICAL RICH TEXT */}
              <LexicalEditor
                value={club.description || ""}
                onChange={(value) => setClub({ ...club, description: value })}
                label="Short Description"
                placeholder="Brief description for cards and previews..."
                minHeight="150px"
              />
              <p className="text-xs text-slate-500 -mt-2">
                This appears on club cards and in search results
              </p>

              {/* ABOUT - LEXICAL RICH TEXT */}
              <LexicalEditor
                value={club.about || ""}
                onChange={(value) => setClub({ ...club, about: value })}
                label="About (Full Description)"
                placeholder="Full club history, achievements, values, and detailed information..."
                minHeight="300px"
              />
              <p className="text-xs text-slate-500 -mt-2">
                Full rich text description - appears on club profile page
              </p>

              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-slate-200">
                <input
                  type="checkbox"
                  id="active"
                  checked={club.active}
                  onChange={(e) =>
                    setClub({ ...club, active: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <label htmlFor="active" className="font-bold text-slate-900">
                  Active Club
                </label>
              </div>
            </div>
          )}

          {/* Contact & Social Tab */}
          {currentTab === "contact" && (
            <div className="space-y-4">
              <h3 className="text-lg font-black uppercase text-[#06054e] mb-4">
                Contact Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={club.contact.email}
                    onChange={(e) => updateContact("email", e.target.value)}
                    placeholder="info@brisbanehc.com"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={club.contact.phone}
                    onChange={(e) => updateContact("phone", e.target.value)}
                    placeholder="07 3000 0000"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={club.contact.website}
                  onChange={(e) => updateContact("website", e.target.value)}
                  placeholder="https://brisbanehc.com.au"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                />
              </div>

              {/* SOCIAL MEDIA */}
              <h3 className="text-lg font-black uppercase text-[#06054e] mb-4 mt-6">
                Social Media
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    📘 Facebook
                  </label>
                  <input
                    type="url"
                    value={club.socialMedia?.facebook || ""}
                    onChange={(e) =>
                      updateSocialMedia("facebook", e.target.value)
                    }
                    placeholder="https://facebook.com/clubname"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    📷 Instagram
                  </label>
                  <input
                    type="url"
                    value={club.socialMedia?.instagram || ""}
                    onChange={(e) =>
                      updateSocialMedia("instagram", e.target.value)
                    }
                    placeholder="https://instagram.com/clubname"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    🐦 Twitter / X
                  </label>
                  <input
                    type="url"
                    value={club.socialMedia?.twitter || ""}
                    onChange={(e) =>
                      updateSocialMedia("twitter", e.target.value)
                    }
                    placeholder="https://twitter.com/clubname"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <h3 className="text-lg font-black uppercase text-[#06054e] mb-4 mt-6">
                Address
              </h3>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={club.address.street}
                  onChange={(e) => updateAddress("street", e.target.value)}
                  placeholder="123 Hockey Lane"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Suburb
                  </label>
                  <input
                    type="text"
                    value={club.address.suburb}
                    onChange={(e) => updateAddress("suburb", e.target.value)}
                    placeholder="Brisbane"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={club.address.postcode}
                    onChange={(e) => updateAddress("postcode", e.target.value)}
                    placeholder="4000"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    State
                  </label>
                  <select
                    value={club.address.state}
                    onChange={(e) => updateAddress("state", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="QLD">Queensland</option>
                    <option value="NSW">New South Wales</option>
                    <option value="VIC">Victoria</option>
                    <option value="SA">South Australia</option>
                    <option value="WA">Western Australia</option>
                    <option value="TAS">Tasmania</option>
                    <option value="NT">Northern Territory</option>
                    <option value="ACT">Australian Capital Territory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={club.address.country}
                    onChange={(e) => updateAddress("country", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Colors Tab */}
          {currentTab === "colors" && (
            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase text-[#06054e]">
                Club Colors
              </h3>

              {/* Primary Color */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Primary Color *
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={club.colors.primary}
                    onChange={(e) => updateColors("primary", e.target.value)}
                    className="w-20 h-20 rounded-xl cursor-pointer border-2 border-slate-300"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={club.colors.primary}
                      onChange={(e) => updateColors("primary", e.target.value)}
                      placeholder="#06054e"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Secondary Color *
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={club.colors.secondary}
                    onChange={(e) => updateColors("secondary", e.target.value)}
                    className="w-20 h-20 rounded-xl cursor-pointer border-2 border-slate-300"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={club.colors.secondary}
                      onChange={(e) =>
                        updateColors("secondary", e.target.value)
                      }
                      placeholder="#4338ca"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Accent Color (Optional)
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={club.colors.accent || "#ffffff"}
                    onChange={(e) => updateColors("accent", e.target.value)}
                    className="w-20 h-20 rounded-xl cursor-pointer border-2 border-slate-300"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={club.colors.accent || ""}
                      onChange={(e) => updateColors("accent", e.target.value)}
                      placeholder="#ffffff (optional)"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-6 bg-white rounded-xl border-2 border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-4">
                  Preview
                </h4>
                <div className="flex gap-4">
                  <div
                    className="w-32 h-32 rounded-xl border-2 border-slate-300 shadow-lg"
                    style={{ backgroundColor: club.colors.primary }}
                  />
                  <div
                    className="w-32 h-32 rounded-xl border-2 border-slate-300 shadow-lg"
                    style={{ backgroundColor: club.colors.secondary }}
                  />
                  {club.colors.accent && (
                    <div
                      className="w-32 h-32 rounded-xl border-2 border-slate-300 shadow-lg"
                      style={{ backgroundColor: club.colors.accent }}
                    />
                  )}
                </div>
                <div
                  className="mt-4 h-4 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${club.colors.primary} 0%, ${club.colors.secondary} 100%)`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Committee Tab */}
          {currentTab === "committee" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase text-[#06054e]">
                  Committee Members
                </h3>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                  {club.committee?.length || 0} Members
                </span>
              </div>

              {/* BULK ADD */}
              <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200">
                <h4 className="font-bold text-green-900 mb-3">
                  📋 Add Multiple Members
                </h4>
                <p className="text-sm text-green-700 mb-4">
                  Enter one member per line in format:{" "}
                  <strong>Name, Position, Email, Phone</strong>
                </p>
                <textarea
                  value={bulkCommitteeText}
                  onChange={(e) => setBulkCommitteeText(e.target.value)}
                  placeholder="John Smith, President, john@club.com, 0400000000&#10;Jane Doe, Secretary, jane@club.com, 0411111111&#10;Bob Jones, Treasurer, bob@club.com, 0422222222"
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:border-green-600 focus:outline-none bg-white font-mono text-sm mb-3"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={parseBulkCommittee}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-black uppercase hover:bg-green-700 shadow-md"
                  >
                    ✨ Add All Members
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkCommitteeText("")}
                    className="px-4 py-3 bg-slate-300 text-slate-900 rounded-xl font-bold hover:bg-slate-400"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Existing Members */}
              {club.committee && club.committee.length > 0 && (
                <div className="space-y-3">
                  {club.committee.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 bg-white rounded-xl border-2 border-slate-200"
                    >
                      {editingMember?.id === member.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editingMember.name}
                              onChange={(e) =>
                                setEditingMember({
                                  ...editingMember,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Name"
                              className="px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editingMember.position}
                              onChange={(e) =>
                                setEditingMember({
                                  ...editingMember,
                                  position: e.target.value,
                                })
                              }
                              placeholder="Position"
                              className="px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="email"
                              value={editingMember.email || ""}
                              onChange={(e) =>
                                setEditingMember({
                                  ...editingMember,
                                  email: e.target.value,
                                })
                              }
                              placeholder="Email"
                              className="px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                            />
                            <input
                              type="tel"
                              value={editingMember.phone || ""}
                              onChange={(e) =>
                                setEditingMember({
                                  ...editingMember,
                                  phone: e.target.value,
                                })
                              }
                              placeholder="Phone"
                              className="px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={updateCommitteeMember}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMember(null)}
                              className="px-3 py-2 bg-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {member.name}
                            </h4>
                            <p className="text-sm text-indigo-600 font-semibold">
                              {member.position}
                            </p>
                            {member.email && (
                              <p className="text-xs text-slate-600 mt-1">
                                📧 {member.email}
                              </p>
                            )}
                            {member.phone && (
                              <p className="text-xs text-slate-600">
                                📞 {member.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMember(member)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCommitteeMember(member.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(!club.committee || club.committee.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-lg font-semibold">
                    No committee members added yet
                  </p>
                  <p className="text-sm mt-2">
                    Use the form above to add members
                  </p>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t-2 border-slate-200 flex gap-3 bg-white shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-slate-300 text-slate-900 rounded-lg font-black uppercase hover:bg-slate-400 transition-all shadow-md"
            style={{ minHeight: "48px" }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg font-black uppercase hover:bg-green-700 transition-all shadow-md"
            style={{ minHeight: "48px" }}
          >
            CREATE CLUB
          </button>
        </div>
      </div>
    </div>
  );
}
