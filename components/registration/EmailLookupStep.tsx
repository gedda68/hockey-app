// components/registration/EmailLookupStep.tsx
// Step 1: Email lookup for returning player detection

"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  UserPlus,
  UserCheck,
  AlertCircle,
} from "lucide-react";

interface EmailLookupStepProps {
  onComplete: (data: {
    email: string;
    isReturningPlayer: boolean;
    memberId?: string;
    suggestedData?: any;
  }) => void;
  clubId: string;
}

export default function EmailLookupStep({
  onComplete,
  clubId,
}: EmailLookupStepProps) {
  const [email, setEmail] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const res = await fetch("/api/registration/check-returning-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, clubId }),
      });

      if (!res.ok) {
        throw new Error("Failed to check email");
      }

      const data = await res.json();

      // Check if banned
      if (data.isBanned) {
        setError(
          `This account is currently suspended. ${
            data.banDetails?.reason || ""
          }`
        );
        setIsChecking(false);
        return;
      }

      // Pass data to parent
      onComplete({
        email,
        isReturningPlayer: data.isReturningPlayer,
        memberId: data.memberId,
        suggestedData: data.suggestedData,
      });
    } catch (err: any) {
      setError(err.message || "Failed to check email");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
            <Search size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">
              Player Registration
            </h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              Step 1: Enter your email address
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-sm font-bold text-blue-700">
            If you've registered before, we'll automatically fill in your
            details to make the process faster. If you're new, we'll create your
            profile.
          </p>
        </div>
      </div>

      {/* Email Input */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <label className="block mb-2">
          <span className="text-lg font-black text-slate-800">
            Email Address <span className="text-red-500">*</span>
          </span>
        </label>

        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCheck()}
            placeholder="your.email@example.com"
            className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold text-lg focus:ring-2 ring-yellow-400 focus:border-yellow-400"
            disabled={isChecking}
          />

          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="px-8 py-4 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isChecking ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search size={20} />
                Continue
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-red-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-sm font-bold text-red-700">{error}</p>
          </div>
        )}

        {/* Examples */}
        <div className="mt-6 pt-6 border-t-2 border-slate-100">
          <p className="text-sm font-black uppercase text-slate-500 mb-3">
            What happens next?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <UserCheck
                size={20}
                className="text-green-600 flex-shrink-0 mt-1"
              />
              <div>
                <h3 className="font-black text-green-800 mb-1">
                  Returning Player
                </h3>
                <p className="text-sm font-bold text-green-700">
                  We'll pre-fill your details from last season
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <UserPlus
                size={20}
                className="text-blue-600 flex-shrink-0 mt-1"
              />
              <div>
                <h3 className="font-black text-blue-800 mb-1">New Player</h3>
                <p className="text-sm font-bold text-blue-700">
                  We'll help you create your player profile
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
