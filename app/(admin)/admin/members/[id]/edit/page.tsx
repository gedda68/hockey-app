// app/(admin)/admin/members/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errors";
import { useRouter } from "next/navigation";
import {
  Save,
  X,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Shield,
  Users,
  AlertCircle,
  History,
  Trophy,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

// Step Components
import PersonalInfoStep from "@/components/admin/members/wizard/PersonalInfoStep";
import ContactInfoStep from "@/components/admin/members/wizard/ContactInfoStep";
import EmergencyContactStep from "@/components/admin/members/wizard/EmergencyContactStep";
import AddressStep from "@/components/admin/members/wizard/AddressStep";
import BlueCardSection from "@/components/admin/members/BlueCardSection";
import { canVerifyBlueCard } from "@/lib/members/blueCardWorkflow";
import { useAuth } from "@/lib/auth/AuthContext";
import { requiresBlueCard, hasBlueCardData, nonPlayerRoles } from "@/lib/members/blueCard";
import SocialPreferences, { mergedSocial } from "@/components/admin/members/SocialPreferences";
import type { TeamHistoryRow } from "@/lib/members/teamHistory";
import PlayerDetails from "@/components/admin/members/PlayerDetails";
import { hasPlayerHistory, type PlayerStats } from "@/lib/members/playerStats";
import MemberRecordDetails from "@/components/admin/members/MemberRecordDetails";
import MembershipStep from "@/components/admin/members/wizard/MembershipStep";
import MedicalStep from "@/components/admin/members/wizard/MedicalStep";

export default function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Guard for Next.js 15+ Async Params
  const resolvedParams = params ? use(params) : null;
  const memberId = resolvedParams?.id;

  const router = useRouter();
  const [originalData, setOriginalData] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [related, setRelated] = useState<any>(undefined);
  const { user: authUser } = useAuth();
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [teamHistory, setTeamHistory] = useState<TeamHistoryRow[]>([]);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    const fetchMember = async () => {
      try {
        const res = await fetch(`/api/admin/members/${memberId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load member");

        // Normalize data structure
        const member = data.member;
        const normalized = {
          ...member,
          personalInfo: {
            ...(member.personalInfo || {}),
            salutation: member.personalInfo?.salutation || "",
            firstName: member.personalInfo?.firstName || "",
            middleName: member.personalInfo?.middleName || "",
            lastName: member.personalInfo?.lastName || "",
            displayName: member.personalInfo?.displayName || "",
            dateOfBirth: member.personalInfo?.dateOfBirth || "",
            gender: member.personalInfo?.gender || "",
            photoUrl: member.personalInfo?.photoUrl || "",
            relatedMembers: member.personalInfo?.relatedMembers || [],
          },
          contact: {
            ...(member.contact || {}),
            // Imported members store the address as primaryEmail; the wizard saves it as email.
            email: member.contact?.email || member.contact?.primaryEmail || "",
            phone: member.contact?.phone || "",
            mobile: member.contact?.mobile || "",
            emergencyContact: (() => {
              const ec = member.contact?.emergencyContact?.name
                ? member.contact.emergencyContact
                : member.emergencyContacts?.[0] || member.contact?.emergencyContact || {};
              return {
                ...ec,
                name: ec.name || "",
                relationship: ec.relationship || "",
                phone: ec.phone || ec.mobile || "",
                email: ec.email || "",
              };
            })(),
          },
          address: {
            ...(member.address || {}),
            street: member.address?.street || "",
            suburb: member.address?.suburb || "",
            state: member.address?.state || "",
            postcode: member.address?.postcode || "",
            country: member.address?.country || "Australia",
          },
          membership: {
            ...(member.membership || {}),
            joinDate: member.membership?.joinDate || "",
            membershipTypes: member.membership?.membershipTypes || [],
            status: member.membership?.status || "Active",
            expiryDate: member.membership?.expiryDate || "",
            renewalDate: member.membership?.renewalDate || "",
            clubId: member.membership?.clubId || member.clubId || "",
            clubName: member.membership?.clubName || "",
          },
          medical: {
            ...(member.medical || {}),
            conditions: member.medical?.conditions || "",
            medications: member.medical?.medications || "",
            allergies: member.medical?.allergies || "",
            doctorName: member.medical?.doctorName || "",
            doctorPhone: member.medical?.doctorPhone || "",
            medicare: {
              number: member.medical?.medicare?.number || member.healthcare?.medicare?.number || "",
              referenceNumber: member.medical?.medicare?.referenceNumber || "",
              expiryDate: member.medical?.medicare?.expiryDate || "",
              cardColor: member.medical?.medicare?.cardColor || "",
            },
            privateHealth: {
              hasInsurance: member.medical?.privateHealth?.hasInsurance || false,
              provider: member.medical?.privateHealth?.provider || member.healthcare?.privateHealth?.provider || "",
              membershipNumber:
                member.medical?.privateHealth?.membershipNumber || "",
              policyType: member.medical?.privateHealth?.policyType || "",
              coverLevel: member.medical?.privateHealth?.coverLevel || "",
              expiryDate: member.medical?.privateHealth?.expiryDate || "",
              ambulanceCover:
                member.medical?.privateHealth?.ambulanceCover || false,
              emergencyNumber:
                member.medical?.privateHealth?.emergencyNumber || "",
              notes: member.medical?.privateHealth?.notes || "",
            },
            additionalNotes: member.medical?.additionalNotes || "",
          },
          roles: member.roles || [],
          teams: member.teams || [],
          clubId: member.clubId || "",
          associationId: member.associationId || "",
          notes: member.notes || "",
        };

        setRelated(data.related);
        setPlayerStats(data.playerStats ?? null);
        setTeamHistory(data.teamHistory ?? []);
        setOriginalData(JSON.parse(JSON.stringify(normalized)));
        setFormData(normalized);
        setRoles(normalized.roles);
      } catch (error) {
        toast.error(getErrorMessage(error));
        router.push("/admin/members");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchMember();
  }, [memberId, router]);

  // Fetch change history
  const fetchChangeHistory = async () => {
    try {
      const res = await fetch(`/api/admin/members/${memberId}/history`);
      if (res.ok) {
        const data = await res.json();
        setChangeHistory(data.changes || []);
      }
    } catch (error) {
      console.error("Error fetching change history:", error);
    }
  };

  // Detect what changed
  const getChangedFields = (section: string, oldData: any, newData: any) => {
    const changes: any = {};

    const compareObjects = (obj1: any, obj2: any, prefix = "") => {
      Object.keys(obj2).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
          typeof obj2[key] === "object" &&
          obj2[key] !== null &&
          !Array.isArray(obj2[key])
        ) {
          compareObjects(obj1?.[key] || {}, obj2[key], fullKey);
        } else if (JSON.stringify(obj1?.[key]) !== JSON.stringify(obj2[key])) {
          changes[fullKey] = {
            old: obj1?.[key],
            new: obj2[key],
          };
        }
      });
    };

    compareObjects(oldData, newData);
    return changes;
  };

  const handleSectionSave = async (
    sectionName: string,
    sectionKey: string | string[],
  ) => {
    setIsSaving(sectionName);

    try {
      // Detect changes (a section can span several top-level keys)
      const keys = Array.isArray(sectionKey) ? sectionKey : [sectionKey];
      const changes: Record<string, any> = {};
      for (const k of keys) {
        const found = getChangedFields(k, originalData[k] ?? {}, formData[k] ?? {});
        for (const [path, v] of Object.entries(found)) {
          changes[keys.length > 1 ? `${k}.${path}` : path] = v;
        }
      }

      if (Object.keys(changes).length === 0) {
        toast.info("No changes to save");
        setIsSaving(null);
        return;
      }

      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contact: {
            ...formData.contact,
            primaryEmail: formData.contact?.email || formData.contact?.primaryEmail || "",
          },
          _changeLog: {
            section: sectionName,
            changes: changes,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }

      toast.success(`${sectionName} updated successfully`);

      // Update original data to reflect saved state
      setOriginalData(JSON.parse(JSON.stringify(formData)));

      // Refresh change history if visible
      if (showHistory) {
        fetchChangeHistory();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-bold italic">
          Loading Member Data...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/admin/members/${memberId}`}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-2 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Profile
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Edit Member
          </h1>
          <p className="text-slate-600 font-medium">
            {formData.personalInfo.displayName || "No Name"} •{" "}
            {formData.memberId}
          </p>
        </div>

        {/* Change History Button */}
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchChangeHistory();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors"
        >
          <History size={18} />
          {showHistory ? "Hide History" : "View History"}
        </button>
      </div>

      {/* Change History Sidebar */}
      {showHistory && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
            <History size={20} />
            Change History
          </h3>

          {changeHistory.length === 0 ? (
            <p className="text-slate-500 text-sm">No changes recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {changeHistory.map((change: any, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">
                      {change.section}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(change.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    {Object.entries(change.changes).map(
                      ([field, values]: any) => (
                        <div key={field} className="flex gap-2">
                          <span className="font-semibold">{field}:</span>
                          <span className="text-red-600 line-through">
                            {values.old || "(empty)"}
                          </span>
                          <span>→</span>
                          <span className="text-green-600">
                            {values.new || "(empty)"}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                  {change.updatedBy && (
                    <p className="text-xs text-slate-400 mt-2">
                      By: {change.updatedBy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Sections */}
      <div className="grid gap-6">
        {/* Personal Information */}
        <EditCard
          title="Personal Information"
          icon={<User className="text-blue-600" />}
          onSave={() =>
            handleSectionSave("Personal Information", "personalInfo")
          }
          isSaving={isSaving === "Personal Information"}
        >
          <PersonalInfoStep
            data={formData.personalInfo}
            onChange={(val) => setFormData({ ...formData, personalInfo: val })}
            errors={{}}
          />
        </EditCard>

        {/* Contact Information */}
        <EditCard
          title="Contact Information"
          icon={<Mail className="text-blue-600" />}
          onSave={() => handleSectionSave("Contact Information", "contact")}
          isSaving={isSaving === "Contact Information"}
        >
          <ContactInfoStep
            data={formData.contact}
            onChange={(val) => setFormData({ ...formData, contact: val })}
            errors={{}}
          />
        </EditCard>

        {/* Emergency Contact */}
        <EditCard
          title="Emergency Contact"
          icon={<AlertCircle className="text-orange-600" />}
          onSave={() => handleSectionSave("Emergency Contact", "contact")}
          isSaving={isSaving === "Emergency Contact"}
        >
          <EmergencyContactStep
            data={formData.contact.emergencyContact}
            onChange={(val) =>
              setFormData({
                ...formData,
                contact: { ...formData.contact, emergencyContact: val },
              })
            }
            errors={{}}
          />
        </EditCard>

        {/* Address */}
        <EditCard
          title="Address"
          icon={<MapPin className="text-green-600" />}
          onSave={() => handleSectionSave("Address", "address")}
          isSaving={isSaving === "Address"}
        >
          <AddressStep
            data={formData.address}
            onChange={(val) => setFormData({ ...formData, address: val })}
            errors={{}}
          />
        </EditCard>

        {/* Membership Details */}
        <EditCard
          title="Membership Details"
          icon={<Shield className="text-purple-600" />}
          onSave={() => handleSectionSave("Membership Details", "membership")}
          isSaving={isSaving === "Membership Details"}
        >
          <MembershipStep
            membershipData={formData.membership}
            roles={roles}
            onMembershipChange={(val) =>
              setFormData({ ...formData, membership: val })
            }
            onRolesChange={(val) => {
              setRoles(val);
              setFormData({ ...formData, roles: val });
            }}
            onClubChange={(clubId) => setFormData({ ...formData, clubId })}
            errors={{}}
          />
        </EditCard>

        {/* Everything else stored on this member (read-only) */}
        <MemberRecordDetails member={formData} related={related} teamHistory={teamHistory} hidePlayerDetails registrationsOnly hideSocial hideBlueCard />

        {/* Blue card: only when the member is over 15 with a non-player role (or a card is already on file) */}
        {(requiresBlueCard(formData) || hasBlueCardData(formData.blueCard)) && (
          <EditCard
            title="Blue Card (Working with Children)"
            icon={<ShieldCheck className="text-blue-600" />}
            onSave={() => handleSectionSave("Blue Card", "blueCard")}
            isSaving={isSaving === "Blue Card"}
          >
            <BlueCardSection
              value={formData.blueCard}
              required={requiresBlueCard(formData)}
              clubId={formData.membership?.clubId || formData.clubId}
              canVerify={canVerifyBlueCard(authUser, formData)}
              roleNames={nonPlayerRoles(formData.roles).map((r) => r.replace(/^role-/, "").replace(/-/g, " "))}
              onChange={(next) => setFormData({ ...formData, blueCard: next })}
            />
          </EditCard>
        )}

        {/* Social links and contact preferences, each public or private */}
        <EditCard
          title="Social & Preferences"
          icon={<Share2 className="text-pink-600" />}
          onSave={() =>
            handleSectionSave("Social & Preferences", ["socialMedia", "communicationPreferences", "privacy"])
          }
          isSaving={isSaving === "Social & Preferences"}
        >
          <SocialPreferences
            value={{
              socialMedia: mergedSocial(formData),
              communicationPreferences: formData.communicationPreferences || {},
              privacy: formData.privacy || {},
            }}
            onChange={(v) =>
              setFormData({
                ...formData,
                socialMedia: v.socialMedia,
                communicationPreferences: v.communicationPreferences,
                privacy: v.privacy,
              })
            }
          />
        </EditCard>

        {/* Player details — for anyone who is or was a player */}
        {hasPlayerHistory(formData, playerStats) && (
          <EditCard
            title="Player Details"
            icon={<Trophy className="text-orange-600" />}
            onSave={() => handleSectionSave("Player Details", "playerInfo")}
            isSaving={isSaving === "Player Details"}
          >
            <PlayerDetails
              playerInfo={formData.playerInfo}
              stats={playerStats}
              onChange={(next) => setFormData({ ...formData, playerInfo: next })}
            />
          </EditCard>
        )}

        {/* Medical Information */}
        <EditCard
          title="Medical Information"
          icon={<Heart className="text-red-600" />}
          onSave={() => handleSectionSave("Medical Information", "medical")}
          isSaving={isSaving === "Medical Information"}
        >
          <MedicalStep
            data={formData.medical}
            onChange={(val) => setFormData({ ...formData, medical: val })}
            errors={{}}
          />
        </EditCard>
      </div>

      {/* Save All Button
      <div className="sticky bottom-6 flex justify-center">
        <button
          onClick={async () => {
            const sections = [
              { name: "Personal Information", key: "personalInfo" },
              { name: "Contact Information", key: "contact" },
              { name: "Address", key: "address" },
              { name: "Membership Details", key: "membership" },
              { name: "Medical Information", key: "medical" },
            ];

            for (const section of sections) {
              await handleSectionSave(section.name, section.key);
            }
          }}
          className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-105"
        >
          <Save size={24} />
          Save All Changes
        </button>
      </div> */}
    </div>
  );
}

// Reusable EditCard Component
function EditCard({
  title,
  icon,
  children,
  onSave,
  isSaving,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSave: () => void;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all hover:shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
            {icon}
          </div>
          <h3 className="font-black text-slate-900 tracking-tight text-lg">
            {title}
          </h3>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-5 py-2 bg-[#06054e] text-white rounded-lg font-bold hover:bg-blue-700 text-sm transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Cancel"
            >
              <X size={20} />
            </button>
            <button
              onClick={async () => {
                await onSave();
                setIsEditing(false);
              }}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={`p-6 transition-all duration-200 ${
          !isEditing
            ? "opacity-50 pointer-events-none select-none bg-slate-50/50"
            : "bg-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
