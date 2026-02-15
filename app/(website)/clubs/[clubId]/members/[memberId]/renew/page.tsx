// app/(website)/clubs/[clubId]/members/[memberId]/renew/page.tsx
// Comprehensive membership renewal with full member edit

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Calendar,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Shield,
  Award,
  Save,
  RotateCcw,
} from "lucide-react";
import SocialMediaEditor from "@/components/SocialMediaEditor";
import MemberHeader from "@/components/MemberHeader";

interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

interface Member {
  memberId: string;
  personalInfo: {
    salutation: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    dateOfBirth: string;
    gender: string;
    photoUrl?: string | null;
  };
  contact: {
    primaryEmail: string;
    emailOwnership: string;
    phone?: string;
    mobile?: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  socialMedia?: SocialMediaLink[];
  healthcare?: {
    medicare?: {
      number: string;
      position: string;
      expiryMonth: string;
      expiryYear: string;
    } | null;
    privateHealth?: {
      provider: string;
      membershipNumber: string;
      expiryDate: string;
    } | null;
  };
  emergencyContacts?: Array<{
    contactId: string;
    priority: number;
    name: string;
    relationship: string;
    phone?: string;
    mobile?: string;
    email?: string;
  }>;
  membership: {
    membershipType: string;
    status: string;
    joinDate: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  roles: string[];
  medical?: {
    conditions?: string;
    medications?: string;
    allergies?: string;
  };
}

interface RenewalPageProps {
  params: Promise<{
    clubId: string;
    memberId: string;
  }>;
}

export default function ComprehensiveRenewalPage({ params }: RenewalPageProps) {
  const { clubId, memberId } = use(params);
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // Form state - all member fields editable
  const [personalInfo, setPersonalInfo] = useState<any>({});
  const [contact, setContact] = useState<any>({});
  const [address, setAddress] = useState<any>({});
  const [socialMedia, setSocialMedia] = useState<SocialMediaLink[]>([]);
  const [healthcare, setHealthcare] = useState<any>({});
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [membership, setMembership] = useState<any>({});
  const [medical, setMedical] = useState<any>({});
  const [roles, setRoles] = useState<string[]>([]);

  // New renewal period
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");
  const [renewalNotes, setRenewalNotes] = useState("");

  useEffect(() => {
    fetchMember();
  }, [clubId, memberId]);

  const fetchMember = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch member");
      }

      const data = await res.json();
      setMember(data);

      // Pre-fill all form fields
      setPersonalInfo(data.personalInfo || {});
      setContact(data.contact || {});
      setAddress(data.address || {});
      setSocialMedia(data.socialMedia || []);
      setHealthcare(data.healthcare || {});
      setEmergencyContacts(data.emergencyContacts || []);
      setMembership(data.membership || {});
      setMedical(data.medical || {});
      setRoles(data.roles || []);

      // Calculate next renewal period
      const nextYear = new Date().getFullYear() + 1;
      setNewPeriodStart(`${nextYear}-01-01`);
      setNewPeriodEnd(`${nextYear}-12-31`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenewal = async () => {
    setIsProcessing(true);
    setError("");

    try {
      // First update member details
      const updateRes = await fetch(
        `/api/clubs/${clubId}/members/${memberId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personalInfo,
            contact,
            address,
            socialMedia,
            healthcare,
            emergencyContacts,
            medical,
            roles,
          }),
        },
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update member details");
      }

      // Then process renewal
      const renewRes = await fetch(
        `/api/clubs/${clubId}/members/${memberId}/renew`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipType: membership.membershipType,
            targetYear: new Date(newPeriodStart).getFullYear(),
            notes: renewalNotes,
          }),
        },
      );

      if (!renewRes.ok) {
        throw new Error("Failed to process renewal");
      }

      alert("✅ Membership renewed and details updated successfully!");
      router.push(`/clubs/${clubId}/members/${memberId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading member...</p>
        </div>
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href={`/clubs/${clubId}/members/${memberId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700"
          >
            <ArrowLeft size={20} />
            Back to Member
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: "Renewal Period", icon: Calendar },
    { num: 2, title: "Personal & Contact", icon: User },
    { num: 3, title: "Address", icon: MapPin },
    { num: 4, title: "Healthcare & Emergency", icon: Heart },
    { num: 5, title: "Review & Confirm", icon: Check },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/clubs/${clubId}/members/${memberId}`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-purple-600 font-bold mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Member
        </Link>

        {/* Member Header */}
        {member && (
          <MemberHeader
            clubId={clubId}
            memberId={memberId}
            member={member}
            currentPage="renew"
            showActions={{
              deactivate: false,
              edit: true,
              renew: false, // Don't show renew button on renew page
              history: true,
              delete: false,
            }}
          />
        )}

        {/* Renewal Title Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
              <RotateCcw className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800">
                Renew Membership
              </h1>
              <p className="text-slate-600 font-bold">
                Update details and extend membership period
              </p>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-6">
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isComplete = currentStep > step.num;

              return (
                <div key={step.num} className="flex-1 text-center">
                  <div
                    className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-black ${
                      isActive
                        ? "bg-purple-600 text-white"
                        : isComplete
                          ? "bg-green-500 text-white"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isComplete ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <p
                    className={`text-xs font-bold ${
                      isActive
                        ? "text-purple-600"
                        : isComplete
                          ? "text-green-600"
                          : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-6">
          {/* Step 1: Renewal Period */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-4">
                Renewal Period
              </h2>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <h3 className="font-black text-blue-800 mb-2">
                  Current Period
                </h3>
                <p className="text-blue-700 font-bold">
                  {membership.currentPeriodStart} to{" "}
                  {membership.currentPeriodEnd}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    New Period Start *
                  </label>
                  <input
                    type="date"
                    value={newPeriodStart}
                    onChange={(e) => setNewPeriodStart(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    New Period End *
                  </label>
                  <input
                    type="date"
                    value={newPeriodEnd}
                    onChange={(e) => setNewPeriodEnd(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Renewal Notes
                </label>
                <textarea
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  rows={3}
                  placeholder="Any notes about this renewal..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Personal & Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-4">
                Personal & Contact Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.firstName || ""}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.lastName || ""}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Primary Email *
                  </label>
                  <input
                    type="email"
                    value={contact.primaryEmail || ""}
                    onChange={(e) =>
                      setContact({ ...contact, primaryEmail: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contact.phone || ""}
                    onChange={(e) =>
                      setContact({ ...contact, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={contact.mobile || ""}
                    onChange={(e) =>
                      setContact({ ...contact, mobile: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Social Media */}
              <div className="pt-6 border-t border-slate-200">
                <SocialMediaEditor
                  socialMedia={socialMedia}
                  onChange={setSocialMedia}
                  readOnly={false}
                />
              </div>
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-4">
                Address
              </h2>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  Update address if member has moved to a new location or club
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address.street || ""}
                    onChange={(e) =>
                      setAddress({ ...address, street: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Suburb
                  </label>
                  <input
                    type="text"
                    value={address.suburb || ""}
                    onChange={(e) =>
                      setAddress({ ...address, suburb: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    State
                  </label>
                  <select
                    value={address.state || "QLD"}
                    onChange={(e) =>
                      setAddress({ ...address, state: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={address.postcode || ""}
                    onChange={(e) =>
                      setAddress({ ...address, postcode: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={address.country || ""}
                    onChange={(e) =>
                      setAddress({ ...address, country: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Healthcare & Emergency */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-4">
                Healthcare & Emergency Contacts
              </h2>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                <p className="text-green-800 font-bold flex items-center gap-2">
                  <Check size={16} />
                  Verify emergency contacts are still current
                </p>
              </div>

              {/* Emergency Contacts Display */}
              {emergencyContacts && emergencyContacts.length > 0 ? (
                <div className="space-y-3">
                  {emergencyContacts.map((contact, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4"
                    >
                      <div className="font-black text-slate-800 mb-1">
                        {contact.name}
                      </div>
                      <div className="text-sm text-slate-600 font-bold">
                        {contact.relationship} • Priority {contact.priority}
                      </div>
                      <div className="text-sm text-slate-600 font-bold">
                        {contact.mobile || contact.phone}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No emergency contacts</p>
              )}

              <div className="pt-4">
                <Link
                  href={`/clubs/${clubId}/members/${memberId}/edit`}
                  className="text-purple-600 hover:text-purple-700 font-bold underline"
                >
                  → Edit emergency contacts & healthcare details
                </Link>
              </div>
            </div>
          )}

          {/* Step 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-4">
                Review & Confirm Renewal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Renewal Period */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <h3 className="font-black text-purple-800 mb-2 flex items-center gap-2">
                    <Calendar size={16} />
                    New Membership Period
                  </h3>
                  <p className="text-purple-700 font-bold">
                    {newPeriodStart} to {newPeriodEnd}
                  </p>
                  {renewalNotes && (
                    <p className="text-sm text-purple-600 mt-2">
                      {renewalNotes}
                    </p>
                  )}
                </div>

                {/* Member Info */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="font-black text-blue-800 mb-2 flex items-center gap-2">
                    <User size={16} />
                    Member Details
                  </h3>
                  <p className="text-blue-700 font-bold">
                    {personalInfo.firstName} {personalInfo.lastName}
                  </p>
                  <p className="text-sm text-blue-600">
                    {contact.primaryEmail}
                  </p>
                  <p className="text-sm text-blue-600">{contact.mobile}</p>
                </div>

                {/* Address */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <h3 className="font-black text-green-800 mb-2 flex items-center gap-2">
                    <MapPin size={16} />
                    Address
                  </h3>
                  <p className="text-green-700 font-bold text-sm">
                    {address.street}
                  </p>
                  <p className="text-sm text-green-600">
                    {address.suburb}, {address.state} {address.postcode}
                  </p>
                </div>

                {/* Social Media */}
                {socialMedia && socialMedia.length > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                    <h3 className="font-black text-amber-800 mb-2">
                      Social Media Links
                    </h3>
                    <p className="text-amber-700 font-bold">
                      {socialMedia.length} platform(s) added
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-800 font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  Please confirm all details are correct before renewing
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
            >
              Previous
            </button>
          )}

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 px-6 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleRenewal}
              disabled={isProcessing}
              className="flex-1 px-6 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Confirm & Renew Membership
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
