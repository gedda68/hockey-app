// app/(website)/clubs/[clubId]/members/[memberId]/renew/page.tsx
// Membership renewal page

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Calendar,
  AlertCircle,
  User,
  CreditCard,
  FileText,
} from "lucide-react";

interface RenewalPreview {
  currentPeriod: {
    start: string;
    end: string;
  };
  newPeriod: {
    start: string;
    end: string;
  };
  membershipType: string;
  member: {
    name: string;
    memberId: string;
    email: string;
  };
  renewalHistory: any[];
}

interface MemberRenewalPageProps {
  params: {
    clubId: string;
    memberId: string;
  };
}

export default function MemberRenewalPage({ params }: MemberRenewalPageProps) {
  const { clubId, memberId } = params;
  const router = useRouter();

  const [preview, setPreview] = useState<RenewalPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [membershipType, setMembershipType] = useState("");
  const [fee, setFee] = useState("");
  const [notes, setNotes] = useState("");
  const [configItems, setConfigItems] = useState<any[]>([]);

  useEffect(() => {
    fetchRenewalPreview();
    fetchConfigItems();
  }, [clubId, memberId]);

  const fetchRenewalPreview = async () => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}/renew`);

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You do not have permission to renew memberships");
        }
        throw new Error("Failed to fetch renewal information");
      }

      const data = await res.json();
      setPreview(data);
      setMembershipType(data.membershipType);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfigItems = async () => {
    try {
      const res = await fetch(
        `/api/admin/config?configType=membershipType&activeOnly=true`,
      );
      if (res.ok) {
        const data = await res.json();
        setConfigItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch membership types:", err);
    }
  };

  const handleRenewal = async () => {
    if (!membershipType) {
      setError("Please select a membership type");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const res = await fetch(
        `/api/clubs/${clubId}/members/${memberId}/renew`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipType,
            fee: fee ? parseFloat(fee) : 0,
            notes,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to renew membership");
      }

      const data = await res.json();

      // Show success message
      alert(
        `✅ Membership renewed successfully for ${data.renewal.periodStart} - ${data.renewal.periodEnd}`,
      );

      // Redirect back to member view
      router.push(`/clubs/${clubId}/members/${memberId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getMembershipTypeName = (id: string) => {
    const config = configItems.find((c) => c.id === id);
    return config?.name || id;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">
            Loading renewal information...
          </p>
        </div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href={`/clubs/${clubId}/members/${memberId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white font-bold rounded-xl hover:bg-[#0a0866] transition-all"
          >
            <ArrowLeft size={20} />
            Back to Member
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          href={`/clubs/${clubId}/members/${memberId}`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Member
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#06054e]">
                Renew Membership
              </h1>
              <p className="text-slate-500 font-bold">
                {preview?.member.name} ({preview?.member.memberId})
              </p>
            </div>
          </div>

          {/* Current Period Info */}
          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
              <User size={20} />
              Current Membership
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Period Start
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {formatDate(preview?.currentPeriod.start || "")}
                </p>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Period End
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {formatDate(preview?.currentPeriod.end || "")}
                </p>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400">
                  Type
                </label>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {getMembershipTypeName(preview?.membershipType || "")}
                </p>
              </div>
            </div>
          </div>

          {/* New Period Info */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-black text-green-700 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              New Membership Period
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-green-600">
                  Period Start
                </label>
                <p className="text-xl font-black text-green-800 mt-1">
                  {formatDate(preview?.newPeriod.start || "")}
                </p>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-green-600">
                  Period End
                </label>
                <p className="text-xl font-black text-green-800 mt-1">
                  {formatDate(preview?.newPeriod.end || "")}
                </p>
              </div>
            </div>
          </div>

          {/* Renewal Form */}
          <div className="space-y-6 mb-6">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Membership Type
              </label>
              <select
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select membership type</option>
                {configItems.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Fee (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this renewal..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={20} />
                <p className="font-bold">{error}</p>
              </div>
            </div>
          )}

          {/* Renewal History */}
          {preview?.renewalHistory && preview.renewalHistory.length > 0 && (
            <div className="mb-6 pt-6 border-t border-slate-200">
              <h2 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
                <FileText size={20} />
                Renewal History
              </h2>
              <div className="space-y-2">
                {preview.renewalHistory.slice(0, 5).map((renewal: any) => (
                  <div
                    key={renewal.renewalId}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {formatDate(renewal.periodStart)} -{" "}
                        {formatDate(renewal.periodEnd)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Renewed: {formatDate(renewal.renewalDate)}
                      </p>
                    </div>
                    {renewal.fee && (
                      <span className="text-sm font-black text-green-600">
                        ${renewal.fee.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRenewal}
              disabled={isProcessing}
              className="flex-1 px-6 py-4 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Renew Membership
                </>
              )}
            </button>
            <Link
              href={`/clubs/${clubId}/members/${memberId}`}
              className="px-6 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
