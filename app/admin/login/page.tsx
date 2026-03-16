// app/admin/login/page.tsx
// Login page - accepts USERNAME or EMAIL

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate fields
    if (!username.trim()) {
      setError("Username or email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Submitting login:", {
        username,
        hasPassword: !!password,
      });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      console.log("📥 Login response:", {
        ok: response.ok,
        status: response.status,
        data,
      });

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Success - redirect to teams page
      console.log("✅ Login successful, redirecting...");
      router.push("/admin/teams");
      router.refresh();
    } catch (error) {
      console.error("💥 Login error:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#06054e] to-blue-700 rounded-3xl mx-auto mb-4 flex items-center justify-center">
            <User size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase text-[#06054e] tracking-tight mb-2">
            Teams Management
          </h1>
          <p className="text-slate-600 font-medium">
            Sign in to manage your club's teams
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle
                    size={20}
                    className="text-red-600 flex-shrink-0"
                  />
                  <p className="text-sm font-bold text-red-700">{error}</p>
                </div>
              )}

              {/* Username/Email */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                    placeholder="ga or g@gmail.com"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Use your username (e.g. ga) or email address
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-[#06054e] hover:bg-blue-900 disabled:bg-slate-300 text-white rounded-xl font-black uppercase text-sm transition-all shadow-lg shadow-[#06054e]/20 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Info Box */}
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="text-blue-600 flex-shrink-0 mt-0.5"
              />
              <div className="text-xs text-slate-600">
                <p className="font-bold mb-1">Access Levels:</p>
                <ul className="space-y-1">
                  <li>
                    • <strong>Super Admin:</strong> Manage all clubs and teams
                  </li>
                  <li>
                    • <strong>Club Admin:</strong> Manage your club's teams only
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Dev Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-xs font-bold text-blue-900 mb-2">
              Development Mode:
            </p>
            <div className="text-xs text-blue-800 space-y-1">
              <p>
                Existing user: <strong>ga</strong> or{" "}
                <strong>g@gmail.com</strong>
              </p>
              <p>Check browser console for login details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
