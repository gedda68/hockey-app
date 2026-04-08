// app/admin/components/clubs/EditClubModal.tsx
// UPDATED: Using Lexical for both Description and About fields

"use client";

import { useState, useEffect } from "react";
import {
  Club,
  ClubColors,
  ClubAddress,
  ClubContact,
  CommitteeMember,
  SocialMedia,
} from "../../types/clubs";
import ImageUpload from "../ImageUpload";
import HTMLEditor from "../HTMLEditor";

interface EditClubModalProps {
  club: Club;
  onClose: () => void;
  onSubmit: (club: Club, changeReason?: string) => void;
}

export default function EditClubModal({
  club: initialClub,
  onClose,
  onSubmit,
}: EditClubModalProps) {
  // Properly initialize club with all fields, providing defaults for missing fields
  const [club, setClub] = useState<Club>({
    ...initialClub,
    description: initialClub.description || "",
    about: initialClub.about || "",
    socialMedia: {
      facebook: initialClub.socialMedia?.facebook || "",
      instagram: initialClub.socialMedia?.instagram || "",
      twitter: initialClub.socialMedia?.twitter || "",
    },
    committee: initialClub.committee || [],
    established: initialClub.established || "",
    homeGround: initialClub.homeGround || "",
    shortName: initialClub.shortName || "",
    logo: initialClub.logo || "",
  });

  const [currentTab, setCurrentTab] = useState<
    "basic" | "contact" | "colors" | "committee" | "status"
  >("basic");
  const [changeReason, setChangeReason] = useState("");
  const [deactivationReason, setDeactivationReason] = useState("");
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

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

    if (!club.active && initialClub.active && !deactivationReason) {
      alert("Please provide a reason for deactivation");
      setCurrentTab("status");
      return;
    }

    onSubmit(
      {
        ...club,
        deactivationReason:
          !club.active && initialClub.active ? deactivationReason : undefined,
        reactivationReason:
          club.active && !initialClub.active ? "Club reactivated" : undefined,
      },
      changeReason || "Club details updated"
    );
  };

  const handleDeactivateToggle = () => {
    if (club.active) {
      setShowDeactivateConfirm(true);
    } else {
      setClub({ ...club, active: true });
      setDeactivationReason("");
    }
  };

  const confirmDeactivation = () => {
    if (!deactivationReason.trim()) {
      alert("Please provide a reason for deactivation");
      return;
    }
    setClub({ ...club, active: false });
    setShowDeactivateConfirm(false);
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-[#06054e]">
                Edit Club
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Update {initialClub.name}
              </p>
            </div>

            <div>
              {club.active ? (
                <span className="px-4 py-2 bg-green-500 text-white rounded-full text-xs font-black uppercase shadow-md">
                  ✓ Active
                </span>
              ) : (
                <span className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-black uppercase shadow-md">
                  ✗ Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b-2 border-slate-300 bg-slate-50 shadow-sm">
          <div className="flex px-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-200">
            {[
              { key: "basic", label: "Basic Info" },
              { key: "contact", label: "Contact & Social" },
              { key: "colors", label: "Colors" },
              { key: "committee", label: "Committee" },
              { key: "status", label: "Status" },
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
                    value={club.shortName || ""}
                    onChange={(e) =>
                      setClub({ ...club, shortName: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Established
                  </label>
                  <input
                    type="text"
                    value={club.established || ""}
                    onChange={(e) =>
                      setClub({ ...club, established: e.target.value })
                    }
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
                  value={club.homeGround || ""}
                  onChange={(e) =>
                    setClub({ ...club, homeGround: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                />
              </div>

              {/* DESCRIPTION - HTML EDITOR */}
              <HTMLEditor
                key={`description-${club.id}`}
                value={club.description || ""}
                onChange={(value) => setClub({ ...club, description: value })}
                label="Short Description"
                placeholder="Brief description for cards and previews..."
                minHeight="150px"
              />
              <p className="text-xs text-slate-500 -mt-2">
                This appears on club cards and in search results
              </p>

              {/* ABOUT - HTML EDITOR */}
              <HTMLEditor
                key={`about-${club.id}`}
                value={club.about || ""}
                onChange={(value) => setClub({ ...club, about: value })}
                label="About (Full Description)"
                placeholder="Full club history, achievements, values, and detailed information..."
                minHeight="300px"
              />
              <p className="text-xs text-slate-500 -mt-2">
                Full rich text description - appears on club profile page
              </p>
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
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={club.contact.phone || ""}
                    onChange={(e) => updateContact("phone", e.target.value)}
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
                  value={club.contact.website || ""}
                  onChange={(e) => updateContact("website", e.target.value)}
                  placeholder="https://club.com.au"
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
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

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
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

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
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

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
                  placeholder="John Smith, President, john@club.com, 0400000000&#10;Jane Doe, Secretary, jane@club.com, 0411111111"
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
            </div>
          )}

          {/* Status Tab */}
          {currentTab === "status" && (
            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase text-[#06054e]">
                Club Status
              </h3>

              <div className="p-6 bg-white rounded-xl border-2 border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Current Status</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      {club.active
                        ? "This club is currently active"
                        : "This club is currently inactive"}
                    </p>
                  </div>
                  <div>
                    {club.active ? (
                      <span className="px-4 py-2 bg-green-500 text-white rounded-full font-black text-sm shadow-md">
                        ✓ ACTIVE
                      </span>
                    ) : (
                      <span className="px-4 py-2 bg-red-500 text-white rounded-full font-black text-sm shadow-md">
                        ✗ INACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!club.active && initialClub.deactivatedAt && (
                <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200">
                  <h4 className="font-bold text-red-900 mb-2">
                    Deactivation Details
                  </h4>
                  <div className="space-y-1 text-sm text-red-700">
                    <p>
                      <strong>Deactivated:</strong>{" "}
                      {new Date(initialClub.deactivatedAt).toLocaleDateString()}
                    </p>
                    {initialClub.deactivatedBy && (
                      <p>
                        <strong>By:</strong> {initialClub.deactivatedBy}
                      </p>
                    )}
                    {initialClub.deactivationReason && (
                      <p>
                        <strong>Reason:</strong>{" "}
                        {initialClub.deactivationReason}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleDeactivateToggle}
                  className={`w-full px-6 py-4 rounded-xl font-black uppercase transition-all shadow-md ${
                    club.active
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {club.active ? "✗ Deactivate Club" : "✓ Reactivate Club"}
                </button>
              </div>

              {showDeactivateConfirm && (
                <div className="p-6 bg-red-50 rounded-xl border-2 border-red-300">
                  <h4 className="font-bold text-red-900 mb-4">
                    ⚠️ Confirm Deactivation
                  </h4>
                  <p className="text-sm text-red-700 mb-4">
                    This will make the club inactive. Please provide a reason:
                  </p>
                  <textarea
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    placeholder="Reason for deactivation..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-xl focus:border-red-600 focus:outline-none mb-4 bg-white"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmDeactivation}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full font-black uppercase hover:bg-red-700 shadow-md"
                    >
                      Confirm Deactivation
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(false)}
                      className="px-4 py-2 bg-slate-300 text-slate-900 rounded-full font-black uppercase hover:bg-slate-400 shadow-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Reason for Changes (Optional)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Why are you making these changes?"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                />
                <p className="text-xs text-slate-500 mt-2">
                  This will be logged for audit purposes
                </p>
              </div>
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
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
}
