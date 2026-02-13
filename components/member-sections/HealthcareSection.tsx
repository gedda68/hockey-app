// components/member-sections/HealthcareSection.tsx
// Healthcare and emergency contacts section

"use client";

import { Heart, Shield, AlertCircle } from "lucide-react";

interface HealthcareSectionProps {
  member: any;
  configItems: any[];
  canViewHealthcare: boolean;
}

function getConfigDisplayName(
  configId: string,
  configItems: any[],
  configType: string,
): string {
  const config = configItems.find(
    (item) => item.id === configId && item.configType === configType,
  );
  return config?.name || configId;
}

export default function HealthcareSection({
  member,
  configItems,
  canViewHealthcare,
}: HealthcareSectionProps) {
  if (!canViewHealthcare) {
    return (
      <div
        id="healthcare"
        className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6 scroll-mt-6"
      >
        <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
          <Heart size={24} />
          Healthcare Information
        </h2>
        <div className="text-center py-8 bg-slate-50 rounded-xl">
          <Shield size={48} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 font-bold">
            You don't have permission to view healthcare information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="healthcare"
      className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6 scroll-mt-6"
    >
      <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
        <Heart size={24} />
        Healthcare Information
      </h2>

      {/* Medicare */}
      {member.healthcare?.medicare && (
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-700 mb-4">Medicare</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
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
        </div>
      )}

      {/* Private Health */}
      {member.healthcare?.privateHealth && (
        <div className="mb-6 pt-6 border-t border-slate-100">
          <h3 className="text-lg font-black text-slate-700 mb-4">
            Private Health Insurance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Provider
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {getConfigDisplayName(
                  member.healthcare.privateHealth.provider,
                  configItems,
                  "healthProvider",
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
                {new Date(
                  member.healthcare.privateHealth.expiryDate,
                ).toLocaleDateString("en-AU")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Medical Information */}
      {member.medical && (
        <div className="mb-6 pt-6 border-t border-slate-100">
          <h3 className="text-lg font-black text-slate-700 mb-4">
            Medical Information
          </h3>
          <div className="space-y-4">
            {member.medical.conditions && (
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Medical Conditions
                </label>
                <p className="text-base text-slate-800 mt-1">
                  {member.medical.conditions}
                </p>
              </div>
            )}

            {member.medical.medications && (
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Current Medications
                </label>
                <p className="text-base text-slate-800 mt-1">
                  {member.medical.medications}
                </p>
              </div>
            )}

            {member.medical.allergies && (
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Allergies
                </label>
                <p className="text-base text-slate-800 mt-1">
                  {member.medical.allergies}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      {member.emergencyContacts && member.emergencyContacts.length > 0 && (
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Emergency Contacts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {member.emergencyContacts
              .sort((a: any, b: any) => a.priority - b.priority)
              .map((contact: any, index: number) => (
                <div
                  key={contact.contactId || index}
                  className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-black text-slate-800">
                      {contact.name}
                    </h4>
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-black rounded">
                      Priority {contact.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold mb-2">
                    {contact.relationship}
                  </p>
                  <div className="space-y-1">
                    {contact.mobile && (
                      <p className="text-sm text-slate-700">
                        <span className="font-bold">Mobile:</span>{" "}
                        {contact.mobile}
                      </p>
                    )}
                    {contact.phone && (
                      <p className="text-sm text-slate-700">
                        <span className="font-bold">Phone:</span>{" "}
                        {contact.phone}
                      </p>
                    )}
                    {contact.email && (
                      <p className="text-sm text-slate-700">
                        <span className="font-bold">Email:</span>{" "}
                        {contact.email}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
