// components/registration/CompleteRegistrationForm.tsx
// Main registration form - coordinates all steps

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EmailLookupStep from "./EmailLookupStep";
import PersonalDetailsStep from "./PersonalDetailsStep";
import RoleSelectionStep from "./RoleSelectionStep";
import RegistrationSummaryStep from "./RegistrationSummaryStep";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface CompleteRegistrationFormProps {
  clubId: string;
  clubName: string;
  availableRoles: any[];
}

export default function CompleteRegistrationForm({
  clubId,
  clubName,
  availableRoles,
}: CompleteRegistrationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedRegistration, setCompletedRegistration] = useState<any>(null);
  const [error, setError] = useState("");

  // Form data from all steps
  const [emailData, setEmailData] = useState<any>(null);
  const [personalData, setPersonalData] = useState<any>(null);
  const [roleData, setRoleData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  // Step 1: Email lookup complete
  const handleEmailComplete = (data: any) => {
    setEmailData(data);
    setCurrentStep(2);
  };

  // Step 2: Personal details complete
  const handlePersonalDetailsComplete = async (data: any) => {
    setPersonalData(data);
    setCurrentStep(3);
  };

  // Step 3: Role selection complete
  const handleRoleSelectionComplete = async (data: any) => {
    setRoleData(data);

    // Generate summary
    try {
      const res = await fetch("/api/registration/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: emailData.memberId,
          isNewMember: !emailData.isReturningPlayer,
          personalInfo: {
            ...personalData.personalInfo,
            email: emailData.email,
          },
          clubId,
          roleIds: data.roleIds,
          ageCategory: data.ageCategory,
          seasonYear: new Date().getFullYear().toString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to generate summary");

      const summaryData = await res.json();
      setSummary(summaryData);
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to generate summary");
    }
  };

  // Step 4: Submit registration
  const handleSubmit = async () => {
    try {
      const payload = {
        // Member info
        memberId: emailData.memberId,
        isNewMember: !emailData.isReturningPlayer,

        // Personal details
        personalInfo: {
          ...personalData.personalInfo,
          email: emailData.email,
        },
        address: personalData.address,
        emergencyContact: personalData.emergencyContact,
        medicalInfo: personalData.medicalInfo,

        // Registration details
        clubId,
        seasonYear: new Date().getFullYear().toString(),
        roleIds: roleData.roleIds,
        ageCategory: roleData.ageCategory,

        // Agreements
        agreedToTerms: true,
        agreedToCodeOfConduct: true,
        agreedToPrivacyPolicy: true,
        photoConsent: true,

        // Payment
        paymentMethod: "card",
      };

      const res = await fetch("/api/registration/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit registration");
      }

      const result = await res.json();
      setCompletedRegistration(result);
      setCurrentStep(5); // Success step
    } catch (err: any) {
      setError(err.message || "Failed to submit registration");
      throw err;
    }
  };

  // Success screen
  if (completedRegistration) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h1 className="text-4xl font-black text-[#06054e] mb-4">
              Registration Complete!
            </h1>
            <p className="text-xl font-bold text-slate-600 mb-2">
              Welcome to {clubName}
            </p>
            <p className="text-lg font-bold text-slate-500">
              Registration ID: {completedRegistration.registrationId}
            </p>
          </div>

          {/* Registrations Summary */}
          <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-black text-green-800 mb-4">
              Your Registrations
            </h2>
            <div className="space-y-2">
              {completedRegistration.associationRegistrations.map(
                (reg: any) => (
                  <div
                    key={reg.registrationId}
                    className="flex items-center gap-2 text-sm font-bold text-green-700"
                  >
                    <CheckCircle2 size={16} />
                    {reg.associationName} - {reg.status}
                  </div>
                )
              )}
              <div className="flex items-center gap-2 text-sm font-bold text-green-700">
                <CheckCircle2 size={16} />
                {completedRegistration.clubRegistration.clubName} -{" "}
                {completedRegistration.clubRegistration.status}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {completedRegistration.payment.amount > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-black text-yellow-800 mb-2">
                Payment Required
              </h2>
              <p className="text-3xl font-black text-yellow-900 mb-4">
                ${completedRegistration.payment.amount.toFixed(2)}
              </p>
              <p className="text-sm font-bold text-yellow-700 mb-4">
                Payment ID: {completedRegistration.payment.paymentId}
              </p>
              <button className="w-full px-6 py-3 bg-yellow-600 text-white rounded-xl font-black hover:bg-yellow-700 transition-all">
                Proceed to Payment
              </button>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-black text-blue-800 mb-4">
              Next Steps
            </h2>
            <ul className="space-y-2">
              {completedRegistration.nextSteps.map(
                (step: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm font-bold text-blue-700"
                  >
                    <span className="text-blue-600">•</span>
                    {step}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() =>
                router.push(`/members/${completedRegistration.memberId}`)
              }
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Update Profile
            </button>
            <button
              onClick={() => router.push(`/clubs/${clubId}/teams`)}
              className="flex-1 px-6 py-4 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              Browse Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-red-800 mb-2">
                Registration Error
              </h2>
              <p className="text-red-700 font-bold mb-4">{error}</p>
              <button
                onClick={() => setError("")}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Progress indicator
  const steps = [
    { num: 1, name: "Email" },
    { num: 2, name: "Details" },
    { num: 3, name: "Roles" },
    { num: 4, name: "Review" },
  ];

  return (
    <div>
      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-black transition-all ${
                      currentStep > step.num
                        ? "bg-green-500 text-white"
                        : currentStep === step.num
                        ? "bg-[#06054e] text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {currentStep > step.num ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      step.num
                    )}
                  </div>
                  <div
                    className={`text-xs font-bold mt-2 ${
                      currentStep >= step.num
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {step.name}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2">
                    <div
                      className={`h-full rounded transition-all ${
                        currentStep > step.num ? "bg-green-500" : "bg-slate-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Step */}
      {currentStep === 1 && (
        <EmailLookupStep clubId={clubId} onComplete={handleEmailComplete} />
      )}

      {currentStep === 2 && (
        <PersonalDetailsStep
          suggestedData={emailData?.suggestedData}
          isReturningPlayer={emailData?.isReturningPlayer || false}
          onComplete={handlePersonalDetailsComplete}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && (
        <RoleSelectionStep
          clubId={clubId}
          availableRoles={availableRoles}
          suggestedRoles={emailData?.suggestedData?.previousRoles}
          onComplete={handleRoleSelectionComplete}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 4 && summary && (
        <RegistrationSummaryStep
          summary={summary}
          onSubmit={handleSubmit}
          onBack={() => setCurrentStep(3)}
        />
      )}
    </div>
  );
}
