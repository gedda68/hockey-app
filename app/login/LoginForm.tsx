// app/login/LoginForm.tsx
// Unified login — works for admins AND member/player portal users.
// Role-based redirect after login; handles forcePasswordChange.

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getRoleDashboard, getRoleDisplayName, canAccessAdmin } from "@/lib/auth/roleRedirects";
import { toast } from "sonner";
import { Loader, Lock, User, Trophy, AlertCircle } from "lucide-react";

// Portal roles that should see the nomination CTA
const PORTAL_ROLES = ["player", "member", "parent"];

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const { setUser } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid username or password");
        setIsLoading(false);
        return;
      }

      // Force password change takes priority
      if (data.forcePasswordChange) {
        const next = callbackUrl || getRoleDashboard(data.user.role, data.user.clubId, data.user.associationId);
        router.push(`/change-password?next=${encodeURIComponent(next)}&force=1`);
        return;
      }

      // Set user in context
      setUser(data.user);

      const roleDisplayName = getRoleDisplayName(data.user.role);
      toast.success(`Welcome back, ${data.user.firstName || data.user.username}! Logged in as ${roleDisplayName}`);

      // Redirect: explicit callbackUrl → role dashboard
      const destination = callbackUrl || getRoleDashboard(data.user.role, data.user.clubId, data.user.associationId);
      router.push(destination);
    } catch {
      setError("An error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  const isPortalContext = callbackUrl.startsWith("/nominate") || callbackUrl.startsWith("/nomination");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/"
            className="text-yellow-400 hover:text-yellow-300 font-bold text-sm flex items-center gap-2"
          >
            ← Back to Home
          </a>
          {!isPortalContext && (
            <a
              href="/nominate"
              className="text-white/50 hover:text-yellow-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trophy size={13} />
              Rep Nominations →
            </a>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-8">
          <div className="text-center mb-8">
            {/* Icon */}
            <div className="w-16 h-16 bg-[#06054e] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-yellow-400" />
            </div>
            <h1 className="text-3xl font-black text-[#06054e] uppercase mb-2">
              Sign In
            </h1>
            <p className="text-slate-500 font-bold text-sm">
              {isPortalContext
                ? "Log in to pre-fill your nomination details"
                : "Enter your username and password"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors"
                  placeholder="e.g. sjohnson001"
                  autoComplete="username"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-1.5 ml-1">
                Format: first initial + last name + number (e.g. <code className="font-mono">sjohnson001</code>)
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm tracking-wide hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
            >
              {isLoading ? (
                <><Loader size={18} className="animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Forgot username */}
          <div className="mt-5 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-400 font-semibold">
              Forgotten your username? Contact your club administrator.
            </p>

            {/* Portal link — shown when coming from nomination context or for all users */}
            <div className="pt-1">
              <a
                href="/nominate"
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#06054e]/60 hover:text-[#06054e] transition-colors"
              >
                <Trophy size={12} />
                Nominate without an account →
              </a>
            </div>
          </div>

          {/* Dev credentials */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-[10px] font-black uppercase text-blue-700 mb-2">Dev Credentials</p>
              <p className="text-xs text-blue-700 font-semibold">
                <strong>Username:</strong> sjohnson001 &nbsp;·&nbsp; <strong>Password:</strong> Hockey2026!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
import { Suspense } from "react";

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
