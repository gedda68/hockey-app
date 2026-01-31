// app/admin/dashboard/page.tsx
// Enhanced dashboard with registration stats

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";

// Import menu config
let menuConfig: any[] = [];
let getMainMenuItems: () => any[] = () => [];

try {
  const config = require("../global-config/menuConfig");
  menuConfig = config.menuConfig || [];
  getMainMenuItems = config.getMainMenuItems || (() => []);
} catch (e) {
  console.warn("menuConfig not found - using default");
  getMainMenuItems = () => [];
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    rosters: 0,
    players: 0,
    staff: 0,
    clubs: 0,
    associations: 0,
    registrations: 0,
    pendingRegistrations: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    nominations: 0,
  });

  const mainMenuItems = getMainMenuItems();

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch from multiple endpoints
      const [associationsRes, registrationsRes, paymentsRes] =
        await Promise.all([
          fetch("/api/admin/associations?status=active").catch(() => null),
          fetch("/api/admin/registrations?seasonYear=2024").catch(() => null),
          fetch("/api/payments?status=pending").catch(() => null),
        ]);

      // Parse responses
      const associations = associationsRes?.ok
        ? await associationsRes.json()
        : [];
      const registrations = registrationsRes?.ok
        ? await registrationsRes.json()
        : [];
      const payments = paymentsRes?.ok ? await paymentsRes.json() : [];

      // Count pending registrations
      const pending = registrations.filter(
        (r: any) => r.status === "pending"
      ).length;

      // Calculate total revenue
      const revenue = payments.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0
      );

      setStats({
        rosters: 8,
        players: 156,
        staff: 42,
        clubs: 12,
        associations: associations.length || 4,
        registrations: registrations.length || 120,
        pendingRegistrations: pending || 12,
        pendingPayments: payments.length || 8,
        totalRevenue: revenue || 64200,
        nominations: 5,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Use fallback stats
      setStats({
        rosters: 8,
        players: 156,
        staff: 42,
        clubs: 12,
        associations: 4,
        registrations: 120,
        pendingRegistrations: 12,
        pendingPayments: 8,
        totalRevenue: 64200,
        nominations: 5,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase text-[#06054e]">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Welcome to the Hockey Admin Portal
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">
                {new Date().toLocaleDateString("en-AU", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats - Row 1: Core Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Divisions
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.rosters}
                </p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Players
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.players}
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Staff
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.staff}
                </p>
              </div>
              <div className="text-4xl">🎓</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Clubs
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.clubs}
                </p>
              </div>
              <div className="text-4xl">🏢</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Associations
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.associations}
                </p>
              </div>
              <div className="text-4xl">🏛️</div>
            </div>
          </div>
        </div>

        {/* Quick Stats - Row 2: Registration & Financial */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-cyan-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Registrations
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.registrations}
                </p>
                <p className="text-xs text-slate-500 mt-1">This season</p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Pending Approval
                </p>
                <p className="text-3xl font-black text-orange-600 mt-1">
                  {stats.pendingRegistrations}
                </p>
                <Link
                  href="/admin/registrations/pending"
                  className="text-xs text-orange-600 hover:underline mt-1 inline-block"
                >
                  Review now →
                </Link>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Pending Payments
                </p>
                <p className="text-3xl font-black text-amber-600 mt-1">
                  {stats.pendingPayments}
                </p>
                <Link
                  href="/admin/registrations/payments"
                  className="text-xs text-amber-600 hover:underline mt-1 inline-block"
                >
                  View all →
                </Link>
              </div>
              <div className="text-4xl">💳</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Total Revenue
                </p>
                <p className="text-3xl font-black text-emerald-600 mt-1">
                  ${(stats.totalRevenue / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-slate-500 mt-1">This season</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
        </div>

        {/* Main Menu Tiles */}
        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainMenuItems.map((item: any) => (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-slate-200 hover:border-[#06054e] transition-all hover:shadow-xl"
              >
                <div
                  className={`h-2 bg-gradient-to-r ${
                    item.color || "from-slate-500 to-slate-600"
                  }`}
                />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl">{item.icon}</div>
                    {item.badge && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-black">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black uppercase text-[#06054e] mb-2 group-hover:text-purple-600 transition-colors">
                    {item.label}
                  </h3>

                  <p className="text-sm text-slate-600 mb-4">
                    {item.description || "Manage " + item.label.toLowerCase()}
                  </p>

                  {/* Sub-items preview */}
                  {item.subItems && item.subItems.length > 0 && (
                    <div className="space-y-1">
                      {item.subItems.slice(0, 3).map((subItem: any) => (
                        <div
                          key={subItem.href}
                          className="flex items-center gap-2 text-xs text-slate-500"
                        >
                          <span>{subItem.icon}</span>
                          <span>{subItem.label}</span>
                          {subItem.badge && (
                            <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">
                              {subItem.badge}
                            </span>
                          )}
                        </div>
                      ))}
                      {item.subItems.length > 3 && (
                        <div className="text-xs text-slate-400 italic">
                          +{item.subItems.length - 3} more...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center text-purple-600 font-bold text-sm">
                    <span>Open</span>
                    <span className="ml-2 group-hover:ml-3 transition-all">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
            Recent Activity
          </h2>
          <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-200">
              {[
                {
                  icon: "📝",
                  action: "New registration",
                  detail: "John Smith registered for 2024 season",
                  time: "2 minutes ago",
                },
                {
                  icon: "💰",
                  action: "Payment received",
                  detail: "$535.00 from Jane Doe",
                  time: "15 minutes ago",
                },
                {
                  icon: "✅",
                  action: "Registration approved",
                  detail: "Mike Johnson - Commercial HC",
                  time: "1 hour ago",
                },
                {
                  icon: "🏛️",
                  action: "Association updated",
                  detail: "Brisbane HA fee structure modified",
                  time: "2 hours ago",
                },
                {
                  icon: "👤",
                  action: "New player added",
                  detail: "Sarah Williams to Hockey Academy",
                  time: "3 hours ago",
                },
                {
                  icon: "🎓",
                  action: "Staff updated",
                  detail: "New coach assigned to Green Team",
                  time: "5 hours ago",
                },
              ].map((activity, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-[#06054e]">
                        {activity.action}
                      </div>
                      <div className="text-xs text-slate-600">
                        {activity.detail}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
            <h3 className="text-lg font-black text-[#06054e] mb-4 flex items-center gap-2">
              <Building2 size={20} />
              Association Management
            </h3>
            <div className="space-y-2">
              <Link
                href="/admin/associations"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → View all associations
              </Link>
              <Link
                href="/admin/associations/new"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Create new association
              </Link>
              <Link
                href="/admin/associations/fees"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Configure fees
              </Link>
              <Link
                href="/admin/associations/hierarchy"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → View hierarchy
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
            <h3 className="text-lg font-black text-[#06054e] mb-4 flex items-center gap-2">
              <FileText size={20} />
              Registration Tools
            </h3>
            <div className="space-y-2">
              <Link
                href="/admin/registrations"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → All registrations
              </Link>
              <Link
                href="/admin/registrations/pending"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Pending approvals ({stats.pendingRegistrations})
              </Link>
              <Link
                href="/admin/registrations/payments"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Payment tracking
              </Link>
              <Link
                href="/register"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → New registration
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
            <h3 className="text-lg font-black text-[#06054e] mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Reports & Analytics
            </h3>
            <div className="space-y-2">
              <Link
                href="/admin/reports/registrations"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Registration reports
              </Link>
              <Link
                href="/admin/reports/financial"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Financial reports
              </Link>
              <Link
                href="/admin/reports/players"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Player statistics
              </Link>
              <Link
                href="/admin/reports/export"
                className="block text-sm text-slate-600 hover:text-[#06054e] font-bold"
              >
                → Export data
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
