// app/login/LoginForm.tsx
// Unified login — works for admins AND member/player portal users.
// Role-based redirect after login; handles forcePasswordChange.

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePublicTenant } from "@/lib/contexts/PublicTenantContext";
import { getRoleDashboard, getRoleDisplayName } from "@/lib/auth/roleRedirects";
import { pickTenantOriginForLogin } from "@/lib/auth/postLoginTenant";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";
import { toast } from "sonner";
import { Loader, Lock, User, Trophy, AlertCircle, CheckCircle } from "lucide-react";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?callbackUrl= comes from middleware when the user was redirected to login
  const callbackUrl = searchParams.get("callbackUrl") || "";
  // ?next= comes from the change-password page after a forced reset
  const nextParam = searchParams.get("next") || "";
  // ?changed=1 is set by change-password after a successful forced reset
  const passwordChanged = searchParams.get("changed") === "1";
  const ssoError = searchParams.get("sso_error");
  const ssoHint = searchParams.get("hint");

  const ssoButtonVisible = process.env.NEXT_PUBLIC_SSO_BUTTON === "true";
  const ssoContinueHref = `/api/auth/sso?callbackUrl=${encodeURIComponent(
    callbackUrl || nextParam || "/",
  )}`;

  const { refreshUser } = useAuth();
  const { tenant: portalTenant } = usePublicTenant();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function withTenantOriginIfNeeded(
    pathOrUrl: string,
    role: string,
    clubPortalOrigin?: string | null,
    associationPortalOrigin?: string | null,
  ): string {
    if (!pathOrUrl || typeof window === "undefined") return pathOrUrl;

    const tenantOrigin = pickTenantOriginForLogin(
      role,
      clubPortalOrigin,
      associationPortalOrigin,
    );
    if (!tenantOrigin) return pathOrUrl;

    const tenantBase = tenantOrigin.replace(/\/$/, "");
    const here = window.location.origin.replace(/\/$/, "");

    let apexOrigin: string;
    try {
      apexOrigin = new URL(buildApexSiteOrigin()).origin;
    } catch {
      return pathOrUrl;
    }

    let internalPath: string;
    try {
      if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
        const u = new URL(pathOrUrl);
        if (u.origin !== apexOrigin) {
          return pathOrUrl;
        }
        internalPath = `${u.pathname}${u.search}${u.hash}` || "/";
      } else {
        internalPath = pathOrUrl.startsWith("/")
          ? pathOrUrl
          : `/${pathOrUrl}`;
      }
    } catch {
      return pathOrUrl;
    }

    if (here === tenantBase) {
      return internalPath;
    }
    return `${tenantBase}${internalPath}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid username or password");
        setIsLoading(false);
        return;
      }

      // Force password change takes priority — send to change-password page
      if (data.forcePasswordChange) {
        const nextRaw =
          callbackUrl ||
          nextParam ||
          getRoleDashboard(
            data.user.role,
            data.user.clubSlug || data.user.clubId,
            data.user.associationId,
          );
        const next = withTenantOriginIfNeeded(
          nextRaw,
          data.user.role,
          data.clubPortalOrigin,
          data.associationPortalOrigin,
        );
        router.push(`/change-password?next=${encodeURIComponent(next)}&force=1`);
        return;
      }

      // Redirect priority: callbackUrl → next param → role dashboard
      const destination =
        callbackUrl ||
        nextParam ||
        getRoleDashboard(data.user.role, data.user.clubSlug || data.user.clubId, data.user.associationId);
      const finalDest = withTenantOriginIfNeeded(
        destination,
        data.user.role,
        data.clubPortalOrigin,
        data.associationPortalOrigin,
      );

      let crossTenantNavigation = false;
      let finalDestOrigin: string | null = null;
      try {
        if (
          finalDest.startsWith("http://") ||
          finalDest.startsWith("https://")
        ) {
          finalDestOrigin = new URL(finalDest).origin;
          crossTenantNavigation =
            finalDestOrigin !== window.location.origin;
        }
      } catch {
        /* keep false */
      }

      // Browsers often do not share cookies between `localhost` and `hq.localhost`.
      // If the API returns a `sessionJwt` and we’re navigating to another host,
      // redirect through that host’s `/api/auth/consume-session` so the cookie is
      // set on the correct tenant host before landing on the destination page.
      if (
        typeof data.sessionJwt === "string" &&
        data.sessionJwt.length > 0 &&
        finalDestOrigin &&
        finalDestOrigin !== window.location.origin
      ) {
        let nextPath = "/";
        try {
          const u = new URL(finalDest);
          nextPath = `${u.pathname}${u.search}${u.hash}` || "/";
        } catch {
          // ignore — keep "/"
        }
        const consume = `${finalDestOrigin}/api/auth/consume-session?token=${encodeURIComponent(
          data.sessionJwt,
        )}&next=${encodeURIComponent(nextPath)}`;
        window.location.assign(consume);
        return;
      }

      if (!crossTenantNavigation) {
        await refreshUser();
      }

      const roleDisplayName = getRoleDisplayName(data.user.role);
      toast.success(`Welcome back, ${data.user.firstName || data.user.username}! Logged in as ${roleDisplayName}`);

      if (
        finalDest.startsWith("http://") ||
        finalDest.startsWith("https://")
      ) {
        window.location.assign(finalDest);
      } else {
        router.push(finalDest);
      }
    } catch {
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isPortalContext = callbackUrl.startsWith("/nominate") || callbackUrl.startsWith("/nomination");

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        portalTenant
          ? ""
          : "bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e]"
      }`}
      style={
        portalTenant
          ? {
              background: `linear-gradient(135deg, ${portalTenant.primaryColor} 0%, ${portalTenant.tertiaryColor} 40%, ${portalTenant.secondaryColor} 100%)`,
            }
          : undefined
      }
    >
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
            {portalTenant?.logo ? (
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- tenant logos may be any origin */}
                <img
                  src={portalTenant.logo}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: portalTenant?.primaryColor ?? "#06054e",
                }}
              >
                <User
                  size={32}
                  className="text-yellow-400"
                  style={{
                    color: portalTenant?.accentColor ?? undefined,
                  }}
                />
              </div>
            )}
            <h1 className="text-3xl font-black text-[#06054e] uppercase mb-2">
              Sign in
              {portalTenant ? (
                <span className="block text-lg font-black text-slate-600 normal-case mt-1">
                  {portalTenant.displayName}
                </span>
              ) : null}
            </h1>
            <p className="text-slate-500 font-bold text-sm">
              {isPortalContext
                ? "Log in to pre-fill your nomination details"
                : portalTenant
                  ? `Portal · ${portalTenant.kind === "club" ? "Club" : "Association"}`
                  : "Enter your username and password"}
            </p>
          </div>

          {ssoError && (
            <div className="flex items-start gap-3 p-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl">
              <AlertCircle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-amber-900 text-sm font-semibold space-y-1">
                <p>Organisation sign-in could not complete.</p>
                <p className="text-amber-800/90 font-normal text-xs break-words">
                  {(() => {
                    try {
                      return decodeURIComponent(ssoError);
                    } catch {
                      return ssoError;
                    }
                  })()}
                  {ssoHint ? ` (${ssoHint})` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Password-changed success banner */}
          {passwordChanged && (
            <div className="flex items-start gap-3 p-4 mb-5 bg-green-50 border border-green-300 rounded-2xl">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 text-sm font-semibold">
                Password updated successfully! Please sign in with your new password.
              </p>
            </div>
          )}

          {ssoButtonVisible && (
            <div className="mb-6">
              <a
                href={ssoContinueHref}
                className="flex w-full items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-slate-200 bg-white font-black uppercase text-sm text-[#06054e] hover:border-[#06054e] hover:bg-slate-50 transition-all shadow-sm"
              >
                Continue with organisation account
              </a>
              <p className="text-center text-[11px] text-slate-400 font-semibold mt-2">
                Single sign-on (Microsoft, Google, or your identity provider)
              </p>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-black uppercase text-slate-400">
                  <span className="bg-white px-3">Or use username</span>
                </div>
              </div>
            </div>
          )}

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

          {/* Footer links */}
          <div className="mt-5 pt-5 border-t border-slate-100 text-center space-y-3">
            {/* Forgot password */}
            <a
              href="/login/forgot-password"
              className="block text-sm font-black text-[#06054e] hover:text-yellow-600 transition-colors"
            >
              Forgot your password?
            </a>

            <p className="text-xs text-slate-400 font-semibold">
              Forgotten your username? Contact your club administrator.
            </p>
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
                <strong>Username:</strong> bhaadmin001 &nbsp;·&nbsp; <strong>Password:</strong> (set on first login)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
