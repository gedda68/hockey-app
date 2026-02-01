// components/admin/AdminHeader.tsx
// Admin header with user info and logout button

"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (!user) return null;

  const roleDefinition = ROLE_DEFINITIONS[user.role];

  return (
    <header className="bg-white border-b-4 border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏑</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-[#06054e] uppercase">
                Hockey Admin
              </h1>
              <p className="text-xs text-slate-500 font-bold">
                Management System
              </p>
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#06054e] to-slate-700 rounded-lg flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-slate-500 font-bold">
                      {roleDefinition.icon} {roleDefinition.label}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border-2 border-slate-100 overflow-hidden z-50">
                    {/* User Info */}
                    <div className="p-6 bg-gradient-to-br from-[#06054e] to-slate-800 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                          <User size={24} className="text-[#06054e]" />
                        </div>
                        <div>
                          <p className="font-black text-lg">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-slate-300 font-bold">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${roleDefinition.color} text-white`}
                      >
                        <span>{roleDefinition.icon}</span>
                        <span>{roleDefinition.label}</span>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      {user.associationId && (
                        <div className="px-4 py-2 text-sm">
                          <p className="text-xs font-black uppercase text-slate-400 mb-1">
                            Association
                          </p>
                          <p className="font-bold text-slate-700">
                            {user.associationId}
                          </p>
                        </div>
                      )}

                      {user.clubId && (
                        <div className="px-4 py-2 text-sm">
                          <p className="text-xs font-black uppercase text-slate-400 mb-1">
                            Club
                          </p>
                          <p className="font-bold text-slate-700">
                            {user.clubId}
                          </p>
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
                        <User size={18} className="text-slate-600" />
                        <span className="font-bold text-slate-700">
                          My Profile
                        </span>
                      </button>

                      <div className="border-t border-slate-100 my-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors text-left"
                      >
                        <LogOut size={18} className="text-red-600" />
                        <span className="font-bold text-red-600">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
