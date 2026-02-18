"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log("Sending login request with:", { email, password });

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("Response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Success!
      alert("Login successful!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#06054e] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#06054e] mb-2">Sign In</h1>
          <p className="text-slate-500 font-bold">Test Login</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#06054e]"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#06054e]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-4 bg-[#06054e] text-white font-black rounded-xl hover:bg-[#0a0866] transition-all disabled:opacity-50"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-xs font-black text-blue-800 mb-1">
            Pre-filled credentials:
          </p>
          <p className="text-xs font-bold text-blue-700">
            Email: admin@example.com
            <br />
            Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}
