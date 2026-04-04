// app/login/reset-password/page.tsx
// Validates the token from the email link then lets the user set a new password.

"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

// ── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = "empty" | "weak" | "ok" | "strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return "empty";
  if (password.length < 8) return "weak";
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (password.length >= 12 && hasUppercase && hasNumber && hasSpecial) return "strong";
  if (password.length >= 8 && (hasNumber || hasUppercase)) return "ok";
  return "weak";
}

const strengthConfig: Record<
  StrengthLevel,
  { label: string; color: string; textColor: string; bars: number }
> = {
  empty:  { label: "",       color: "bg-slate-200", textColor: "",                bars: 0 },
  weak:   { label: "Weak",   color: "bg-red-500",   textColor: "text-red-600",   bars: 1 },
  ok:     { label: "Good",   color: "bg-yellow-400",textColor: "text-yellow-600",bars: 2 },
  strong: { label: "Strong", color: "bg-green-500", textColor: "text-green-600", bars: 3 },
};

// ── Token validation state ────────────────────────────────────────────────────

type TokenState = "checking" | "valid" | "invalid" | "expired";

// ── Inner component ───────────────────────────────────────────────────────────

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // Token validation
  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [tokenError, setTokenError] = useState<string>("");

  // Form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Derived
  const strength = getPasswordStrength(newPassword);
  const strengthInfo = strengthConfig[strength];
  const passwordsMatch =
    newPassword && confirmPassword ? newPassword === confirmPassword : null;

  // ── Step 1: Validate the token as soon as the page loads ──────────────────
  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      setTokenError("No reset token found. Please use the link from your email.");
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setTokenState("valid");
        } else if (data.error?.toLowerCase().includes("expir")) {
          setTokenState("expired");
          setTokenError(data.error);
        } else {
          setTokenState("invalid");
          setTokenError(data.error || "Invalid or expired reset link.");
        }
      })
      .catch(() => {
        setTokenState("invalid");
        setTokenError("Could not validate your reset link. Please try again.");
      });
  }, [token]);

  // ── Step 2: Submit new password ───────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newPassword || newPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({ error: "Server error" }));

      if (!res.ok) {
        setFormError(data.error || "Failed to reset password. Please try again.");
        return;
      }

      setSuccess(true);

      // Redirect to login with a success flag after a short delay
      setTimeout(() => {
        router.push("/login?changed=1");
      }, 2000);
    } catch {
      setFormError("A connection error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render: checking ──────────────────────────────────────────────────────
  if (tokenState === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70 font-bold">Validating your reset link…</p>
        </div>
      </div>
    );
  }

  // ── Render: invalid / expired ─────────────────────────────────────────────
  if (tokenState === "invalid" || tokenState === "expired") {
    const isExpired = tokenState === "expired";
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#06054e] px-8 pt-8 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-400 flex items-center justify-center mb-4">
                <XCircle size={28} className="text-white" />
              </div>
              <h1 className="text-white font-black uppercase text-2xl leading-tight">
                {isExpired ? "Link Expired" : "Invalid Link"}
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {isExpired
                  ? "This reset link has expired"
                  : "This reset link is not valid"}
              </p>
            </div>

            <div className="px-8 py-7 space-y-5">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm font-medium">{tokenError}</p>
              </div>

              {isExpired && (
                <p className="text-xs text-slate-500 font-semibold text-center">
                  Reset links expire after <strong>60 minutes</strong>. Request
                  a new one below.
                </p>
              )}

              <Link
                href="/login/forgot-password"
                className="block w-full py-3.5 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm tracking-wide hover:bg-yellow-400 hover:text-[#06054e] transition-all text-center shadow-lg"
              >
                Request a New Link
              </Link>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: valid token — show the form ───────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-[#06054e] px-8 pt-8 pb-6">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mb-4">
              <ShieldCheck size={28} className="text-[#06054e]" />
            </div>
            <h1 className="text-white font-black uppercase text-2xl leading-tight">
              Reset Password
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Choose a strong new password for your account
            </p>
          </div>

          <div className="px-8 py-7 space-y-5">
            {/* Success state */}
            {success && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-300 rounded-2xl">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-800 text-sm font-black">
                  Password updated successfully! Redirecting to sign in…
                </p>
              </div>
            )}

            {/* Error banner */}
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
                <AlertCircle size={15} className="flex-shrink-0" />
                {formError}
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-xs font-black uppercase text-slate-500 mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setFormError(null);
                      }}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      disabled={isLoading}
                      className="w-full pl-11 pr-12 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
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
                        <p className={`text-xs font-black ${strengthInfo.textColor}`}>
                          {strengthInfo.label}
                          {strength === "weak"   && " — needs at least 8 characters"}
                          {strength === "ok"     && " — add uppercase + special for strong"}
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
                    className="block text-xs font-black uppercase text-slate-500 mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFormError(null);
                      }}
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      disabled={isLoading}
                      className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 font-bold focus:outline-none focus:border-[#06054e] transition-colors text-slate-900 disabled:opacity-60 ${
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
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
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
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm tracking-wide hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Set New Password
                    </>
                  )}
                </button>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06054e] flex items-center justify-center">
          <Loader2 size={32} className="text-yellow-400 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
