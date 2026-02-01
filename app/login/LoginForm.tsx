// app/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getRoleDashboard, getRoleDisplayName } from "@/lib/auth/roleRedirects";
import { Mail, Lock, LogIn, AlertCircle, Home } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Login and get user data
      const userData = await login(email, password);

      // Get role-based dashboard
      const dashboard = getRoleDashboard(
        userData.role,
        userData.clubId,
        userData.associationId
      );

      // Show personalized welcome
      const roleName = getRoleDisplayName(userData.role);
      toast.success(
        `Welcome back, ${userData.firstName}! Logged in as ${roleName}`
      );

      // Redirect to appropriate dashboard
      router.push(dashboard);
    } catch (err: any) {
      const msg = err.message || "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#06054e] to-slate-900 p-6">
      <div className="max-w-md w-full">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-bold transition-colors"
          >
            <Home size={18} />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏑</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase mb-2">
            Hockey Admin
          </h1>
          <p className="text-slate-300 font-bold">Management System Login</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-8">
          <h2 className="text-2xl font-black text-[#06054e] uppercase mb-6">
            Admin Sign In
          </h2>

          {error && (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="text-red-600 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
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
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-[#06054e] text-white rounded-xl font-black uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <LogIn size={20} />
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-sm text-slate-600 hover:text-[#06054e] font-bold"
            >
              Forgot password?
            </a>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-300 font-bold mb-2">
            Need help? Contact your administrator
          </p>
          <Link
            href="/"
            className="text-sm text-yellow-400 hover:text-yellow-300 font-bold"
          >
            Return to homepage →
          </Link>
        </div>

        {/* Dev Info - Remove in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
            <p className="text-xs text-slate-400 font-bold mb-2">
              🔐 Development Credentials:
            </p>
            <p className="text-xs text-slate-300 font-mono">
              Email: admin@example.com
              <br />
              Password: Admin123!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
