// components/registration/RoleSelectionStep.tsx
// Step 3: Role selection with real-time fee calculation

"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
} from "lucide-react";

interface RoleSelectionStepProps {
  clubId: string;
  availableRoles: any[];
  suggestedRoles?: string[];
  onComplete: (data: {
    roleIds: string[];
    ageCategory: string;
    fees: any;
  }) => void;
  onBack: () => void;
}

export default function RoleSelectionStep({
  clubId,
  availableRoles,
  suggestedRoles = [],
  onComplete,
  onBack,
}: RoleSelectionStepProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(suggestedRoles);
  const [ageCategory, setAgeCategory] = useState<string>("");
  const [fees, setFees] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate fees when roles or age category changes
  useEffect(() => {
    if (selectedRoles.length > 0 && ageCategory) {
      calculateFees();
    } else {
      setFees(null);
    }
  }, [selectedRoles, ageCategory]);

  const calculateFees = async () => {
    setIsCalculating(true);

    try {
      const res = await fetch("/api/registration/calculate-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          roleIds: selectedRoles,
          ageCategory,
          seasonYear: new Date().getFullYear().toString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to calculate fees");

      const data = await res.json();
      setFees(data);
    } catch (error) {
      console.error("Error calculating fees:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleContinue = () => {
    if (selectedRoles.length === 0 || !ageCategory) return;

    onComplete({
      roleIds: selectedRoles,
      ageCategory,
      fees,
    });
  };

  // Group roles by category
  const rolesByCategory = availableRoles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<string, typeof availableRoles>);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">
              Select Your Roles
            </h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              Step 3: Choose how you'll participate
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-sm font-bold text-blue-700">
            You can select multiple roles. Fees will be calculated based on your
            selections.
          </p>
        </div>
      </div>

      {/* Age Category */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-4">
          Age Category <span className="text-red-500">*</span>
        </h2>
        <p className="text-sm font-bold text-slate-600 mb-4">
          Select your age category
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: "junior", label: "Junior", desc: "Under 18 years" },
            { value: "senior", label: "Senior", desc: "18+ years" },
            { value: "masters", label: "Masters", desc: "35+ years" },
          ].map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setAgeCategory(cat.value)}
              className={`p-6 rounded-2xl border-2 transition-all ${
                ageCategory === cat.value
                  ? "bg-[#06054e] text-white border-[#06054e]"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-xl font-black mb-1">{cat.label}</div>
              <div
                className={`text-sm font-bold ${
                  ageCategory === cat.value ? "text-white/80" : "text-slate-500"
                }`}
              >
                {cat.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Role Selection */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-4">
          Your Roles <span className="text-red-500">*</span>
        </h2>
        <p className="text-sm font-bold text-slate-600 mb-6">
          Select all that apply
        </p>

        <div className="space-y-8">
          {Object.entries(rolesByCategory).map(([category, categoryRoles]) => (
            <div key={category}>
              <h3 className="text-sm font-black uppercase text-slate-500 mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryRoles.map((role: any) => (
                  <label
                    key={role.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRoles.includes(role.id)
                        ? "bg-yellow-50 border-yellow-400"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="w-5 h-5 rounded border-2 border-slate-300"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">
                        {role.name}
                      </div>
                      {role.description && (
                        <div className="text-xs font-bold text-slate-500 mt-0.5">
                          {role.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedRoles.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
            <p className="text-sm font-bold text-yellow-700">
              Please select at least one role
            </p>
          </div>
        )}
      </div>

      {/* Fee Summary */}
      {selectedRoles.length > 0 && ageCategory && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign size={24} className="text-[#06054e]" />
            <h2 className="text-2xl font-black text-[#06054e]">
              Registration Fees
            </h2>
          </div>

          {isCalculating ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-[#06054e]" />
            </div>
          ) : fees ? (
            <>
              {/* Fee Breakdown */}
              <div className="space-y-4 mb-6">
                {/* Association Fees */}
                {fees.feesByType.association.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-500 mb-2">
                      Association Fees
                    </h3>
                    {fees.feesByType.association.map((item: any) => (
                      <div
                        key={item.itemId}
                        className="flex justify-between py-2 border-b border-slate-100"
                      >
                        <span className="font-bold text-slate-700">
                          {item.name}
                        </span>
                        <span className="font-black text-slate-900">
                          ${item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Club Fees */}
                {fees.feesByType.club.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-500 mb-2">
                      Club Fees
                    </h3>
                    {fees.feesByType.club.map((item: any) => (
                      <div
                        key={item.itemId}
                        className="flex justify-between py-2 border-b border-slate-100"
                      >
                        <span className="font-bold text-slate-700">
                          {item.name}
                        </span>
                        <span className="font-black text-slate-900">
                          ${item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Insurance */}
                {fees.feesByType.insurance.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-500 mb-2">
                      Insurance
                    </h3>
                    {fees.feesByType.insurance.map((item: any) => (
                      <div
                        key={item.itemId}
                        className="flex justify-between py-2 border-b border-slate-100"
                      >
                        <span className="font-bold text-slate-700">
                          {item.name}
                        </span>
                        <span className="font-black text-slate-900">
                          ${item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-4 border-t-2 border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-slate-900">
                    TOTAL
                  </span>
                  <span className="text-3xl font-black text-[#06054e]">
                    ${fees.summary.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 text-right mt-1">
                  GST included: ${fees.summary.gst.toFixed(2)}
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Navigation */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <button
            onClick={handleContinue}
            disabled={selectedRoles.length === 0 || !ageCategory}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
