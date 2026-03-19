// app/(website)/change-password/page.tsx
// Shown after first login (forcePasswordChange) or accessible from profile.
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

// ── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = "empty" | "weak" | "ok" | "strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return "empty";
  if (password.length < 8) return "weak";
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (password.length >= 12 && hasUppercase && hasNumber && hasSpecial)
    return "strong";
  if (password.length >= 8 && (hasNumber || hasUppercase)) return "ok";
  return "weak";
}

const strengthConfig: Record<
  StrengthLevel,
  { label: string; color: string; textColor: string; bars: number }
> = {
  empty: { label: "", color: "bg-slate-200", textColor: "", bars: 0 },
  weak: {
    label: "Weak",
    color: "bg-red-500",
    textColor: "text-red-600",
    bars: 1,
  },
  ok: {
    label: "Good",
    color: "bg-yellow-400",
    textColor: "text-yellow-600",
    bars: 2,
  },
  strong: {
    label: "Strong",
    color: "bg-green-500",
    textColor: "text-green-600",
    bars: 3,
  },
};

// ── Inner form (uses useSearchParams) ─────────────────────────────────────────

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/nominate";
  const isForced = searchParams.get("force") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const strengthInfo = strengthConfig[strength];
  const passwordsMatch =
    newPassword && confirmPassword ? newPassword === confirmPassword : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!isForced && !currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    setIsLoading(true);

    try {
      const body: Record<string, string> = {
        newPassword,
        confirmPassword,
      };
      if (!isForced) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({ error: "Server error" }));

      if (!res.ok) {
        setError(data.error || "Failed to change password.");
        return;
      }

      setSuccess(true);

      // Brief pause to show success state before redirecting
      setTimeout(() => {
        router.push(nextUrl);
      }, 1800);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06054e] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-[#06054e] text-lg group-hover:scale-105 transition-transform">
            H
          </div>
          <span className="text-white font-black uppercase text-sm tracking-wider hidden sm:block">
            Hockey Portal
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="bg-[#06054e] px-8 pt-8 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mb-4">
                <ShieldCheck size={28} className="text-[#06054e]" />
              </div>
              <h1 className="text-white font-black uppercase text-2xl leading-tight">
                {isForced ? "Set Your Password" : "Change Password"}
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {isForced
                  ? "Create a secure password for your account"
                  : "Update your account password"}
              </p>
            </div>

            <div className="px-8 py-7 space-y-5">
              {/* Force-change banner */}
              {isForced && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-2xl">
                  <AlertTriangle
                    size={18}
                    className="text-yellow-600 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-yellow-800 text-sm font-medium">
                    You must set a new password before continuing. Your
                    temporary password has expired.
                  </p>
                </div>
              )}

              {/* Success state */}
              {success && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-300 rounded-2xl">
                  <CheckCircle
                    size={18}
                    className="text-green-600 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-green-800 text-sm font-black">
                    Password updated successfully! Redirecting…
                  </p>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <AlertCircle
                    size={18}
                    className="text-red-500 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              {!success && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Current password — only shown when NOT forced */}
                  {!isForced && (
                    <div>
                      <label
                        htmlFor="currentPassword"
                        className="block text-xs font-black text-[#06054e] uppercase mb-2"
                      >
                        Current Password
                      </label>
                      <div className="relative">
                        <KeyRound
                          size={18}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          id="currentPassword"
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setError(null);
                          }}
                          autoComplete="current-password"
                          placeholder="Your current password"
                          disabled={isLoading}
                          className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          tabIndex={-1}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrent ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* New password */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-xs font-black text-[#06054e] uppercase mb-2"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        id="newPassword"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setError(null);
                        }}
                        autoComplete="new-password"
                        placeholder="Min. 8 characters"
                        disabled={isLoading}
                        className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Strength meter */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3].map((bar) => (
                            <div
                              key={bar}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                bar <= strengthInfo.bars
                                  ? strengthInfo.color
                                  : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        {strengthInfo.label && (
                          <p
                            className={`text-xs font-black ${strengthInfo.textColor}`}
                          >
                            {strengthInfo.label}
                            {strength === "weak" &&
                              " — needs at least 8 characters"}
                            {strength === "ok" &&
                              " — add uppercase + special for strong"}
                            {strength === "strong" && " — great password!"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-black text-[#06054e] uppercase mb-2"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError(null);
                        }}
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        disabled={isLoading}
                        className={`w-full pl-11 pr-12 py-3.5 rounded-xl border-2 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors disabled:opacity-60 ${
                          passwordsMatch === false
                            ? "border-red-300 bg-red-50"
                            : passwordsMatch === true
                              ? "border-green-400"
                              : "border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {passwordsMatch === true && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1 font-black">
                        <CheckCircle size={13} /> Passwords match
                      </p>
                    )}
                    {passwordsMatch === false && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={13} /> Passwords do not match
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading || success}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#06054e] text-white font-black uppercase tracking-wide hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        {isForced ? "Set Password" : "Change Password"}
                      </>
                    )}
                  </button>

                  {/* Cancel — only when not forced */}
                  {!isForced && (
                    <div className="text-center pt-1">
                      <Link
                        href={nextUrl}
                        className="text-slate-500 hover:text-slate-700 text-sm font-bold transition-colors"
                      >
                        Cancel
                      </Link>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Page export wrapped in Suspense ───────────────────────────────────────────

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06054e] flex items-center justify-center">
          <Loader2 size={32} className="text-yellow-400 animate-spin" />
        </div>
      }
    >
      <ChangePasswordForm />
    </Suspense>
  );
}
