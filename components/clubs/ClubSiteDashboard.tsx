import Link from "next/link";
import {
  Users,
  Shield,
  TrendingUp,
  UserRoundPlus,
} from "lucide-react";
import clientPromise from "@/lib/mongodb";
import { getClubMemberStats, resolveClub, type ClubMemberStats } from "@/lib/clubs/clubPortalData";

async function getClubStats(clubIdOrSlug: string): Promise<ClubMemberStats | null> {
  try {
    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClub(db, clubIdOrSlug);
    return club ? await getClubMemberStats(db, club) : null;
  } catch (e) {
    console.error("Club dashboard stats:", e);
    return null;
  }
}

export default async function ClubSiteDashboard({
  clubId,
}: {
  clubId: string;
}) {
  const stats = (await getClubStats(clubId)) ?? {
    total: 0, active: 0, inactive: 0, players: 0, activePlayers: 0, coaches: 0, activeCoaches: 0,
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={stats.total}
          icon={<Users className="text-blue-600" size={32} />}
          bgColor="bg-blue-50"
          subtitle={`${stats.active} active · ${stats.inactive} inactive`}
          href={`/clubs/${clubId}/members`}
        />
        <StatCard
          title="Active Members"
          value={stats.active}
          icon={<TrendingUp className="text-green-600" size={32} />}
          bgColor="bg-green-50"
          subtitle={stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of members` : undefined}
          href={`/clubs/${clubId}/members?status=active`}
        />
        <StatCard
          title="Players"
          value={stats.players}
          icon={<Shield className="text-purple-600" size={32} />}
          bgColor="bg-purple-50"
          subtitle={`${stats.activePlayers} active`}
          href={`/clubs/${clubId}/teams`}
        />
        <StatCard
          title="Coaches"
          value={stats.coaches}
          icon={<Users className="text-orange-600" size={32} />}
          bgColor="bg-orange-50"
          subtitle={`${stats.activeCoaches} active`}
          href={`/clubs/${clubId}/coaches`}
        />
      </div>

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
          <QuickActionCard
            href={`/clubs/${clubId}/register`}
            title="Player Registration"
            description="Register for the current season"
            icon={<UserRoundPlus size={24} />}
            color="bg-orange-600"
          />
        </div>
      </div>

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
  subtitle,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  subtitle?: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase">{title}</p>
        <p className="text-4xl font-black text-[#06054e] mt-2 tabular-nums">{value.toLocaleString("en-AU")}</p>
        {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
      <div className={`${bgColor} p-4 rounded-2xl`}>{icon}</div>
    </div>
  );
  const cls = "block bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6";
  return href ? (
    <Link href={href} className={`${cls} transition hover:-translate-y-0.5 hover:border-yellow-400`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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
