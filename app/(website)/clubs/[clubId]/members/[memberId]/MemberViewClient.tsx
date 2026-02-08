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

interface ConfigItem {
  configId: string;
  configType: string;
  configKey: string;
  configValue: string;
  displayOrder: number;
  isActive: boolean;
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
  healthcare?: {
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

function getConfigDisplayName(
  configKey: string,
  configType: string,
  configItems: ConfigItem[],
): string {
  const config = configItems.find(
    (c) => c.configType === configType && c.configKey === configKey,
  );
  return config?.configValue || configKey;
}

export default function MemberViewClient({
  clubId,
  memberId,
}: MemberViewClientProps) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [configItems, setConfigItems] = useState<ConfigItem[]>([]);
  const [relatedMembers, setRelatedMembers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [clubId, memberId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch member and roles (required)
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

      // Try to fetch config items (optional - gracefully handle if not available)
      try {
        const configRes = await fetch(`/api/admin/config?activeOnly=true`);
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfigItems(configData);
        } else {
          console.warn("Config API not available, will display raw values");
          setConfigItems([]);
        }
      } catch (configError) {
        console.warn(
          "Config API not available, will display raw values",
          configError,
        );
        setConfigItems([]);
      }

      // Fetch related members if any
      if (memberData.familyRelationships?.length > 0) {
        const relatedIds = memberData.familyRelationships.map(
          (r: any) => r.relatedMemberId,
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
        }? This action cannot be undone.`,
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
        `Are you sure you want to make this member ${newStatus.toLowerCase()}?`,
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
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading member...</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            Error Loading Member
          </h2>
          <p className="text-slate-600 mb-6">{error || "Member not found"}</p>
          <Link
            href={`/clubs/${clubId}/members`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white font-bold rounded-xl hover:bg-[#0a0866] transition-all"
          >
            <ArrowLeft size={20} />
            Back to Members
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Link
          href={`/clubs/${clubId}/members`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Members
        </Link>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {member.personalInfo.photoUrl ? (
                  <img
                    src={member.personalInfo.photoUrl}
                    alt={member.personalInfo.displayName}
                    className="w-20 h-20 rounded-full object-cover border-4 border-slate-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#06054e] to-[#0a0866] flex items-center justify-center border-4 border-slate-100">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-black text-[#06054e]">
                  {member.personalInfo.displayName ||
                    `${member.personalInfo.firstName} ${member.personalInfo.lastName}`}
                </h1>
                <p className="text-slate-500 font-bold">
                  Member ID: {member.memberId}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-black ${
                      member.membership.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {member.membership.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleToggleStatus}
                className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2"
              >
                {member.membership.status === "Active" ? (
                  <>
                    <Ban size={16} />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Activate
                  </>
                )}
              </button>

              <Link
                href={`/clubs/${clubId}/members/${memberId}/edit`}
                className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2"
              >
                <Edit size={16} />
                Edit
              </Link>

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <User size={24} />
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Salutation
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {getConfigDisplayName(
                member.personalInfo.salutation,
                "salutation",
                configItems,
              )}
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
              Display Name
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.personalInfo.displayName || "N/A"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Gender
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {getConfigDisplayName(
                member.personalInfo.gender,
                "gender",
                configItems,
              )}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Date of Birth
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {formatDate(member.personalInfo.dateOfBirth)}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Mail size={24} />
          Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Primary Email
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.primaryEmail}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Email Ownership
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.emailOwnership}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Phone
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.phone || "N/A"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Mobile
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.contact.mobile || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Home size={24} />
          Address
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase text-slate-400">
              Street
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.street}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Suburb
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.suburb}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              State
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.state}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Postcode
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.postcode}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Country
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.address.country}
            </p>
          </div>
        </div>
      </div>

      {/* Membership & Roles */}
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
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
              {getConfigDisplayName(
                member.membership.membershipType,
                "membershipType",
                configItems,
              )}
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

        {member.roles && member.roles.length > 0 && (
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-3 block">
              Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {member.roles.map((roleId) => (
                <span
                  key={roleId}
                  className={`px-4 py-2 rounded-lg font-black text-sm ${getRoleColor(
                    roleId,
                    roles,
                  )}`}
                >
                  {getRoleDisplayName(roleId, roles)}
                </span>
              ))}
            </div>
          </div>
        )}

        {member.playerInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Jersey Number
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.playerInfo.jerseyNumber || "N/A"}
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Position
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.playerInfo.position || "N/A"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Healthcare */}
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Heart size={24} />
          Healthcare Information
        </h2>

        {/* Medicare */}
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-700 mb-4">Medicare</h3>
          {member.healthcare?.medicare ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Medicare Number
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
          {member.healthcare?.privateHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Provider
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {getConfigDisplayName(
                    member.healthcare.privateHealth.provider,
                    "privateHealthProvider",
                    configItems,
                  )}
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
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
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
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
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
              {member.medical?.conditions || "None reported"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Medications
            </label>
            <p className="text-base font-bold text-slate-800 mt-2 whitespace-pre-wrap">
              {member.medical?.medications || "None reported"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Allergies
            </label>
            <p className="text-base font-bold text-slate-800 mt-2 whitespace-pre-wrap">
              {member.medical?.allergies || "None reported"}
            </p>
          </div>
        </div>
      </div>

      {/* Family Relationships */}
      {member.familyRelationships && member.familyRelationships.length > 0 && (
        <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
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
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
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
