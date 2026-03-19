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
  Phone,
  Mail,
  Plus,
  Trash2,
  Heart,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { calcAgeForSeason } from "@/types/nominations";
import type { OpenOpportunity } from "@/types/tournaments";

// ── Local interfaces ─────────────────────────────────────────────────────────
interface LocalEmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface LocalMedical {
  conditions: string;
  allergies: string;
  medications: string;
  bloodType: string;
  doctorName: string;
  doctorPhone: string;
}

const EMPTY_CONTACT: Omit<LocalEmergencyContact, "id"> = {
  name: "",
  relationship: "",
  phone: "",
  email: "",
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

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
    emergencyContacts?: Array<{
      id?: string;
      name: string;
      relationship: string;
      phone?: string;
      email?: string;
    }>;
    medical?: {
      conditions?: string;
      allergies?: string;
      medications?: string;
      bloodType?: string;
      doctorName?: string;
      doctorPhone?: string;
    };
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

// ── Field row for read-only display ─────────────────────────────────────────
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
        {label}
        <Lock size={9} className="text-slate-300" />
      </label>
      <div className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 select-none">
        {value || <span className="text-slate-300">—</span>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NominationWorkflowModal({
  player,
  opportunity,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("verifying");

  // Contact details (editable)
  const [email, setEmail] = useState(player.email ?? "");
  const [phone, setPhone] = useState(player.phone ?? "");

  // Emergency contacts
  const [emergencyContacts, setEmergencyContacts] = useState<LocalEmergencyContact[]>(
    (player.emergencyContacts ?? []).map((c, i) => ({
      id: c.id ?? `ec-init-${i}`,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone ?? "",
      email: c.email ?? "",
    }))
  );
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<Omit<LocalEmergencyContact, "id">>({ ...EMPTY_CONTACT });

  // Medical info (collapsible)
  const [medical, setMedical] = useState<LocalMedical>({
    conditions: player.medical?.conditions ?? "",
    allergies: player.medical?.allergies ?? "",
    medications: player.medical?.medications ?? "",
    bloodType: player.medical?.bloodType ?? "",
    doctorName: player.medical?.doctorName ?? "",
    doctorPhone: player.medical?.doctorPhone ?? "",
  });
  const [showMedical, setShowMedical] = useState(false);

  // Patch state
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
  const playerAge = player.dateOfBirth ? calcAgeForSeason(player.dateOfBirth, seasonYear) : null;
  const fee = opportunity.nominationFee ?? 0;

  // Check gender eligibility
  const tg = opportunity.tournamentGender;
  const pg = (player.gender ?? "").toLowerCase();
  const genderOk =
    tg === "mixed" ||
    pg.includes(tg) ||
    (tg === "male" && (pg === "male" || pg === "m")) ||
    (tg === "female" && (pg === "female" || pg === "f"));

  // Emergency contact helpers
  function addEmergencyContact() {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    setEmergencyContacts((prev) => [
      ...prev,
      { ...newContact, id: `ec-${Date.now()}` },
    ]);
    setNewContact({ ...EMPTY_CONTACT });
    setAddingContact(false);
  }

  function removeEmergencyContact(id: string) {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
  }

  // Patch player details (contact info, emergency contacts, medical)
  async function patchPlayerDetails() {
    setPatching(true);
    setPatchError("");
    try {
      const res = await fetch(`/api/admin/players/${player.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          emergencyContacts,
          medical,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update player details");
      }
    } catch (err: any) {
      setPatchError(err.message);
      throw err;
    } finally {
      setPatching(false);
    }
  }

  async function handleVerifyNext() {
    try {
      await patchPlayerDetails();
    } catch {
      return;
    }
    setStep("reviewing");
  }

  async function submitNomination(pmMethod: string | null, pmStatus: string) {
    setSubmitting(true);
    setSubmitError("");
    try {
      // Build player snapshot — stored on the nomination record
      const playerSnapshot = {
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth ?? "",
        gender: player.gender ?? "",
        email,
        phone,
        emergencyContacts,
        medical,
        snapshotDate: new Date().toISOString(),
      };

      // 1. POST nomination
      const nomBody: Record<string, any> = {
        season: opportunity.season,
        ageGroup: opportunity.ageGroup,
        clubId: player.clubId ?? "",
        playerId: player.playerId,
        playerSnapshot,
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

      // 2. Append tournament + fee history to player (fire and forget)
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

  // ── Step indicators ──────────────────────────────────────────────────────────
  const steps = [
    { id: "verifying", label: "Verify" },
    { id: "reviewing", label: "Review" },
    ...(fee > 0 ? [{ id: "payment", label: "Payment" }] : []),
    { id: "done", label: "Done" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-[#06054e] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-yellow-400" />
            <h2 className="text-lg font-black uppercase text-white">
              {step === "verifying" && "Verify Player Details"}
              {step === "reviewing" && "Nomination Review"}
              {step === "payment" && "Nomination Fee"}
              {step === "done" && "Nomination Submitted"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Cancel nomination"
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
            <div className="space-y-5">
              {/* Player name (always read-only) */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 bg-[#06054e]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-[#06054e]" />
                </div>
                <div>
                  <p className="font-black text-[#06054e] text-sm">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{player.playerId}</p>
                </div>
              </div>

              {patchError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  <AlertCircle size={15} />
                  {patchError}
                </div>
              )}

              {/* Personal details — read-only */}
              <div>
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Personal Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField
                    label="Date of Birth"
                    value={player.dateOfBirth ? formatDate(player.dateOfBirth) : ""}
                  />
                  <ReadOnlyField
                    label="Gender"
                    value={
                      player.gender
                        ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1).toLowerCase()
                        : ""
                    }
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                  <Lock size={9} />
                  Incorrect? Contact your club administrator to update these details.
                </p>
              </div>

              {/* Contact details — editable */}
              <div>
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Contact Details
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                      <Mail size={10} />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                      <Phone size={10} />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="04xx xxx xxx"
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div>
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Emergency Contacts
                </p>

                {emergencyContacts.length === 0 && !addingContact && (
                  <p className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    No emergency contacts on file. Please add at least one.
                  </p>
                )}

                {emergencyContacts.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 p-3 bg-slate-50 rounded-xl mb-2">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-sm truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 font-bold">{c.relationship}</p>
                      <div className="flex gap-3 mt-1">
                        {c.phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone size={10} />{c.phone}
                          </span>
                        )}
                        {c.email && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                            <Mail size={10} />{c.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeEmergencyContact(c.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Add contact inline form */}
                {addingContact ? (
                  <div className="border-2 border-[#06054e]/20 rounded-xl p-4 space-y-2.5 bg-[#06054e]/5">
                    <p className="text-xs font-black uppercase text-[#06054e] mb-1">New Emergency Contact</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Full name *"
                        value={newContact.name}
                        onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                        className="col-span-2 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Relationship"
                        value={newContact.relationship}
                        onChange={(e) => setNewContact((p) => ({ ...p, relationship: e.target.value }))}
                        className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="Phone *"
                        value={newContact.phone}
                        onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                        className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newContact.email}
                        onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                        className="col-span-2 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addEmergencyContact}
                        disabled={!newContact.name.trim() || !newContact.phone.trim()}
                        className="flex-1 py-2 bg-[#06054e] text-white rounded-xl text-xs font-black uppercase disabled:opacity-40 hover:bg-[#0a0870] transition-colors"
                      >
                        Save Contact
                      </button>
                      <button
                        onClick={() => { setAddingContact(false); setNewContact({ ...EMPTY_CONTACT }); }}
                        className="px-4 py-2 border-2 border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingContact(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 text-slate-500 hover:text-[#06054e] hover:border-[#06054e]/40 rounded-xl text-xs font-black uppercase transition-colors"
                  >
                    <Plus size={14} />
                    Add Emergency Contact
                  </button>
                )}
              </div>

              {/* Medical Information — collapsible */}
              <div>
                <button
                  onClick={() => setShowMedical((v) => !v)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 tracking-widest">
                    <Heart size={13} className="text-rose-400" />
                    Medical Information
                    {(medical.allergies || medical.conditions || medical.medications) && (
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-black">
                        On file
                      </span>
                    )}
                  </span>
                  {showMedical ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {showMedical && (
                  <div className="mt-2 p-4 border-2 border-slate-100 rounded-xl space-y-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-1">Allergies</label>
                      <textarea
                        rows={2}
                        value={medical.allergies}
                        onChange={(e) => setMedical((m) => ({ ...m, allergies: e.target.value }))}
                        placeholder="List any allergies…"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-1">Medical Conditions</label>
                      <textarea
                        rows={2}
                        value={medical.conditions}
                        onChange={(e) => setMedical((m) => ({ ...m, conditions: e.target.value }))}
                        placeholder="List any conditions…"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-1">Current Medications</label>
                      <textarea
                        rows={2}
                        value={medical.medications}
                        onChange={(e) => setMedical((m) => ({ ...m, medications: e.target.value }))}
                        placeholder="List any medications…"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-400 mb-1">Blood Type</label>
                        <select
                          value={medical.bloodType}
                          onChange={(e) => setMedical((m) => ({ ...m, bloodType: e.target.value }))}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#06054e] focus:outline-none"
                        >
                          <option value="">Select…</option>
                          {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-400 mb-1">Doctor Phone</label>
                        <input
                          type="tel"
                          value={medical.doctorPhone}
                          onChange={(e) => setMedical((m) => ({ ...m, doctorPhone: e.target.value }))}
                          placeholder="GP phone"
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-1">Doctor / GP Name</label>
                      <input
                        type="text"
                        value={medical.doctorName}
                        onChange={(e) => setMedical((m) => ({ ...m, doctorName: e.target.value }))}
                        placeholder="Dr. Smith"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyNext}
                  disabled={patching}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-40"
                >
                  {patching ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {patching ? "Saving…" : "Details Look Correct"}
                </button>
              </div>
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

                <div className="flex items-center gap-2 text-xs">
                  <Calendar size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="text-amber-700 font-semibold">
                    Nominations close: <strong>{formatDate(opportunity.nominationPeriodEnd)}</strong>
                    {" "}· {opportunity.daysRemaining}d remaining
                  </span>
                </div>
              </div>

              {/* Eligibility checks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">Age for {opportunity.season}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#06054e]">{playerAge ?? "—"}</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                      <CheckCircle size={10} /> Eligible
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">Gender</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#06054e]">{player.gender || "—"}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                      genderOk ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      <CheckCircle size={10} />
                      {genderOk ? "Eligible" : "Check"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">Nomination Fee</span>
                  <span className="text-sm font-black text-[#06054e]">
                    {fee > 0 ? `$${fee.toFixed(2)} AUD` : "No fee"}
                  </span>
                </div>

                {/* Emergency contact summary */}
                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <span className="text-xs font-black uppercase text-slate-500">Emergency Contacts</span>
                  <span className={`text-sm font-black ${emergencyContacts.length > 0 ? "text-green-700" : "text-amber-600"}`}>
                    {emergencyContacts.length > 0
                      ? `${emergencyContacts.length} on file`
                      : "None added"}
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
                    if (fee > 0) setStep("payment");
                    else submitNomination(null, "paid");
                  }}
                  disabled={submitting}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-xs rounded-2xl transition-all disabled:opacity-40"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                  {submitting ? "Submitting…" : fee > 0 ? "Continue to Payment" : "Confirm Nomination"}
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 text-slate-400 hover:text-slate-600 font-black uppercase text-xs transition-colors"
              >
                Cancel nomination
              </button>
            </div>
          )}

          {/* ═══ STEP 3: PAYMENT ═════════════════════════════════════════════ */}
          {step === "payment" && (
            <div className="space-y-4">
              {/* Fee summary */}
              <div className="text-center py-6 bg-slate-50 rounded-2xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <DollarSign size={28} className="text-[#06054e]" />
                  <span className="text-4xl font-black text-[#06054e]">{fee.toFixed(2)}</span>
                </div>
                <p className="text-sm font-black uppercase text-slate-400">AUD</p>
                <p className="text-xs text-slate-500 mt-1">{opportunity.ageGroup} Nomination Fee</p>
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
                    onClick={() => { setShowStripeMsg(true); setShowPaypalMsg(false); }}
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
                    onClick={() => { setShowPaypalMsg(true); setShowStripeMsg(false); }}
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
                  {submitting && paymentMethod === "cash"
                    ? <Loader2 size={18} className="animate-spin" />
                    : <DollarSign size={18} />}
                  Record Cash Payment
                </button>

                {/* Pay Later */}
                <button
                  onClick={handlePayLater}
                  disabled={submitting}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-500 hover:bg-slate-600 text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-40"
                >
                  {submitting && paymentMethod === null
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Calendar size={18} />}
                  Nominate Now, Pay Later
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep("reviewing")}
                  className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
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
                  <p className="text-xs text-slate-400 font-mono mt-1">ID: {nominationId}</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black uppercase">
                  Status: Pending
                </span>
                {fee > 0 && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase ${
                    paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {paymentStatus === "paid" ? "Paid" : "Payment Pending"}
                  </span>
                )}
                {emergencyContacts.length > 0 && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-black uppercase">
                    {emergencyContacts.length} Emergency Contact{emergencyContacts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto">
                Your nomination details and player snapshot have been saved to this tournament record.
              </p>

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
