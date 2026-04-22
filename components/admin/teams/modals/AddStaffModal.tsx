// app/admin/teams/components/modals/AddStaffModal.tsx
// CORRECTED: Uses members table with correct field structure

"use client";

import { useState, useEffect } from "react";
import type { TeamStaffRoleCode } from "@/lib/db/schemas/teamRosterStaff.schema";

function mapRoleValueToStaffRoleCode(roleValue: string): TeamStaffRoleCode {
  const set = new Set<TeamStaffRoleCode>([
    "head_coach",
    "assistant_coach",
    "manager",
    "physio",
    "team_manager",
    "other",
  ]);
  return set.has(roleValue as TeamStaffRoleCode)
    ? (roleValue as TeamStaffRoleCode)
    : "other";
}

interface Qualification {
  id: string;
  name: string;
  expiryDate?: string;
  issuedDate?: string;
}

interface StaffMember {
  id?: string;
  memberId: string;
  memberName: string;
  role: string;
  qualifications: Qualification[] | string[];
  staffRoleCode?: TeamStaffRoleCode;
  startDate?: string;
  endDate?: string;
  wwccCardNumber?: string | null;
  wwccExpiresAt?: string | null;
  showEmailOnPublicSite?: boolean;
  showPhoneOnPublicSite?: boolean;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string;
  memberNumber?: string;
  roles?: string[];
  photoUrl?: string;
}

interface AddStaffModalProps {
  teamName: string;
  id: string;
  onClose: () => void;
  onSubmit: (staff: StaffMember) => void;
  editingStaff?: StaffMember | null;
}

const STAFF_ROLES = [
  { value: "head_coach", label: "Head Coach", icon: "🏆" },
  { value: "assistant_coach", label: "Assistant Coach", icon: "📋" },
  { value: "manager", label: "Team Manager", icon: "📊" },
  { value: "physio", label: "Physiotherapist", icon: "⚕️" },
  { value: "trainer", label: "Trainer", icon: "💪" },
  { value: "doctor", label: "Team Doctor", icon: "🩺" },
  { value: "analyst", label: "Analyst", icon: "📈" },
  { value: "equipment", label: "Equipment Manager", icon: "🎽" },
];

export default function AddStaffModal({
  teamName,
  id,
  onClose,
  onSubmit,
  editingStaff,
}: AddStaffModalProps) {
  const [role, setRole] = useState(editingStaff?.role || "");
  const [selectedMemberId, setSelectedMemberId] = useState(
    editingStaff?.memberId || "",
  );
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // New qualification form
  const [newQualName, setNewQualName] = useState("");
  const [newQualIssued, setNewQualIssued] = useState("");
  const [newQualExpiry, setNewQualExpiry] = useState("");
  const [wwccCardNumber, setWwccCardNumber] = useState("");
  const [wwccExpiresAt, setWwccExpiresAt] = useState("");
  const [showEmailOnPublicSite, setShowEmailOnPublicSite] = useState(false);
  const [showPhoneOnPublicSite, setShowPhoneOnPublicSite] = useState(false);

  useEffect(() => {
    const fetchClubMembers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/clubs/${id}/members`);
        const data = await response.json();

        console.log("📋 Fetched members:", data);

        setMembers(data.members || []);
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchClubMembers();
  }, [id]);

  useEffect(() => {
    if (editingStaff) {
      const r = editingStaff.role || "";
      const matched = STAFF_ROLES.find(
        (x) => x.value === r || x.label === r,
      );
      setRole(matched?.value || r);
      setSelectedMemberId(editingStaff.memberId || "");
      const quals = editingStaff.qualifications || [];
      setQualifications(
        quals.map((q) =>
          typeof q === "string"
            ? { id: `legacy-${q}`, name: q }
            : (q as Qualification),
        ),
      );
      setWwccCardNumber(
        editingStaff.wwccCardNumber != null ? String(editingStaff.wwccCardNumber) : "",
      );
      setWwccExpiresAt(
        editingStaff.wwccExpiresAt
          ? String(editingStaff.wwccExpiresAt).slice(0, 10)
          : "",
      );
      setShowEmailOnPublicSite(Boolean(editingStaff.showEmailOnPublicSite));
      setShowPhoneOnPublicSite(Boolean(editingStaff.showPhoneOnPublicSite));
    } else {
      setWwccCardNumber("");
      setWwccExpiresAt("");
      setShowEmailOnPublicSite(false);
      setShowPhoneOnPublicSite(false);
    }
  }, [editingStaff]);

  useEffect(() => {
    if (!editingStaff || members.length === 0) return;
    const m = members.find(
      (x) =>
        x.id === editingStaff.memberId ||
        x.memberNumber === editingStaff.memberId,
    );
    if (m) setSelectedMember(m);
  }, [editingStaff, members]);

  const fetchClubMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/clubs/${id}/members`);
      const data = await response.json();

      console.log("📋 Fetched members:", data);

      setMembers(data.members || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      `${m.firstName} ${m.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddQualification = () => {
    if (!newQualName) return;

    const qual: Qualification = {
      id: `qual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newQualName,
      issuedDate: newQualIssued || undefined,
      expiryDate: newQualExpiry || undefined,
    };

    setQualifications([...qualifications, qual]);
    setNewQualName("");
    setNewQualIssued("");
    setNewQualExpiry("");
  };

  const handleRemoveQualification = (id: string) => {
    setQualifications(qualifications.filter((q) => q.id !== id));
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setSelectedMember(member);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!role || !selectedMemberId || !selectedMember) {
      alert("Role and Member are required");
      return;
    }

    const roleLabel = selectedRole?.label || role;
    const staffRoleCode = mapRoleValueToStaffRoleCode(role);
    const memberIdForApi =
      selectedMember.memberNumber?.trim() || selectedMemberId;

    onSubmit({
      id: editingStaff?.id,
      memberId: memberIdForApi,
      memberName:
        selectedMember.displayName ||
        `${selectedMember.firstName} ${selectedMember.lastName}`,
      role: roleLabel,
      staffRoleCode,
      qualifications: qualifications.map((q) => q.name),
      wwccCardNumber: wwccCardNumber.trim() || undefined,
      wwccExpiresAt: wwccExpiresAt.trim()
        ? `${wwccExpiresAt.trim()}T00:00:00.000Z`
        : undefined,
      showEmailOnPublicSite,
      showPhoneOnPublicSite,
      startDate: editingStaff?.startDate || new Date().toISOString(),
    });
  };

  const selectedRole = STAFF_ROLES.find((r) => r.value === role);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase text-white">
                    {editingStaff ? "Edit" : "Add"} Coaching Staff
                  </h2>
                  <p className="text-sm text-blue-200 mt-1">{teamName}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Role */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STAFF_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        role === r.value
                          ? "bg-blue-50 border-blue-500 text-blue-900"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{r.icon}</span>
                        <span className="font-bold text-sm">{r.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Member */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Select Club Member *
                </label>

                {/* Search */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, member number, or email..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none mb-3"
                />

                {/* Member List */}
                <div className="max-h-64 overflow-y-auto border-2 border-slate-200 rounded-xl">
                  {loading ? (
                    <div className="p-4 text-center text-slate-500">
                      Loading members...
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-slate-500 font-bold">
                        {searchTerm
                          ? "No members match your search"
                          : "No members found"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Total members in club: {members.length}
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleSelectMember(member)}
                        className={`w-full p-3 border-b border-slate-200 hover:bg-blue-50 transition-all text-left flex items-center gap-3 ${
                          selectedMemberId === member.id
                            ? "bg-blue-100"
                            : "bg-white"
                        }`}
                      >
                        {/* Photo */}
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.displayName}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-slate-500 font-bold">
                              {member.firstName?.[0]}
                              {member.lastName?.[0]}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">
                            {member.displayName ||
                              `${member.firstName} ${member.lastName}`}
                          </div>
                          <div className="text-sm text-slate-600 truncate">
                            {member.memberNumber && `#${member.memberNumber}`}
                            {member.email && ` · ${member.email}`}
                          </div>
                          {member.roles && member.roles.length > 0 && (
                            <div className="text-xs text-slate-500 mt-1 flex gap-1 flex-wrap">
                              {member.roles.slice(0, 2).map((role) => (
                                <span
                                  key={role}
                                  className="px-2 py-0.5 bg-slate-100 rounded"
                                >
                                  {role.replace("role-", "")}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {selectedMemberId === member.id && (
                          <svg
                            className="w-6 h-6 text-blue-600 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {selectedMember && (
                  <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3">
                    {selectedMember.photoUrl && (
                      <img
                        src={selectedMember.photoUrl}
                        alt={selectedMember.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="text-xs font-black uppercase text-green-600">
                        Selected
                      </div>
                      <div className="font-bold text-green-900">
                        {selectedMember.displayName}
                      </div>
                      <div className="text-sm text-green-700">
                        #{selectedMember.memberNumber}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Qualifications - same as before */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Qualifications & Certifications
                </label>

                {qualifications.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {qualifications.map((qual) => (
                      <div
                        key={qual.id}
                        className="p-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-green-900">
                            {qual.name}
                          </div>
                          <div className="text-xs text-green-700 mt-1">
                            {qual.issuedDate &&
                              `Issued: ${new Date(qual.issuedDate).toLocaleDateString()}`}
                            {qual.expiryDate &&
                              ` · Expires: ${new Date(qual.expiryDate).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQualification(qual.id)}
                          className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-3">
                  <input
                    type="text"
                    value={newQualName}
                    onChange={(e) => setNewQualName(e.target.value)}
                    placeholder="e.g., Level 2 Coaching Certificate"
                    className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold focus:border-blue-500 outline-none"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Issued Date
                      </label>
                      <input
                        type="date"
                        value={newQualIssued}
                        onChange={(e) => setNewQualIssued(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={newQualExpiry}
                        onChange={(e) => setNewQualExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQualification}
                    disabled={!newQualName}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Qualification
                  </button>
                </div>
              </div>

              {/* WWCC + public contact (G2 / G3) */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-5 space-y-4">
                <p className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Working with children / public contact
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      WWCC / card reference
                    </label>
                    <input
                      type="text"
                      value={wwccCardNumber}
                      onChange={(e) => setWwccCardNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg font-mono text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      WWCC expiry
                    </label>
                    <input
                      type="date"
                      value={wwccExpiresAt}
                      onChange={(e) => setWwccExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Public APIs only show email or phone from the member record when the
                  boxes below are ticked (e.g. club website directory).
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={showEmailOnPublicSite}
                    onChange={(e) => setShowEmailOnPublicSite(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-800">
                    Show member email on public site
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={showPhoneOnPublicSite}
                    onChange={(e) => setShowPhoneOnPublicSite(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-800">
                    Show member phone on public site
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-8 py-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!role || !selectedMemberId}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-sm hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingStaff ? "Update" : "Add"}{" "}
                {selectedRole?.label || "Staff"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
