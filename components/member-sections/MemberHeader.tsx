// components/MemberHeader.tsx
// Reusable member header component matching design system

"use client";

import Link from "next/link";
import {
  Edit,
  Trash2,
  Ban,
  Check,
  RotateCcw,
  Clock,
  Camera,
  User,
} from "lucide-react";

interface MemberHeaderProps {
  clubId: string;
  memberId: string;
  member: {
    personalInfo: {
      firstName: string;
      lastName: string;
      displayName?: string;
      photoUrl?: string | null;
    };
    membership: {
      status: string;
    };
  };
  currentPage?: "view" | "edit" | "renew" | "history";
  onToggleStatus?: () => void;
  onDelete?: () => void;
  showActions?: {
    deactivate?: boolean;
    edit?: boolean;
    renew?: boolean;
    history?: boolean;
    delete?: boolean;
  };
}

export default function MemberHeader({
  clubId,
  memberId,
  member,
  currentPage = "view",
  onToggleStatus,
  onDelete,
  showActions,
}: MemberHeaderProps) {
  // Merge showActions with defaults
  const actions = {
    deactivate: true,
    edit: true,
    renew: true,
    history: true,
    delete: true,
    ...showActions,
  };

  const displayName =
    member.personalInfo.displayName ||
    `${member.personalInfo.firstName} ${member.personalInfo.lastName}`;

  const isActive = member.membership.status === "Active";

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Member Info */}
        <div className="flex items-center gap-4">
          {/* Profile Photo */}
          <div className="relative">
            {member.personalInfo.photoUrl ? (
              <img
                src={member.personalInfo.photoUrl}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center border-4 border-white shadow-md">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            {/* Camera icon overlay */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200">
              <Camera className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Name and Status */}
          <div>
            <h1 className="text-3xl font-black text-[#06054e] mb-0.5">
              {displayName}
            </h1>
            <p className="text-slate-500 font-bold text-sm mb-2">
              Member ID: {memberId}
            </p>
            <span
              className={`inline-block px-3 py-1 rounded-lg text-xs font-black ${
                isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {member.membership.status}
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Deactivate/Activate Button */}
          {actions.deactivate && currentPage === "view" && onToggleStatus && (
            <button
              onClick={onToggleStatus}
              className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 shadow-sm"
            >
              <Ban size={18} />
              Deactivate
            </button>
          )}

          {/* Edit Button */}
          {actions.edit && currentPage !== "edit" && (
            <Link
              href={`/clubs/${clubId}/members/${memberId}/edit`}
              className="px-5 py-2.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
            >
              <Edit size={18} />
              Edit
            </Link>
          )}

          {/* Renew Button */}
          {actions.renew && currentPage !== "renew" && (
            <Link
              href={`/clubs/${clubId}/members/${memberId}/renew`}
              className="px-5 py-2.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm border border-slate-200"
            >
              <RotateCcw size={18} />
              Renew
            </Link>
          )}

          {/* History Button */}
          {actions.history && currentPage !== "history" && (
            <Link
              href={`/clubs/${clubId}/members/${memberId}/history`}
              className="px-5 py-2.5 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
            >
              <Clock size={18} />
              History
            </Link>
          )}

          {/* Delete Button */}
          {actions.delete && currentPage === "view" && onDelete && (
            <button
              onClick={onDelete}
              className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-sm"
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
