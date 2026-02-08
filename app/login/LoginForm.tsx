// app/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getRoleDashboard, getRoleDisplayName } from "@/lib/auth/roleRedirects";
import { toast } from "sonner";
import { Loader, Lock, User } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth(); // ← Use setUser instead of login
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Set user directly in context
      setUser(data.user);

      // Get role-based dashboard
      const dashboardUrl = getRoleDashboard(
        data.user.role,
        data.user.clubId,
        data.user.associationId,
      );

      const roleDisplayName = getRoleDisplayName(data.user.role);

      toast.success(
        `Welcome back, ${data.user.firstName}! Logged in as ${roleDisplayName}`,
      );

      // Redirect to appropriate dashboard
      router.push(dashboardUrl);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-6">
          <a
            href="/"
            className="text-yellow-400 hover:text-yellow-300 font-bold text-sm flex items-center gap-2"
          >
            ← Back to Home
          </a>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-[#06054e] uppercase mb-2">
              Admin Login
            </h1>
            <p className="text-slate-600 font-bold">
              Enter your username and password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Username
              </label>
              <div className="relative">
                <User
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                  placeholder="jsmith"
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Your username is your first initial + last name (e.g., jsmith)
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Dev Credentials */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-black uppercase text-blue-800 mb-2">
                Dev Credentials:
              </p>
              <p className="text-sm text-blue-700">
                <strong>Username:</strong> jsmith (or your generated username)
              </p>
              <p className="text-sm text-blue-700">
                <strong>Password:</strong> Password1!
              </p>
            </div>
          )}

          {/* Return to Homepage */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-slate-600 hover:text-[#06054e] font-bold"
            >
              Return to homepage
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
