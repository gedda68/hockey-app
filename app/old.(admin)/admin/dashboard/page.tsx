// app/(admin)/admin/dashboard/page.tsx
// Super-admin system dashboard

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";
import { getRoleDashboard } from "@/lib/auth/roleRedirects";
import clientPromise from "@/lib/mongodb";
import {
  Users,
  Building2,
  UserCheck,
  Shield,
  ClipboardList,
  Settings,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

async function getSystemStats() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const [
      totalUsers,
      totalMembers,
      totalClubs,
      totalAssociations,
      activeMembers,
      pendingRegistrations,
    ] = await Promise.all([
      db.collection("users").countDocuments({ status: { $ne: "inactive" } }),
      db.collection("members").countDocuments({}),
      db.collection("clubs").countDocuments({}),
      db.collection("associations").countDocuments({}),
      db
        .collection("members")
        .countDocuments({ "membership.status": "Active" }),
      db
        .collection("members")
        .countDocuments({ "membership.status": "Pending" }),
    ]);

    return {
      totalUsers,
      totalMembers,
      totalClubs,
      totalAssociations,
      activeMembers,
      pendingRegistrations,
    };
  } catch {
    return {
      totalUsers: 0,
      totalMembers: 0,
      totalClubs: 0,
      totalAssociations: 0,
      activeMembers: 0,
      pendingRegistrations: 0,
    };
  }
}

export const metadata = {
  title: "Dashboard | Admin",
};

export default async function AdminDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Non-super-admins are redirected to their specific dashboard
  if (user.role !== "super-admin") {
    redirect(getRoleDashboard(user.role, user.clubId, user.associationId));
  }

  const stats = await getSystemStats();

  const statCards = [
    {
      label: "Associations",
      value: stats.totalAssociations,
      icon: Shield,
      href: "/admin/associations",
      color: "bg-purple-500",
    },
    {
      label: "Clubs",
      value: stats.totalClubs,
      icon: Building2,
      href: "/admin/clubs",
      color: "bg-blue-500",
    },
    {
      label: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      href: "/admin/members",
      color: "bg-green-500",
    },
    {
      label: "Active Members",
      value: stats.activeMembers,
      icon: UserCheck,
      href: "/admin/members",
      color: "bg-emerald-500",
    },
    {
      label: "System Users",
      value: stats.totalUsers,
      icon: Settings,
      href: "/admin/users",
      color: "bg-orange-500",
    },
    {
      label: "Pending Registrations",
      value: stats.pendingRegistrations,
      icon: ClipboardList,
      href: "/admin/members",
      color:
        stats.pendingRegistrations > 0 ? "bg-amber-500" : "bg-slate-400",
    },
  ];

  const quickLinks = [
    { label: "Manage Users", href: "/admin/users", description: "Add and manage system user accounts" },
    { label: "Manage Members", href: "/admin/members", description: "View and edit all member records" },
    { label: "Configuration", href: "/admin/config/gender", description: "System configuration and lookup tables" },
    { label: "News", href: "/admin/news", description: "Publish and manage news articles" },
    { label: "Committee Positions", href: "/admin/settings/committee-positions", description: "Manage committee roles and contacts" },
    { label: "Fee Categories", href: "/admin/settings/fee-categories", description: "Configure membership fee categories" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#06054e] uppercase">
          System Dashboard
        </h1>
        <p className="text-slate-500 font-bold mt-1">
          Welcome back — here&apos;s an overview of the entire system.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-slate-500 mb-1">
                    {card.label}
                  </p>
                  <p className="text-4xl font-black text-[#06054e]">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center`}
                >
                  <Icon size={22} className="text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-black text-[#06054e] uppercase mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-[#06054e] hover:bg-slate-50 transition-all group"
            >
              <div>
                <p className="font-black text-[#06054e]">{link.label}</p>
                <p className="text-sm text-slate-500">{link.description}</p>
              </div>
              <ChevronRight
                size={18}
                className="text-slate-300 group-hover:text-[#06054e] transition-colors"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
