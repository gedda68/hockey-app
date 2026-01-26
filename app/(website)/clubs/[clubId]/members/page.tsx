// Example Members List Page with Edit Button
// app/(website)/clubs/[clubId]/members/page.tsx

import Link from "next/link";
import { Plus, Edit2, Trash2, User } from "lucide-react";
import DeleteMemberButton from "./DeleteMemberButton";

interface Member {
  memberId: string;
  personalInfo: {
    salutation?: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  };
  contact: {
    primaryEmail: string;
  };
  membership: {
    membershipType: string;
    status: string;
  };
  roles: string[];
}

interface PageProps {
  params: {
    clubId: string;
  };
}

export default async function MembersListPage({ params }: PageProps) {
  const { clubId } = await params;

  // Fetch members
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/api/clubs/${clubId}/members`,
    {
      cache: "no-store",
    }
  );

  const members: Member[] = res.ok ? await res.json() : [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">Members</h1>
            <p className="text-slate-600 mt-2">{members.length} members</p>
          </div>

          <Link
            href={`/clubs/${clubId}/members/new`}
            className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            <Plus size={20} />
            Add Member
          </Link>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div
              key={member.memberId}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 hover:shadow-2xl transition-all"
            >
              {/* Member Photo */}
              <div className="flex items-center gap-4 mb-4">
                {member.personalInfo.photoUrl ? (
                  <img
                    src={member.personalInfo.photoUrl}
                    alt={`${member.personalInfo.firstName} ${member.personalInfo.lastName}`}
                    className="w-16 h-16 rounded-full object-cover border-4 border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                    <User size={32} className="text-slate-400" />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="font-black text-lg text-slate-900">
                    {member.personalInfo.firstName}{" "}
                    {member.personalInfo.lastName}
                  </h3>
                  <p className="text-sm text-slate-500">{member.memberId}</p>
                </div>
              </div>

              {/* Member Info */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-slate-600">
                  <strong>Email:</strong> {member.contact.primaryEmail}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      member.membership.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {member.membership.status}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Roles:</strong> {member.roles.length} role(s)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                <Link
                  href={`/clubs/${clubId}/members/${member.memberId}/edit`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all"
                >
                  <Edit2 size={16} />
                  Edit
                </Link>

                {/* Use the new Client Component instead of the raw button */}
                <DeleteMemberButton
                  clubId={clubId}
                  memberId={member.memberId}
                  memberName={`${member.personalInfo.firstName} ${member.personalInfo.lastName}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {members.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
            <User size={48} className="text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-700 mb-2">
              No members yet
            </h3>
            <p className="text-slate-600 mb-6">
              Get started by adding your first member
            </p>
            <Link
              href={`/clubs/${clubId}/members/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              <Plus size={20} />
              Add First Member
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
