// components/admin/AdminHeader.tsx
// Fixed admin header — BrandContext colours, optional full-width banner image.

"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand, contrastText } from "@/lib/contexts/BrandContext";
import { useAdminEditingScope } from "@/components/admin/AdminEditingScopeProvider";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Shield } from "lucide-react";
import { ROLE_DEFINITIONS, type UserRole } from "@/lib/types/roles";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const editingScope = useAdminEditingScope();
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
  const isSuperAdmin = user.role === "super-admin";

  const primary = brand?.primaryColor ?? "#06054e";
  const secondary = brand?.secondaryColor ?? "#1a1870";
  const headerGradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  const bannerUrl = brand?.adminHeaderBannerUrl?.trim();
  const useBanner = Boolean(bannerUrl);

  const textColor = useBanner ? "text-white" : contrastText(primary);
  const mutedColor = useBanner
    ? "text-white/75"
    : textColor === "text-white"
      ? "text-white/70"
      : "text-gray-500";

  const editingLineClass = editingScope.savesBlocked
    ? "text-amber-200"
    : useBanner || textColor === "text-white"
      ? "text-yellow-200"
      : "text-amber-900";

  const CLUB_SCOPED_ROLES = [
    "club-admin",
    "club-committee",
    "registrar",
    "coach",
    "manager",
    "team-selector",
    "volunteer",
    "umpire",
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] shadow-lg overflow-visible">
      {useBanner ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded or trusted branding URL */}
          <img
            src={bannerUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/40 to-black/55"
            aria-hidden
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: headerGradient }}
          aria-hidden
        />
      )}

      <div className="relative px-6 py-3">
        <div className="flex items-center justify-between">
          {/* ── Left: Logo + Entity Name ── */}
          <div className="flex items-center gap-4">
            {brand?.logo ? (
              <img
                src={brand.logo}
                alt={brand.shortName || brand.name}
                className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1 ring-1 ring-white/20"
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
              <h1
                className={`text-lg font-black uppercase tracking-wide leading-tight drop-shadow-sm ${textColor}`}
              >
                {brand?.name ?? (isSuperAdmin ? "Hockey Admin" : "Admin Portal")}
              </h1>
              {editingScope.editingLabel && (
                <p
                  className={`text-[11px] font-black uppercase tracking-wider mt-0.5 drop-shadow-sm ${editingLineClass}`}
                >
                  Editing: {editingScope.editingLabel}
                  {editingScope.savesBlocked ? " · saves blocked" : ""}
                </p>
              )}
              <p className={`text-xs font-semibold ${mutedColor} mt-0.5 drop-shadow-sm`}>
                {brand?.shortName
                  ? `${roleDefinition?.icon ?? ""} ${roleDefinition?.label ?? user.role}`
                  : "Management System"}
              </p>
            </div>
          </div>

          {/* ── Right: User + Logout ── */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                  useBanner
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-black/5 hover:bg-black/10"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    useBanner ? "bg-white/20" : "bg-black/10"
                  }`}
                >
                  <User
                    size={16}
                    className={useBanner ? "text-white" : textColor}
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <p
                    className={`text-sm font-black leading-tight drop-shadow-sm ${
                      useBanner ? "text-white" : textColor
                    }`}
                  >
                    {user.firstName} {user.lastName}
                  </p>
                  <p className={`text-xs ${useBanner ? "text-white/75" : mutedColor}`}>
                    {roleDefinition?.icon} {roleDefinition?.label ?? user.role}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    useBanner ? "text-white/70" : "text-gray-600"
                  } ${showDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                    <div className="p-5 text-white" style={{ background: headerGradient }}>
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
                        type="button"
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
                        type="button"
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

            <button
              type="button"
              onClick={handleLogout}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-sm transition-all drop-shadow-sm ${
                useBanner
                  ? "bg-white/10 hover:bg-red-500/80 text-white"
                  : "bg-yellow-400 text-[#06054e] hover:bg-yellow-300"
              }`}
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
