// components/admin/AdminHeader.tsx
// Fixed admin header — uses BrandContext for club/association colours.

"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand, contrastText } from "@/lib/contexts/BrandContext";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Shield } from "lucide-react";
import { ROLE_DEFINITIONS, type UserRole } from "@/lib/types/roles";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  if (!user) return null;

  const roleKey = (
    user.role in ROLE_DEFINITIONS ? user.role : "member"
  ) as UserRole;
  const roleDefinition = ROLE_DEFINITIONS[roleKey];
  const isSuperAdmin   = user.role === "super-admin";

  const primary   = brand?.primaryColor   ?? "#06054e";
  const secondary = brand?.secondaryColor ?? "#1a1870";
  const headerBg  = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  const textColor  = contrastText(primary);
  const mutedColor = textColor === "text-white" ? "text-white/70" : "text-gray-500";

  const CLUB_SCOPED_ROLES = [
    "club-admin", "club-committee", "registrar", "coach", "manager",
    "team-selector", "volunteer", "umpire",
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[1000] shadow-lg"
      style={{ background: headerBg }}
    >
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">

          {/* ── Left: Logo + Entity Name ── */}
          <div className="flex items-center gap-4">
            {brand?.logo ? (
              <img
                src={brand.logo}
                alt={brand.shortName || brand.name}
                className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1"
              />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {isSuperAdmin ? (
                  <Shield size={22} className="text-white" />
                ) : (
                  <span className="text-2xl">🏑</span>
                )}
              </div>
            )}

            <div>
              <h1 className={`text-lg font-black uppercase tracking-wide leading-tight ${textColor}`}>
                {brand?.name ?? (isSuperAdmin ? "Hockey Admin" : "Admin Portal")}
              </h1>
              <p className={`text-xs font-semibold ${mutedColor}`}>
                {brand?.shortName
                  ? `${roleDefinition?.icon ?? ""} ${roleDefinition?.label ?? user.role}`
                  : "Management System"}
              </p>
            </div>
          </div>

          {/* ── Right: User + Logout ── */}
          <div className="flex items-center gap-3">

            {/* User dropdown trigger */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className={`text-sm font-black leading-tight ${textColor}`}>
                    {user.firstName} {user.lastName}
                  </p>
                  <p className={`text-xs ${mutedColor}`}>
                    {roleDefinition?.icon} {roleDefinition?.label ?? user.role}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-white/60 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                    {/* User info panel */}
                    <div className="p-5 text-white" style={{ background: headerBg }}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                        <div>
                          <p className="font-black text-base">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-white/70">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-xs font-bold">
                        <span>{roleDefinition?.icon}</span>
                        <span>{roleDefinition?.label ?? user.role}</span>
                      </div>
                    </div>

                    {/* Club / Assoc info */}
                    <div className="p-2">
                      {brand && (
                        <div className="px-4 py-2 text-sm">
                          <p className="text-xs font-black uppercase text-slate-400 mb-0.5">
                            {CLUB_SCOPED_ROLES.includes(user.role) ? "Club" : "Association"}
                          </p>
                          <p className="font-bold text-slate-700">{brand.name}</p>
                        </div>
                      )}

                      <div className="border-t border-slate-100 my-2" />

                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          router.push("/admin/profile");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                      >
                        <User size={18} className="text-slate-500" />
                        <span className="font-bold text-slate-700">My Profile</span>
                      </button>

                      <div className="border-t border-slate-100 my-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors text-left"
                      >
                        <LogOut size={18} className="text-red-500" />
                        <span className="font-bold text-red-600">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-red-500/80 text-white rounded-xl font-bold text-sm transition-all"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
