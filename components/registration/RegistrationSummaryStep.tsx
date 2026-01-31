// components/registration/RegistrationSummaryStep.tsx
// Step 4: Review and confirm registration

"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  User,
  Shield,
  Building2,
  FileText,
  Loader2,
} from "lucide-react";

interface RegistrationSummaryStepProps {
  summary: any;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}

export default function RegistrationSummaryStep({
  summary,
  onSubmit,
  onBack,
}: RegistrationSummaryStepProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCode, setAgreedToCode] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!agreedToTerms || !agreedToCode || !agreedToPrivacy) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = agreedToTerms && agreedToCode && agreedToPrivacy;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
            <FileText size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">
              Review Your Registration
            </h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              Step 4: Confirm your details
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-sm font-bold text-blue-700">
            Please review all information carefully before submitting
          </p>
        </div>
      </div>

      {/* Member Details */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <User size={24} className="text-[#06054e]" />
          <h2 className="text-2xl font-black text-[#06054e]">Member Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-black uppercase text-slate-500">
              Name
            </div>
            <div className="text-lg font-bold text-slate-900">
              {summary.member.firstName} {summary.member.lastName}
            </div>
          </div>
          <div>
            <div className="text-sm font-black uppercase text-slate-500">
              Email
            </div>
            <div className="text-lg font-bold text-slate-900">
              {summary.member.email}
            </div>
          </div>
          <div>
            <div className="text-sm font-black uppercase text-slate-500">
              Date of Birth
            </div>
            <div className="text-lg font-bold text-slate-900">
              {new Date(summary.member.dateOfBirth).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-sm font-black uppercase text-slate-500">
              Age Category
            </div>
            <div className="text-lg font-bold text-slate-900 capitalize">
              {summary.ageCategory}
            </div>
          </div>
        </div>
      </div>

      {/* Registration Hierarchy */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 size={24} className="text-[#06054e]" />
          <h2 className="text-2xl font-black text-[#06054e]">
            Your Registrations
          </h2>
        </div>

        <p className="text-sm font-bold text-slate-600 mb-4">
          You will be registered with the following organizations:
        </p>

        <div className="space-y-3">
          {/* National */}
          {summary.registrations.parentAssociations
            .filter((a: any) => a.level === 0)
            .map((assoc: any) => (
              <div
                key={assoc.associationId}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-black">
                  {assoc.code}
                </div>
                <div className="flex-1">
                  <div className="font-black text-slate-900">{assoc.name}</div>
                  <div className="text-sm font-bold text-slate-500">
                    National
                  </div>
                </div>
                <Check size={20} className="text-green-600" />
              </div>
            ))}

          {/* State */}
          {summary.registrations.parentAssociations
            .filter((a: any) => a.level === 1)
            .map((assoc: any) => (
              <div
                key={assoc.associationId}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                  {assoc.code}
                </div>
                <div className="flex-1">
                  <div className="font-black text-slate-900">{assoc.name}</div>
                  <div className="text-sm font-bold text-slate-500">State</div>
                </div>
                <Check size={20} className="text-green-600" />
              </div>
            ))}

          {/* Regional */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-black">
              {summary.registrations.association.code}
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-900">
                {summary.registrations.association.name}
              </div>
              <div className="text-sm font-bold text-slate-500">Regional</div>
            </div>
            <Check size={20} className="text-green-600" />
          </div>

          {/* Club */}
          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-400">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 text-[#06054e] flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-900">
                {summary.registrations.club.name}
              </div>
              <div className="text-sm font-bold text-slate-500">Your Club</div>
            </div>
            <Check size={20} className="text-green-600" />
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={24} className="text-[#06054e]" />
          <h2 className="text-2xl font-black text-[#06054e]">Your Roles</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {summary.roles.map((role: any) => (
            <div
              key={role.roleId}
              className="px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg font-bold text-blue-700"
            >
              {role.name}
            </div>
          ))}
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign size={24} className="text-[#06054e]" />
          <h2 className="text-2xl font-black text-[#06054e]">Fee Breakdown</h2>
        </div>

        <div className="space-y-6">
          {/* Association Fees */}
          {summary.fees.byType.association.map(
            (assocFees: any, index: number) => (
              <div key={index}>
                <h3 className="text-sm font-black uppercase text-slate-500 mb-2">
                  {assocFees.name}
                </h3>
                {assocFees.fees.map((fee: any) => (
                  <div
                    key={fee.itemId}
                    className="flex justify-between py-2 border-b border-slate-100"
                  >
                    <span className="font-bold text-slate-700">
                      {fee.name.split(" - ")[1] || fee.name}
                    </span>
                    <span className="font-black text-slate-900">
                      ${fee.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Club Fees */}
          {summary.fees.byType.club.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase text-slate-500 mb-2">
                {summary.registrations.club.name}
              </h3>
              {summary.fees.byType.club.map((fee: any) => (
                <div
                  key={fee.itemId}
                  className="flex justify-between py-2 border-b border-slate-100"
                >
                  <span className="font-bold text-slate-700">
                    {fee.name.split(" - ")[1] || fee.name}
                  </span>
                  <span className="font-black text-slate-900">
                    ${fee.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Insurance */}
          {summary.fees.byType.insurance.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase text-slate-500 mb-2">
                Insurance
              </h3>
              {summary.fees.byType.insurance.map((fee: any) => (
                <div
                  key={fee.itemId}
                  className="flex justify-between py-2 border-b border-slate-100"
                >
                  <span className="font-bold text-slate-700">{fee.name}</span>
                  <span className="font-black text-slate-900">
                    ${fee.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="pt-4 border-t-4 border-[#06054e]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl font-black text-slate-900">TOTAL</span>
              <span className="text-4xl font-black text-[#06054e]">
                ${summary.fees.summary.total.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500">
                GST included: ${summary.fees.summary.gst.toFixed(2)}
              </p>
              <p className="text-xs font-bold text-slate-500">
                {summary.fees.summary.itemCount} item
                {summary.fees.summary.itemCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Status */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
        <div
          className={`p-4 rounded-xl border-2 ${
            summary.autoApproved
              ? "bg-green-50 border-green-500"
              : "bg-yellow-50 border-yellow-500"
          }`}
        >
          <p className="font-bold text-sm">
            {summary.autoApproved ? (
              <span className="text-green-700">
                ✓ {summary.approvalMessage}
              </span>
            ) : (
              <span className="text-yellow-700">
                ⏳ {summary.approvalMessage}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Agreements */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">Agreements</h2>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-5 h-5 mt-1 rounded border-2 border-slate-300 flex-shrink-0"
            />
            <span className="text-sm font-bold text-slate-700">
              I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                className="text-[#06054e] hover:underline font-black"
              >
                Terms and Conditions
              </a>{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToCode}
              onChange={(e) => setAgreedToCode(e.target.checked)}
              className="w-5 h-5 mt-1 rounded border-2 border-slate-300 flex-shrink-0"
            />
            <span className="text-sm font-bold text-slate-700">
              I agree to the{" "}
              <a
                href="/code-of-conduct"
                target="_blank"
                className="text-[#06054e] hover:underline font-black"
              >
                Code of Conduct
              </a>{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              className="w-5 h-5 mt-1 rounded border-2 border-slate-300 flex-shrink-0"
            />
            <span className="text-sm font-bold text-slate-700">
              I agree to the{" "}
              <a
                href="/privacy"
                target="_blank"
                className="text-[#06054e] hover:underline font-black"
              >
                Privacy Policy
              </a>{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={photoConsent}
              onChange={(e) => setPhotoConsent(e.target.checked)}
              className="w-5 h-5 mt-1 rounded border-2 border-slate-300 flex-shrink-0"
            />
            <span className="text-sm font-bold text-slate-700">
              I consent to the use of photos/videos for promotional purposes
            </span>
          </label>
        </div>

        {!canSubmit && (
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-red-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-sm font-bold text-red-700">
              Please agree to all required terms before submitting
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check size={20} />
                Submit Registration
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 font-bold text-center mt-4">
          By submitting, you confirm all information provided is accurate
        </p>
      </div>
    </div>
  );
}
