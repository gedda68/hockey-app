// components/member-sections/MembershipSection.tsx
// Membership and roles section

"use client";

import { Award, Shield, Users, Calendar } from "lucide-react";

interface MembershipSectionProps {
  member: any;
  configItems: any[];
  relatedMembers: Record<string, any>;
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

export default function MembershipSection({
  member,
  configItems,
  relatedMembers,
}: MembershipSectionProps) {
  return (
    <div
      id="membership"
      className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6 scroll-mt-6"
    >
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
              configItems,
              "membershipType",
            )}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Status
          </label>
          <span
            className={`inline-block px-3 py-1 rounded-lg text-sm font-black mt-1 ${
              member.membership.status === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {member.membership.status}
          </span>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Join Date
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {new Date(member.membership.joinDate).toLocaleDateString("en-AU")}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Current Period
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {member.membership.currentPeriodStart} to{" "}
            {member.membership.currentPeriodEnd}
          </p>
        </div>
      </div>

      {/* Roles */}
      {member.roles && member.roles.length > 0 && (
        <div className="pt-6 border-t border-slate-100 mb-6">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Shield size={20} />
            Assigned Roles
          </h3>
          <div className="flex flex-wrap gap-2">
            {member.roles.map((roleId: string) => {
              const role = configItems.find(
                (item) => item.id === roleId && item.configType === "role",
              );
              return (
                <span
                  key={roleId}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold"
                  style={{
                    backgroundColor: role?.color
                      ? `${role.color}20`
                      : undefined,
                    color: role?.color || undefined,
                  }}
                >
                  {role?.icon && <span className="mr-2">{role.icon}</span>}
                  {role?.name || roleId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Player Info */}
      {member.playerInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Jersey Number
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.playerInfo.jerseyNumber || "Not assigned"}
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400">
              Position
            </label>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {member.playerInfo.position || "Not assigned"}
            </p>
          </div>
        </div>
      )}

      {/* Family Relationships */}
      {member.familyRelationships && member.familyRelationships.length > 0 && (
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
            <Users size={20} />
            Family Relationships
          </h3>
          <div className="space-y-3">
            {member.familyRelationships.map((rel: any, index: number) => {
              const relatedMember = relatedMembers[rel.relatedMemberId];
              return (
                <div
                  key={index}
                  className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800">
                        {relatedMember
                          ? `${relatedMember.personalInfo.firstName} ${relatedMember.personalInfo.lastName}`
                          : rel.relatedMemberId}
                      </p>
                      <p className="text-sm text-slate-600 font-bold">
                        {rel.forwardRelation}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-purple-500 text-white text-xs font-black rounded">
                      {getConfigDisplayName(
                        rel.relationshipType,
                        configItems,
                        "relationshipType",
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renewal History */}
      {member.membership.renewalHistory &&
        member.membership.renewalHistory.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Renewal History
            </h3>
            <div className="space-y-2">
              {member.membership.renewalHistory
                .sort(
                  (a: any, b: any) =>
                    new Date(b.renewedAt).getTime() -
                    new Date(a.renewedAt).getTime(),
                )
                .map((renewal: any, index: number) => (
                  <div
                    key={index}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">
                          {renewal.periodStart} to {renewal.periodEnd}
                        </p>
                        <p className="text-xs text-slate-500">
                          Renewed:{" "}
                          {new Date(renewal.renewedAt).toLocaleDateString(
                            "en-AU",
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {renewal.membershipType}
                      </span>
                    </div>
                    {renewal.notes && (
                      <p className="text-sm text-slate-600 mt-2">
                        {renewal.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}
