// app/(website)/clubs/[clubId]/members/[memberId]/MemberViewClient.tsx
// Client component for member view page

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Shield,
  Award,
  Calendar,
  Edit,
  Trash2,
  Ban,
  ArrowLeft,
  Camera,
  Home,
  Users,
  AlertCircle,
  Check,
  X as XIcon,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  category: string;
}

interface Member {
  memberId: string;
  personalInfo: {
    salutation: string;
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
    photoUrl: string | null;
  };
  contact: {
    primaryEmail: string;
    emailOwnership: string;
    phone: string;
    mobile: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  healthcare: {
    medicare: {
      number: string;
      position: string;
      expiryMonth: string;
      expiryYear: string;
    } | null;
    privateHealth: {
      provider: string;
      membershipNumber: string;
      expiryDate: string;
    } | null;
  };
  emergencyContacts: Array<{
    contactId: string;
    priority: number;
    name: string;
    relationship: string;
    phone: string;
    mobile: string;
    email: string;
  }>;
  membership: {
    membershipType: string;
    status: string;
    joinDate: string;
  };
  roles: string[];
  playerInfo: {
    jerseyNumber: string;
    position: string;
  } | null;
  medical: {
    conditions: string;
    medications: string;
    allergies: string;
  };
  familyRelationships: Array<{
    relationshipId: string;
    relatedMemberId: string;
    relationshipType: string;
    forwardRelation: string;
    reverseRelation: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MemberViewClientProps {
  clubId: string;
  memberId: string;
}

// Role category colors
const ROLE_CATEGORY_COLORS: Record<string, string> = {
  Playing: "bg-blue-100 text-blue-700",
  Coaching: "bg-purple-100 text-purple-700",
  Administration: "bg-green-100 text-green-700",
  Official: "bg-orange-100 text-orange-700",
  Volunteer: "bg-pink-100 text-pink-700",
  Other: "bg-slate-100 text-slate-700",
};

function getRoleDisplayName(roleId: string, roles: Role[]): string {
  const role = roles.find((r) => r.id === roleId);
  return role?.name || roleId;
}

function getRoleColor(roleId: string, roles: Role[]): string {
  const role = roles.find((r) => r.id === roleId);
  const category = role?.category || "Other";
  return ROLE_CATEGORY_COLORS[category] || ROLE_CATEGORY_COLORS.Other;
}

export default function MemberViewClient({
  clubId,
  memberId,
}: MemberViewClientProps) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [relatedMembers, setRelatedMembers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [clubId, memberId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch member and roles in parallel
      const [memberRes, rolesRes] = await Promise.all([
        fetch(`/api/clubs/${clubId}/members/${memberId}`),
        fetch(`/api/admin/club-roles?activeOnly=true`),
      ]);

      if (!memberRes.ok) throw new Error("Member not found");
      if (!rolesRes.ok) throw new Error("Failed to fetch roles");

      const [memberData, rolesData] = await Promise.all([
        memberRes.json(),
        rolesRes.json(),
      ]);

      setMember(memberData);
      setRoles(rolesData);

      // Fetch related members if any
      if (memberData.familyRelationships?.length > 0) {
        const relatedIds = memberData.familyRelationships.map(
          (r: any) => r.relatedMemberId
        );
        const uniqueIds = [...new Set(relatedIds)];

        const relatedData: Record<string, any> = {};
        for (const id of uniqueIds) {
          try {
            const res = await fetch(`/api/clubs/${clubId}/members/${id}`);
            if (res.ok) {
              const data = await res.json();
              relatedData[id] = data;
            }
          } catch (err) {
            console.error(`Failed to fetch member ${id}:`, err);
          }
        }
        setRelatedMembers(relatedData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${
          member?.personalInfo.displayName || member?.personalInfo.firstName
        }? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete member");

      alert("Member deleted successfully");
      router.push(`/clubs/${clubId}/members`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleStatus = async () => {
    if (!member) return;

    const newStatus =
      member.membership.status === "Active" ? "Inactive" : "Active";

    if (
      !confirm(
        `Are you sure you want to make this member ${newStatus.toLowerCase()}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership: {
            ...member.membership,
            status: newStatus,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to update member status");

      const updatedMember = await res.json();
      setMember(updatedMember);
      alert(`Member marked as ${newStatus.toLowerCase()}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#06054e]"></div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6">
          <p className="text-red-800 font-bold">
            Error: {error || "Member not found"}
          </p>
          <Link
            href={`/clubs/${clubId}/members`}
            className="inline-flex items-center gap-2 mt-4 text-red-700 font-bold hover:text-red-900"
          >
            <ArrowLeft size={20} />
            Back to Members
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Actions */}
      <div className="mb-6">
        <Link
          href={`/clubs/${clubId}/members`}
          className="inline-flex items-center gap-2 text-slate-600 font-bold hover:text-[#06054e] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Members
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#06054e]">
              {member.personalInfo.displayName ||
                `${member.personalInfo.firstName} ${member.personalInfo.lastName}`}
            </h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              {member.memberId}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/clubs/${clubId}/members/${memberId}/edit`}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:bg-yellow-500 transition-all"
            >
              <Edit size={20} />
              Edit Member
            </Link>

            <button
              onClick={handleToggleStatus}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all ${
                member.membership.status === "Active"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              <Ban size={20} />
              {member.membership.status === "Active"
                ? "Make Inactive"
                : "Make Active"}
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 transition-all"
            >
              <Trash2 size={20} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Personal Info Section */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <User size={24} />
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo */}
          <div className="md:col-span-1">
            <div className="relative w-48 h-48 mx-auto">
              {member.personalInfo.photoUrl ? (
                <img
                  src={member.personalInfo.photoUrl}
                  alt={member.personalInfo.displayName}
                  className="w-full h-full rounded-2xl object-cover border-4 border-slate-200"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center border-4 border-slate-200">
                  <User size={64} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="mt-4 text-center">
              <span
                className={`inline-block px-4 py-2 rounded-xl text-sm font-black ${
                  member.membership.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {member.membership.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Salutation
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.personalInfo.salutation || "—"}
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Display Name
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.personalInfo.displayName || "—"}
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                First Name
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.personalInfo.firstName}
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Last Name
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.personalInfo.lastName}
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Date of Birth
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {formatDate(member.personalInfo.dateOfBirth)}
                <span className="text-sm text-slate-500 ml-2">
                  ({calculateAge(member.personalInfo.dateOfBirth)} years old)
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Gender
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.personalInfo.gender || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Mail size={24} />
          Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
              <Mail size={14} />
              Primary Email
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.primaryEmail || "—"}
            </p>
            {member.contact.emailOwnership && (
              <p className="text-sm text-slate-500 mt-1">
                Ownership: {member.contact.emailOwnership}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
              <Phone size={14} />
              Phone
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.phone || "—"}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
              <Phone size={14} />
              Mobile
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.mobile || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <MapPin size={24} />
          Address
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase text-slate-400">
              Street Address
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.street || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Suburb
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.suburb || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              State
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.state || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Postcode
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.postcode || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Country
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.country || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Membership & Roles */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Award size={24} />
          Membership & Roles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Membership Type
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.membership.membershipType || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Join Date
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {formatDate(member.membership.joinDate)}
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-3 block">
            Roles
          </label>
          {member.roles && member.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {member.roles.map((roleId, idx) => {
                const displayName = getRoleDisplayName(roleId, roles);
                const colorClass = getRoleColor(roleId, roles);

                return (
                  <span
                    key={idx}
                    className={`px-3 py-2 rounded-xl text-sm font-bold ${colorClass}`}
                  >
                    {displayName}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 italic">No roles assigned</p>
          )}
        </div>

        {/* Player Info */}
        {member.playerInfo && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-black text-slate-700 mb-4">
              Player Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Jersey Number
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.playerInfo.jerseyNumber || "—"}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Position
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.playerInfo.position || "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Healthcare */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Heart size={24} />
          Healthcare Information
        </h2>

        {/* Medicare */}
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-700 mb-4">Medicare</h3>
          {member.healthcare.medicare ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Card Number
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.healthcare.medicare.number}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Position
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.healthcare.medicare.position}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Expiry
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.healthcare.medicare.expiryMonth}/
                  {member.healthcare.medicare.expiryYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">
              No Medicare information provided
            </p>
          )}
        </div>

        {/* Private Health */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-lg font-black text-slate-700 mb-4">
            Private Health Insurance
          </h3>
          {member.healthcare.privateHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Provider
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.healthcare.privateHealth.provider}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Membership Number
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {member.healthcare.privateHealth.membershipNumber}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Expiry Date
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {formatDate(member.healthcare.privateHealth.expiryDate)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">
              No private health insurance information provided
            </p>
          )}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <AlertCircle size={24} />
          Emergency Contacts
        </h2>

        {member.emergencyContacts && member.emergencyContacts.length > 0 ? (
          <div className="space-y-4">
            {member.emergencyContacts
              .sort((a, b) => a.priority - b.priority)
              .map((contact) => (
                <div
                  key={contact.contactId}
                  className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">
                        {contact.name}
                      </h3>
                      <p className="text-sm font-bold text-slate-500">
                        {contact.relationship}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-black">
                      Priority {contact.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700">
                          {contact.phone}
                        </span>
                      </div>
                    )}

                    {contact.mobile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700">
                          {contact.mobile}
                        </span>
                      </div>
                    )}

                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700 truncate">
                          {contact.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-slate-500 italic">
            No emergency contacts provided
          </p>
        )}
      </div>

      {/* Medical Information */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Shield size={24} />
          Medical Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Medical Conditions
            </label>
            <p className="text-base font-bold text-slate-800 mt-2 whitespace-pre-wrap">
              {member.medical.conditions || "None reported"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Medications
            </label>
            <p className="text-base font-bold text-slate-800 mt-2 whitespace-pre-wrap">
              {member.medical.medications || "None reported"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Allergies
            </label>
            <p className="text-base font-bold text-slate-800 mt-2 whitespace-pre-wrap">
              {member.medical.allergies || "None reported"}
            </p>
          </div>
        </div>
      </div>

      {/* Family Relationships */}
      {member.familyRelationships && member.familyRelationships.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
            <Users size={24} />
            Family Relationships
          </h2>

          <div className="space-y-3">
            {member.familyRelationships.map((rel) => {
              const relatedMember = relatedMembers[rel.relatedMemberId];

              return (
                <div
                  key={rel.relationshipId}
                  className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-lg font-black text-slate-800">
                      {relatedMember ? (
                        <Link
                          href={`/clubs/${clubId}/members/${rel.relatedMemberId}`}
                          className="hover:text-[#06054e] transition-colors"
                        >
                          {relatedMember.personalInfo.displayName ||
                            `${relatedMember.personalInfo.firstName} ${relatedMember.personalInfo.lastName}`}
                        </Link>
                      ) : (
                        rel.relatedMemberId
                      )}
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                      {rel.forwardRelation}
                      {relatedMember && (
                        <span className="ml-2 text-xs text-slate-400">
                          ({relatedMember.memberId})
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black">
                    {rel.relationshipType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Calendar size={24} />
          Record Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Created
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {formatDate(member.createdAt)}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Last Updated
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {formatDate(member.updatedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
