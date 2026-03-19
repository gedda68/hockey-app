// app/(website)/login/page.tsx
// Public player login page — username-only, no email option.
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
  Loader2,
  LogIn,
  User,
} from "lucide-react";

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/nominate";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({ error: "Server error" }));

      if (!res.ok) {
        setError(data.error || "Invalid username or password.");
        return;
      }

      if (data.forcePasswordChange) {
        // Redirect to change-password with the intended next destination
        router.push(
          `/change-password?next=${encodeURIComponent(callbackUrl)}&force=1`
        );
        return;
      }

      // Successful login — redirect
      router.push(callbackUrl);
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
        <Link
          href="/nominate"
          className="text-yellow-400 hover:text-yellow-300 text-sm font-bold transition-colors"
        >
          Nominate without logging in →
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Card header strip */}
            <div className="bg-[#06054e] px-8 pt-8 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mb-4">
                <KeyRound size={28} className="text-[#06054e]" />
              </div>
              <h1 className="text-white font-black uppercase text-2xl leading-tight">
                Player Login
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Sign in to the member portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
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

              {/* Username field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-black text-[#06054e] uppercase mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    autoComplete="username"
                    placeholder="e.g. sjohnson001"
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-black text-[#06054e] uppercase mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    autoComplete="current-password"
                    placeholder="Your password"
                    disabled={isLoading}
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#06054e] text-white font-black uppercase tracking-wide hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>

              {/* Forgot username hint */}
              <div className="pt-1 text-center">
                <p className="text-slate-500 text-sm">
                  Forgot your username?{" "}
                  <span className="text-slate-700 font-bold">
                    Contact your club administrator.
                  </span>
                </p>
              </div>

              {/* Divider + nominate link */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-sm">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/nominate"
                    className="text-[#06054e] font-black hover:text-yellow-600 transition-colors"
                  >
                    You can nominate without logging in →
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Tagline below card */}
          <p className="text-center text-blue-300 text-xs mt-6">
            Your account was created by your club administrator. Username format:{" "}
            <span className="font-bold text-blue-200">firstinitiallastname001</span>
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Page export wrapped in Suspense for useSearchParams ───────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06054e] flex items-center justify-center">
          <Loader2 size={32} className="text-yellow-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
