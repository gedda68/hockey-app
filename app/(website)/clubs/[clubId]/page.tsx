// app/clubs/[clubId]/page.tsx
// Club dashboard

import Link from "next/link";
import { Users, Shield, Calendar, TrendingUp } from "lucide-react";

async function getClubStats(clubId: string) {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/clubs/${clubId}/members`,
      { cache: "no-store" }
    );

    if (!res.ok) return { total: 0, active: 0, players: 0, coaches: 0 };

    const members = await res.json();

    return {
      total: members.length,
      active: members.filter((m: any) => m.membership.status === "Active")
        .length,
      players: members.filter((m: any) => m.roles.includes("role-player"))
        .length,
      coaches: members.filter((m: any) => m.roles.includes("role-coach"))
        .length,
    };
  } catch (error) {
    return { total: 0, active: 0, players: 0, coaches: 0 };
  }
}

export default async function ClubDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const stats = await getClubStats(clubId);

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={stats.total}
          icon={<Users className="text-blue-600" size={32} />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Active Members"
          value={stats.active}
          icon={<TrendingUp className="text-green-600" size={32} />}
          bgColor="bg-green-50"
        />
        <StatCard
          title="Players"
          value={stats.players}
          icon={<Shield className="text-purple-600" size={32} />}
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Coaches"
          value={stats.coaches}
          icon={<Users className="text-orange-600" size={32} />}
          bgColor="bg-orange-50"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            href={`/clubs/${clubId}/members/new`}
            title="Add New Member"
            description="Register a new member to your club"
            icon={<Users size={24} />}
            color="bg-blue-600"
          />
          <QuickActionCard
            href={`/clubs/${clubId}/members`}
            title="View Members"
            description="Browse and manage club members"
            icon={<Users size={24} />}
            color="bg-green-600"
          />
          <QuickActionCard
            href={`/clubs/${clubId}/teams`}
            title="Manage Teams"
            description="Organize teams and divisions"
            icon={<Shield size={24} />}
            color="bg-purple-600"
          />
        </div>
      </div>

      {/* Recent Activity (Placeholder) */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
          Recent Activity
        </h2>
        <p className="text-slate-600">No recent activity to display.</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase">{title}</p>
          <p className="text-4xl font-black text-[#06054e] mt-2">{value}</p>
        </div>
        <div className={`${bgColor} p-4 rounded-2xl`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
  color,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-slate-200 hover:border-yellow-400 transition-all group"
    >
      <div
        className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="font-black text-slate-900 text-lg">{title}</h3>
      <p className="text-sm text-slate-600 mt-2">{description}</p>
    </Link>
  );
}
