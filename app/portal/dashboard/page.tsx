// app/portal/dashboard/page.tsx
// Member / Parent self-service portal dashboard

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";
import clientPromise from "@/lib/mongodb";
import { User, Users, Calendar, ClipboardList, ChevronRight } from "lucide-react";
import Link from "next/link";

async function getMemberData(memberId: string | undefined, clubId: string | undefined) {
  if (!memberId && !clubId) return null;

  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = memberId
      ? await db.collection("members").findOne({ memberId })
      : null;

    return member;
  } catch {
    return null;
  }
}

export const metadata = {
  title: "My Portal | Hockey App",
};

export default async function PortalDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Only member and parent roles use this portal
  if (user.role !== "member" && user.role !== "parent") {
    redirect("/admin/dashboard");
  }

  const member = await getMemberData(user.memberId, user.clubId);

  const memberName = member
    ? `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim()
    : user.name || user.email;

  const membershipStatus = member?.membership?.status ?? "Unknown";
  const membershipExpiry = member?.membership?.currentPeriodEnd ?? null;
  const memberId = member?.memberId ?? null;
  const clubId = member?.clubId ?? user.clubId ?? null;

  const statusColor =
    membershipStatus === "Active"
      ? "bg-green-100 text-green-700"
      : membershipStatus === "Expired"
      ? "bg-red-100 text-red-700"
      : membershipStatus === "Pending"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  const quickLinks = [
    ...(memberId && clubId
      ? [
          {
            label: "View My Profile",
            href: `/clubs/${clubId}/members/${memberId}`,
            description: "View your member record",
            icon: User,
          },
          {
            label: "Edit My Details",
            href: `/clubs/${clubId}/members/${memberId}/edit`,
            description: "Update contact info, address, emergency contacts",
            icon: ClipboardList,
          },
          {
            label: "Membership History",
            href: `/clubs/${clubId}/members/${memberId}/history`,
            description: "View your membership and renewal history",
            icon: Calendar,
          },
        ]
      : []),
    ...(user.role === "parent"
      ? [
          {
            label: "My Children",
            href: `/portal/children`,
            description: "View and manage your children's registrations",
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-[#06054e] text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <span className="font-black text-lg uppercase tracking-wide">Hockey Portal</span>
        </div>
        <Link
          href="/api/auth/logout"
          className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
        >
          Sign Out
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#06054e] rounded-full flex items-center justify-center">
              <User size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#06054e]">{memberName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${statusColor}`}
                >
                  {membershipStatus}
                </span>
                {memberId && (
                  <span className="text-xs text-slate-400 font-bold">{memberId}</span>
                )}
              </div>
              {membershipExpiry && (
                <p className="text-sm text-slate-500 mt-1">
                  Membership expires:{" "}
                  <span className="font-bold text-slate-700">
                    {new Date(membershipExpiry).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        {quickLinks.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-black uppercase text-slate-500 mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-[#06054e] hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-[#06054e] transition-colors">
                        <Icon size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <p className="font-black text-[#06054e] text-sm">{link.label}</p>
                        <p className="text-xs text-slate-500">{link.description}</p>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-[#06054e] transition-colors"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <p className="text-slate-500 font-bold">
              No profile linked to your account yet. Please contact your club administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
