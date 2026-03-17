// components/admin/players/NominationWorkflowModal.tsx
// 4-step nomination workflow modal: Verify → Review → Payment → Done

"use client";

import { useState } from "react";
import {
  CheckCircle,
  CreditCard,
  DollarSign,
  User,
  Calendar,
  MapPin,
  X,
  Loader2,
  AlertCircle,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { calcAgeForSeason } from "@/types/nominations";
import type { OpenOpportunity } from "@/types/tournaments";

interface Props {
  player: {
    playerId: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    email?: string;
    phone?: string;
    clubId?: string;
    linkedMemberId?: string;
  };
  opportunity: OpenOpportunity;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "verifying" | "reviewing" | "payment" | "done";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function GenderIcon({ gender }: { gender: string }) {
  const g = gender.toLowerCase();
  if (g === "male") return <span className="text-blue-600 font-black text-xs">M</span>;
  if (g === "female") return <span className="text-pink-600 font-black text-xs">F</span>;
  return <span className="text-slate-500 font-black text-xs">Mixed</span>;
}

export default function NominationWorkflowModal({
  player,
  opportunity,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("verifying");

  // Editable player details (step 1)
  const [dob, setDob] = useState(player.dateOfBirth ?? "");
  const [gender, setGender] = useState(player.gender ?? "");
  const [email, setEmail] = useState(player.email ?? "");
  const [phone, setPhone] = useState(player.phone ?? "");
  const [patching, setPatching] = useState(false);
  const [patchError, setPatchError] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [showStripeMsg, setShowStripeMsg] = useState(false);
  const [showPaypalMsg, setShowPaypalMsg] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [nominationId, setNominationId] = useState("");

  const seasonYear = parseInt(opportunity.season, 10);
  const playerAge = dob ? calcAgeForSeason(dob, seasonYear) : null;
  const fee = opportunity.nominationFee ?? 0;

  // Check gender eligibility
  const tg = opportunity.tournamentGender;
  const pg = gender.toLowerCase();
  const genderOk =
    tg === "mixed" ||
    pg.includes(tg) ||
    (tg === "male" && (pg === "male" || pg === "m")) ||
    (tg === "female" && (pg === "female" || pg === "f"));

  // Patch player details
  async function patchPlayer() {
    setPatching(true);
    setPatchError("");
    try {
      const res = await fetch(`/api/admin/players/${player.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth: dob, gender }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update player");
      }
    } catch (err: any) {
      setPatchError(err.message);
      throw err;
    } finally {
      setPatching(false);
    }
  }

  async function handleVerifyNext() {
    // Only patch if something changed
    const dobChanged = dob !== (player.dateOfBirth ?? "");
    const genderChanged = gender !== (player.gender ?? "");
    if (dobChanged || genderChanged) {
      try {
        await patchPlayer();
      } catch {
        return; // patchError already set
      }
    }
    setStep("reviewing");
  }

  async function submitNomination(pmMethod: string | null, pmStatus: string) {
    setSubmitting(true);
    setSubmitError("");
    try {
      // 1. POST nomination
      const nomBody: Record<string, any> = {
        season: opportunity.season,
        ageGroup: opportunity.ageGroup,
        clubId: player.clubId ?? "",
        playerId: player.playerId,
      };
      if (player.linkedMemberId) nomBody.memberId = player.linkedMemberId;

      const nomRes = await fetch("/api/admin/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nomBody),
      });

      if (!nomRes.ok) {
        const err = await nomRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create nomination");
      }

      const nomData = await nomRes.json();
      setNominationId(nomData.nominationId ?? "");

      // 2. PATCH player with tournamentHistory and feeHistory
      const now = new Date().toISOString().split("T")[0];
      const histEntry = {
        id: `th-${Date.now()}`,
        season: opportunity.season,
        ageGroup: opportunity.ageGroup,
        tournamentId: opportunity.tournamentId,
        tournamentTitle: opportunity.tournamentTitle,
        tournamentLocation: opportunity.tournamentLocation,
        tournamentStartDate: opportunity.tournamentStartDate,
        nominatedDate: now,
        nominationStatus: "pending" as const,
      };

      const patchBody: Record<string, any> = {
        tournamentHistory: [histEntry],
        _appendTournamentHistory: true,
      };

      if (fee > 0) {
        const feeEntry = {
          id: `fee-${Date.now()}`,
          date: now,
          type: "nomination",
          description: `Nomination fee – ${opportunity.ageGroup} ${opportunity.season}`,
          amount: fee,
          currency: "AUD",
          status: pmStatus,
          ...(pmMethod && { paymentMethod: pmMethod }),
          ...(pmStatus === "paid" && { paidDate: now }),
          linkedTournamentId: opportunity.tournamentId,
        };
        patchBody.feeHistory = [feeEntry];
        patchBody._appendFeeHistory = true;
      }

      // Fire and forget — best-effort history update
      fetch(`/api/admin/players/${player.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      }).catch(console.warn);

      setStep("done");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Step 3 payment handlers
  function handleCash() {
    setPaymentMethod("cash");
    setPaymentStatus("paid");
    submitNomination("cash", "paid");
  }

  function handlePayLater() {
    setPaymentMethod(null);
    setPaymentStatus("pending");
    submitNomination(null, "pending");
  }

  // ─── Step indicators ────────────────────────────────────────────────────────
  const steps = [
    { id: "verifying", label: "Verify" },
    { id: "reviewing", label: "Review" },
    ...(fee > 0 ? [{ id: "payment", label: "Payment" }] : []),
    { id: "done", label: "Done" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-6 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-[#06054e] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-yellow-400" />
            <h2 className="text-lg font-black uppercase text-white">
              {step === "verifying" && "Verify Player Details"}
              {step === "reviewing" && "Nomination Review"}
              {step === "payment" && "Nomination Fee Payment"}
              {step === "done" && "Nomination Submitted"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-0 px-8 py-4 bg-[#06054e]/5 border-b border-slate-100">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                i < currentStepIndex
                  ? "bg-green-100 text-green-700"
                  : i === currentStepIndex
                    ? "bg-[#06054e] text-white"
                    : "bg-slate-100 text-slate-400"
              }`}>
                {i < currentStepIndex ? <CheckCircle size={11} /> : null}
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <ChevronRight size={14} className="text-slate-300 mx-1" />
              )}
            </div>
          ))}
        </div>

        <div className="px-8 py-6">
          {/* ═══ STEP 1: VERIFY ══════════════════════════════════════════════ */}
          {step === "verifying" && (
            <div className="space-y-4">
              {/* Player name (read-only) */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 bg-[#06054e]/10 rounded-full flex items-center justify-center">
                  <User size={18} className="text-[#06054e]" />
                </div>
                <div>
                  <p className="font-black text-[#06054e] text-sm">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{player.playerId}</p>
                </div>
              </div>

              {patchError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  <AlertCircle size={15} />
                  {patchError}
                </div>
              )}

              {/* DOB */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Date of Birth
                  {!dob && <AlertCircle size={11} className="text-amber-500" />}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Gender
                  {!gender && <AlertCircle size={11} className="text-amber-500" />}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e] focus:border-[#06054e] focus:outline-none"
                >
                  <option value="">Select gender…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Email
                  {!email && <AlertCircle size={11} className="text-slate-300" />}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Phone
                  {!phone && <AlertCircle size={11} className="text-slate-300" />}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="04xx xxx xxx"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                />
              </div>

              <button
                onClick={handleVerifyNext}
                disabled={!dob || !gender || patching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-40"
              >
                {patching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {patching ? "Saving…" : "Details Look Correct"}
              </button>
            </div>
          )}

          {/* ═══ STEP 2: REVIEW ══════════════════════════════════════════════ */}
          {step === "reviewing" && (
            <div className="space-y-4">
              {/* Tournament summary card */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Trophy size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-[#06054e] text-sm leading-tight">
                      {opportunity.tournamentTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-[#06054e]/10 text-[#06054e] rounded-full text-[10px] font-black uppercase">
                        {opportunity.ageGroup}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                        <GenderIcon gender={opportunity.tournamentGender} />
                        {opportunity.tournamentGender}
                      </span>
                    </div>
                  </div>
                </div>

                {opportunity.tournamentLocation && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                    {opportunity.tournamentLocation}
                  </div>
                )}

                {opportunity.tournamentStartDate && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                    {formatDate(opportunity.tournamentStartDate)}
                    {opportunity.tournamentEndDate && opportunity.tournamentEndDate !== opportunity.tournamentStartDate && (
                      <> – {formatDate(opportunity.tournamentEndDate)}</>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="text-amber-700 font-semibold">
                    Nominations close: <strong>{formatDate(opportunity.nominationPeriodEnd)}</strong>
                    {" "}· {opportunity.daysRemaining}d remaining
                  </span>
                </div>
              </div>

              {/* Eligibility checks */}
              <div className="space-y-2">
                {/* Age check */}
                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">
                    Age for {opportunity.season}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#06054e]">
                      {playerAge !== null ? playerAge : "—"}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                      <CheckCircle size={10} /> Eligible
                    </span>
                  </div>
                </div>

                {/* Gender check */}
                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">
                    Gender
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#06054e]">
                      {gender || "—"}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                      genderOk
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      <CheckCircle size={10} />
                      {genderOk ? "Eligible" : "Check"}
                    </span>
                  </div>
                </div>

                {/* Fee */}
                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">
                    Nomination Fee
                  </span>
                  <span className="text-sm font-black text-[#06054e]">
                    {fee > 0 ? `$${fee.toFixed(2)} AUD` : "No fee"}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  <AlertCircle size={15} />
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("verifying")}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (fee > 0) {
                      setStep("payment");
                    } else {
                      submitNomination(null, "paid");
                    }
                  }}
                  disabled={submitting}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-xs rounded-2xl transition-all disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {submitting
                    ? "Submitting…"
                    : fee > 0
                      ? "Continue to Payment"
                      : "Confirm Nomination"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: PAYMENT ═════════════════════════════════════════════ */}
          {step === "payment" && (
            <div className="space-y-4">
              {/* Fee summary */}
              <div className="text-center py-6 bg-slate-50 rounded-2xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <DollarSign size={28} className="text-[#06054e]" />
                  <span className="text-4xl font-black text-[#06054e]">
                    {fee.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm font-black uppercase text-slate-400">AUD</p>
                <p className="text-xs text-slate-500 mt-1">
                  {opportunity.ageGroup} Nomination Fee
                </p>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  <AlertCircle size={15} />
                  {submitError}
                </div>
              )}

              {/* Payment options */}
              <div className="space-y-2">
                {/* Stripe */}
                <div>
                  <button
                    onClick={() => {
                      setShowStripeMsg(true);
                      setShowPaypalMsg(false);
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-sm rounded-2xl transition-all"
                  >
                    <CreditCard size={18} />
                    Pay with Card (Stripe)
                  </button>
                  {showStripeMsg && (
                    <div className="mt-2 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold">
                      Stripe integration coming soon. Please use an alternative payment method.
                    </div>
                  )}
                </div>

                {/* PayPal */}
                <div>
                  <button
                    onClick={() => {
                      setShowPaypalMsg(true);
                      setShowStripeMsg(false);
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#003087] hover:bg-[#002069] text-white font-black uppercase text-sm rounded-2xl transition-all"
                  >
                    <DollarSign size={18} />
                    Pay with PayPal
                  </button>
                  {showPaypalMsg && (
                    <div className="mt-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-semibold">
                      PayPal integration coming soon. Please use an alternative payment method.
                    </div>
                  )}
                </div>

                {/* Cash */}
                <button
                  onClick={handleCash}
                  disabled={submitting}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-40"
                >
                  {submitting && paymentMethod === "cash" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <DollarSign size={18} />
                  )}
                  Record Cash Payment
                </button>

                {/* Pay Later */}
                <button
                  onClick={handlePayLater}
                  disabled={submitting}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-500 hover:bg-slate-600 text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-40"
                >
                  {submitting && paymentMethod === null ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Calendar size={18} />
                  )}
                  Nominate Now, Pay Later
                </button>
              </div>

              <button
                onClick={() => setStep("reviewing")}
                className="w-full py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
              >
                Back
              </button>
            </div>
          )}

          {/* ═══ STEP 4: DONE ════════════════════════════════════════════════ */}
          {step === "done" && (
            <div className="text-center space-y-5 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={44} className="text-green-500" />
              </div>

              <div>
                <p className="text-xl font-black text-[#06054e] mb-1">
                  {player.firstName} {player.lastName}
                </p>
                <p className="text-sm text-slate-500 font-semibold">
                  {opportunity.tournamentTitle}
                </p>
                {nominationId && (
                  <p className="text-xs text-slate-400 mt-1">ID: {nominationId}</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black uppercase">
                  Status: Pending
                </span>
                {fee > 0 && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase ${
                    paymentStatus === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {paymentStatus === "paid" ? "Paid" : "Payment Pending"}
                  </span>
                )}
              </div>

              <button
                onClick={onSuccess}
                className="w-full py-3 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-sm rounded-2xl transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
