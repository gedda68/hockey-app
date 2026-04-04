// app/login/forgot-password/page.tsx
// Request a password-reset link via email.

"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle, KeyRound } from "lucide-react";

// ── Inner form (uses no search params — no Suspense boundary needed, but kept
//    consistent with the rest of the auth pages) ────────────────────────────

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      // Always show the success state regardless of whether the email exists
      // (mirrors the API's anti-enumeration design).
      if (res.ok || res.status === 200) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to login */}
        <div className="mb-6">
          <Link
            href="/login"
            className="text-yellow-400 hover:text-yellow-300 font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-[#06054e] px-8 pt-8 pb-6">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mb-4">
              <KeyRound size={28} className="text-[#06054e]" />
            </div>
            <h1 className="text-white font-black uppercase text-2xl leading-tight">
              Forgot Password?
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <div className="px-8 py-7">
            {/* ── Success state ─────────────────────────────────────────── */}
            {submitted ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-5 bg-green-50 border border-green-200 rounded-2xl">
                  <CheckCircle size={22} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-900 font-black text-sm mb-1">
                      Check your inbox
                    </p>
                    <p className="text-green-800 text-sm">
                      If an account is linked to{" "}
                      <strong className="font-bold">{email}</strong>, you'll
                      receive a reset link within a few minutes. Check your
                      spam folder if you don't see it.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-semibold text-center">
                  The link expires in <strong>60 minutes</strong>.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setEmail("");
                    }}
                    className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-[#06054e] hover:text-[#06054e] transition-all text-sm"
                  >
                    Try a different email
                  </button>
                  <Link
                    href="/login"
                    className="block w-full py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm tracking-wide hover:bg-yellow-400 hover:text-[#06054e] transition-all text-center shadow-lg"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              /* ── Request form ────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error banner */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-black uppercase text-slate-500 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      disabled={isLoading}
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors disabled:opacity-60 placeholder:font-normal"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1.5 ml-1">
                    Use the email address registered on your account.
                  </p>
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
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail size={17} />
                      Send Reset Link
                    </>
                  )}
                </button>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400 font-semibold">
                    Remember your password?{" "}
                    <Link
                      href="/login"
                      className="text-[#06054e] font-black hover:text-yellow-600 transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06054e] flex items-center justify-center">
          <Loader2 size={32} className="text-yellow-400 animate-spin" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
