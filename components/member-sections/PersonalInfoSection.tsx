// components/member-sections/PersonalInfoSection.tsx
// Personal information and contact details section

"use client";

import { User, Mail, Phone, Camera } from "lucide-react";
import SocialMediaDisplay from "@/components/member-sections/SocialMediaDisplay";

interface PersonalInfoSectionProps {
  member: any;
  configItems: any[];
  canViewPrivate: boolean;
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

function getSalutationDisplay(configId: string, configItems: any[]): string {
  const config = configItems.find(
    (item) => item.id === configId && item.configType === "salutation",
  );
  return config?.code || config?.name || configId;
}

export default function PersonalInfoSection({
  member,
  configItems,
  canViewPrivate,
}: PersonalInfoSectionProps) {
  return (
    <div
      id="personal"
      className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6 scroll-mt-6"
    >
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
            {getSalutationDisplay(member.personalInfo.salutation, configItems)}
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

        {member.personalInfo.displayName && (
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Display Name
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.personalInfo.displayName}
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Date of Birth
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {new Date(member.personalInfo.dateOfBirth).toLocaleDateString(
              "en-AU",
            )}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Gender
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {getConfigDisplayName(
              member.personalInfo.gender,
              configItems,
              "gender",
            )}
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <h3 className="text-xl font-black text-[#06054e] mb-4 flex items-center gap-2">
          <Mail size={20} />
          Contact Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {member.contact.phone && (
            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Phone
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.contact.phone}
              </p>
            </div>
          )}

          {member.contact.mobile && (
            <div>
              <label className="text-xs font-black uppercase text-slate-400">
                Mobile
              </label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {member.contact.mobile}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Social Media */}
      {member.socialMedia && member.socialMedia.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-xl font-black text-[#06054e] mb-4">
            Social Media
          </h3>
          <SocialMediaDisplay
            socialMedia={member.socialMedia}
            canViewPrivate={canViewPrivate}
            compact={false}
          />
        </div>
      )}
    </div>
  );
}
