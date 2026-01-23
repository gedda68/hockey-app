// app/admin/dashboard/page.tsx
// Dashboard with automatic tiles from menu config

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// Import menu config - with fallback if not created yet
let menuConfig: any[] = [];
let getMainMenuItems: () => any[] = () => [];

try {
  const config = require("../config/menuConfig");
  menuConfig = config.menuConfig || [];
  getMainMenuItems = config.getMainMenuItems || (() => []);
} catch (e) {
  console.warn("menuConfig not found - using hardcoded items");
  // Fallback hardcoded items if config doesn't exist
  menuConfig = [
    {
      label: "Rosters",
      href: "/admin",
      icon: "📋",
      description: "Manage divisions, teams, and rosters",
      color: "from-purple-500 to-purple-600",
    },
    {
      label: "Players",
      href: "/admin/players",
      icon: "⭐",
      description: "Player management and nominations",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      label: "Staff",
      href: "/admin/staff",
      icon: "👔",
      description: "Coaches, managers, and officials",
      color: "from-green-500 to-green-600",
    },
    {
      label: "Clubs",
      href: "/admin/clubs",
      icon: "🏢",
      description: "Club profiles and statistics",
      color: "from-indigo-500 to-indigo-600",
    },
  ];
  getMainMenuItems = () =>
    menuConfig.filter((item) => item.href !== "/admin/dashboard");
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    rosters: 0,
    players: 0,
    staff: 0,
    clubs: 0,
    nominations: 0,
  });

  const mainMenuItems = getMainMenuItems();

  // Fetch stats (placeholder - connect to your actual data)
  useEffect(() => {
    // TODO: Fetch actual stats from your API
    setStats({
      rosters: 8,
      players: 156,
      staff: 42,
      clubs: 12,
      nominations: 5,
    });
  }, []);

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

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
              <div className="text-4xl">👔</div>
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

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">
                  Pending
                </p>
                <p className="text-3xl font-black text-[#06054e] mt-1">
                  {stats.nominations}
                </p>
              </div>
              <div className="text-4xl">✋</div>
            </div>
          </div>
        </div>

        {/* Main Menu Tiles - Automatically generated from menuConfig */}
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
                  icon: "👤",
                  action: "New player added",
                  detail: "John Smith to Hockey Academy",
                  time: "5 minutes ago",
                },
                {
                  icon: "✅",
                  action: "Selection completed",
                  detail: "Under 18 final roster confirmed",
                  time: "2 hours ago",
                },
                {
                  icon: "👔",
                  action: "Staff updated",
                  detail: "New coach assigned to Green Team",
                  time: "3 hours ago",
                },
                {
                  icon: "📋",
                  action: "Team created",
                  detail: "Gold Team added to Hockey Academy",
                  time: "1 day ago",
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
      </div>
    </div>
  );
}
