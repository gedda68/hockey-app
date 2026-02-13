// app/(website)/clubs/[clubId]/members/[memberId]/MemberViewClient.tsx
// Modular member view with permission-based sections

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MemberHeader from "@/components/member-sections/MemberHeader";
import PersonalInfoSection from "@/components/member-sections/PersonalInfoSection";
import AddressSection from "@/components/member-sections/AddressSection";
import HealthcareSection from "@/components/member-sections/HealthcareSection";
import MembershipSection from "@/components/member-sections/MembershipSection";
import { User, MapPin, Heart, Award } from "lucide-react";

interface MemberViewClientProps {
  clubId: string;
  memberId: string;
}

// Section navigation for view page
interface ViewSection {
  id: string;
  title: string;
  icon: any;
  permission: string;
}

const VIEW_SECTIONS: ViewSection[] = [
  {
    id: "personal",
    title: "Personal & Contact",
    icon: User,
    permission: "view_personal",
  },
  { id: "address", title: "Address", icon: MapPin, permission: "view_address" },
  {
    id: "healthcare",
    title: "Healthcare & Emergency",
    icon: Heart,
    permission: "view_healthcare",
  },
  {
    id: "membership",
    title: "Membership & Roles",
    icon: Award,
    permission: "view_membership",
  },
];

export default function MemberViewClient({
  clubId,
  memberId,
}: MemberViewClientProps) {
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [configItems, setConfigItems] = useState<any[]>([]);
  const [relatedMembers, setRelatedMembers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("personal");

  // TODO: Replace with actual permission check from user session
  const [permissions, setPermissions] = useState({
    view_personal: true,
    view_address: true,
    view_healthcare: true, // Set to false to test permission blocking
    view_membership: true,
    view_private_social: true, // For private social media links
  });

  useEffect(() => {
    fetchData();
  }, [clubId, memberId]);

  const fetchData = async () => {
    try {
      // Fetch member
      const memberRes = await fetch(`/api/clubs/${clubId}/members/${memberId}`);
      if (!memberRes.ok) throw new Error("Failed to fetch member");
      const memberData = await memberRes.json();
      setMember(memberData);

      // Fetch config items
      const configRes = await fetch(`/api/clubs/${clubId}/config`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfigItems(configData);
      }

      // Fetch related members if family relationships exist
      if (
        memberData.familyRelationships &&
        memberData.familyRelationships.length > 0
      ) {
        const relatedIds = memberData.familyRelationships.map(
          (r: any) => r.relatedMemberId,
        );
        const relatedData: Record<string, any> = {};

        for (const relatedId of relatedIds) {
          try {
            const res = await fetch(
              `/api/clubs/${clubId}/members/${relatedId}`,
            );
            if (res.ok) {
              relatedData[relatedId] = await res.json();
            }
          } catch (err) {
            console.error(`Failed to fetch related member ${relatedId}:`, err);
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

  const handleToggleStatus = async () => {
    if (!member) return;

    const newStatus =
      member.membership.status === "Active" ? "Inactive" : "Active";

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

      if (!res.ok) throw new Error("Failed to update status");

      const updatedMember = await res.json();
      setMember(updatedMember);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this member? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete member");

      router.push(`/clubs/${clubId}/members`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Filter sections based on permissions
  const visibleSections = VIEW_SECTIONS.filter(
    (section) => permissions[section.permission as keyof typeof permissions],
  );

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
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <p className="text-xl font-bold text-red-600 mb-4">Error</p>
          <p className="text-slate-600 mb-6">{error || "Member not found"}</p>
          <Link
            href={`/clubs/${clubId}/members`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white font-bold rounded-xl hover:bg-[#0a0866]"
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
      <div className="max-w-6xl mx-auto mb-6">
        <Link
          href={`/clubs/${clubId}/members`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Members
        </Link>

        <MemberHeader
          clubId={clubId}
          memberId={memberId}
          member={member}
          currentPage="view"
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          showActions={{
            deactivate: true,
            edit: true,
            renew: true,
            history: true,
            delete: true,
          }}
        />

        {/* Section Navigation */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    document.getElementById(section.id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="flex-1 min-w-[150px]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-purple-600 text-white scale-110"
                          : "bg-slate-200 text-slate-400 hover:bg-purple-100 hover:text-purple-600"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <p
                      className={`text-xs font-bold text-center transition-all ${
                        isActive ? "text-purple-600" : "text-slate-400"
                      }`}
                    >
                      {section.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-center text-sm text-purple-600 font-bold">
              💡 Click any section to jump directly to that section
            </p>
          </div>
        </div>
      </div>

      {/* Section Components */}
      {permissions.view_personal && (
        <PersonalInfoSection
          member={member}
          configItems={configItems}
          canViewPrivate={permissions.view_private_social}
        />
      )}

      {permissions.view_address && <AddressSection member={member} />}

      {permissions.view_healthcare && (
        <HealthcareSection
          member={member}
          configItems={configItems}
          canViewHealthcare={permissions.view_healthcare}
        />
      )}

      {permissions.view_membership && (
        <MembershipSection
          member={member}
          configItems={configItems}
          relatedMembers={relatedMembers}
        />
      )}
    </div>
  );
}
