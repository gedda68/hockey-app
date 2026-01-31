// components/ClubRegistrationForm.tsx
// Form for members to register for a club

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Shield,
  Star,
  Info,
  UserPlus,
  Building2,
} from "lucide-react";

interface Club {
  id: string;
  name: string;
  slug: string;
}

interface Role {
  id: string;
  name: string;
  category: string;
}

interface MemberRegistrationSummary {
  hasPrimaryClub: boolean;
  primaryClub?: {
    clubId: string;
    clubName: string;
    status: string;
  };
  secondaryClubs: Array<{
    clubId: string;
    clubName: string;
    status: string;
  }>;
}

interface ClubRegistrationFormProps {
  club: Club;
  memberId: string;
  roles: Role[];
  currentRegistrations: MemberRegistrationSummary;
}

export default function ClubRegistrationForm({
  club,
  memberId,
  roles,
  currentRegistrations,
}: ClubRegistrationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Determine registration type
  const hasPrimaryClub = currentRegistrations.hasPrimaryClub;
  const registrationType = hasPrimaryClub ? "secondary" : "primary";

  // Form state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [membershipType, setMembershipType] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    if (selectedRoles.length === 0) {
      setError("Please select at least one role");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/clubs/${club.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          registrationType,
          roleIds: selectedRoles,
          membershipType: membershipType || undefined,
          registrationNotes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration");
      }

      setSuccess(
        `Registration submitted successfully! Status: ${data.registration.status}`
      );

      // Redirect after delay
      setTimeout(() => {
        router.push(`/clubs/${club.slug}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  // Group roles by category
  const rolesByCategory = roles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<string, typeof roles>);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">
              Register for {club.name}
            </h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              {registrationType === "primary"
                ? "Primary Club Registration"
                : "Secondary Club Registration"}
            </p>
          </div>
        </div>

        {/* Registration Type Info */}
        <div
          className={`p-4 rounded-xl border-2 ${
            registrationType === "primary"
              ? "bg-blue-50 border-blue-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {registrationType === "primary" ? (
              <Shield size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            ) : (
              <Star size={24} className="text-green-600 flex-shrink-0 mt-1" />
            )}
            <div>
              <h3 className="font-black text-slate-800 mb-1">
                {registrationType === "primary"
                  ? "This will be your primary club"
                  : "Adding as secondary club"}
              </h3>
              <p className="text-sm font-bold text-slate-600">
                {registrationType === "primary" ? (
                  <>
                    Your primary club is your main club affiliation. You can
                    only have one primary club, but can register with multiple
                    secondary clubs.
                  </>
                ) : (
                  <>
                    You are already registered with{" "}
                    <span className="font-black">
                      {currentRegistrations.primaryClub?.clubName}
                    </span>{" "}
                    as your primary club. This will be added as a secondary
                    registration.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Current Registrations Summary */}
        {currentRegistrations.secondaryClubs.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <h4 className="font-black text-slate-700 mb-2 flex items-center gap-2">
              <Info size={16} />
              Your Current Registrations
            </h4>
            <div className="space-y-1 text-sm">
              <div className="font-bold text-slate-600">
                Primary:{" "}
                <span className="text-[#06054e]">
                  {currentRegistrations.primaryClub?.clubName}
                </span>
              </div>
              {currentRegistrations.secondaryClubs.length > 0 && (
                <div className="font-bold text-slate-600">
                  Secondary: {currentRegistrations.secondaryClubs.length} club
                  {currentRegistrations.secondaryClubs.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={24}
              className="text-red-600 flex-shrink-0 mt-1"
            />
            <div>
              <h3 className="text-lg font-black text-red-800 mb-1">
                Registration Error
              </h3>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-4 border-green-500 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <Check size={24} className="text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-black text-green-800 mb-1">
                Registration Submitted
              </h3>
              <p className="text-green-700 font-bold">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Roles Selection */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-4">
            Select Your Roles <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm font-bold text-slate-600 mb-6">
            Choose one or more roles that describe your involvement with the
            club
          </p>

          <div className="space-y-6">
            {Object.entries(rolesByCategory).map(
              ([category, categoryRoles]) => (
                <div key={category}>
                  <h3 className="text-sm font-black uppercase text-slate-500 mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryRoles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedRoles.includes(role.id)
                            ? "bg-yellow-50 border-yellow-400"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="w-5 h-5 rounded border-2 border-slate-300"
                        />
                        <span className="font-bold text-slate-800">
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Membership Type */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-4">
            Membership Type
          </h2>
          <p className="text-sm font-bold text-slate-600 mb-4">
            Optional - Select if applicable
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["Playing", "Social", "Life Member"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMembershipType(type)}
                className={`px-6 py-4 rounded-xl font-bold transition-all ${
                  membershipType === type
                    ? "bg-[#06054e] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-4">
            Additional Information
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information you'd like to provide (optional)"
            rows={4}
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedRoles.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Submit Registration
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500 font-bold text-center mt-4">
            Your registration will be reviewed by club administrators
          </p>
        </div>
      </form>
    </div>
  );
}
