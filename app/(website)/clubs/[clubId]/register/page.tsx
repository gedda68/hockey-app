"use client";

/**
 * /clubs/[clubId]/register?token=<hex>
 *
 * Self-registration wizard for new club members invited via a tokenised link.
 *
 * Step 1 — Personal info   (name, DOB, gender)
 * Step 2 — Contact         (email, phone, address, emergency contact)
 * Step 3 — Playing category (role selector + fee preview)
 * Step 4 — Review & confirm → success screen
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import type { TokenValidationResponse, ResolvedRoleOption } from "@/types/inviteTokens";
import type { UserRole } from "@/lib/types/roles";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalInfo {
  salutation: string;
  firstName:  string;
  lastName:   string;
  dateOfBirth: string;
  gender:     string;
}

interface ContactInfo {
  email:    string;
  phone:    string;
  mobile:   string;
  street:   string;
  suburb:   string;
  state:    string;
  postcode: string;
  country:  string;
  ecName:         string;
  ecRelationship: string;
  ecPhone:        string;
  ecEmail:        string;
}

interface RegistrationResult {
  memberId:       string;
  requestId:      string | null;
  status:         string;
  requiresFee:    boolean;
  feeAmountCents?: number;
  feeDescription?: string;
  clubName:       string;
  seasonYear:     string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"];
const SALUTATIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Mx"];
const STEPS = ["Personal", "Contact", "Membership", "Review"];

// ── Helper components ─────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
        disabled:bg-slate-50 disabled:text-slate-500 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
        disabled:bg-slate-50 ${props.className ?? ""}`}
    />
  );
}

function StepDot({ n, current, label }: { n: number; current: number; label: string }) {
  const done    = n < current;
  const active  = n === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
          ${done   ? "bg-teal-600 text-white"
          : active ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500"
          :          "bg-slate-100 text-slate-400"}`}
      >
        {done ? <CheckCircle className="w-4 h-4" /> : n + 1}
      </div>
      <span className={`text-xs font-medium ${active ? "text-teal-700" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClubRegisterPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // ── Token validation ───────────────────────────────────────────────────────
  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState<TokenValidationResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const validateToken = useCallback(async () => {
    if (!token) {
      setTokenError("No invite token was provided. Please use the link from your invitation email.");
      setValidating(false);
      return;
    }
    try {
      const res = await fetch(`/api/clubs/${clubId}/invites/${token}`);
      const data = await res.json();
      if (data.valid) {
        setTokenData(data as TokenValidationResponse);
      } else {
        setTokenError(data.reason ?? "Invalid or expired invite link.");
      }
    } catch {
      setTokenError("Could not verify your invite link. Please check your connection and try again.");
    } finally {
      setValidating(false);
    }
  }, [clubId, token]);

  useEffect(() => { validateToken(); }, [validateToken]);

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const [personal, setPersonal] = useState<PersonalInfo>({
    salutation: "", firstName: "", lastName: "", dateOfBirth: "", gender: "",
  });
  const [contact, setContact] = useState<ContactInfo>({
    email: "", phone: "", mobile: "",
    street: "", suburb: "", state: "", postcode: "", country: "Australia",
    ecName: "", ecRelationship: "", ecPhone: "", ecEmail: "",
  });
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");

  // Validation errors per step
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validation ─────────────────────────────────────────────────────────────
  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!personal.firstName.trim()) e.firstName = "First name is required";
      if (!personal.lastName.trim())  e.lastName  = "Last name is required";
      if (!personal.dateOfBirth)      e.dateOfBirth = "Date of birth is required";
      if (!personal.gender)           e.gender = "Please select a gender";
    }
    if (s === 1) {
      if (!contact.email.trim())           e.email = "Email address is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
                                           e.email = "Please enter a valid email address";
      if (!contact.ecName.trim())          e.ecName  = "Emergency contact name is required";
      if (!contact.ecPhone.trim())         e.ecPhone = "Emergency contact phone is required";
      if (!contact.ecRelationship.trim())  e.ecRelationship = "Relationship is required";
    }
    if (s === 2) {
      if (!selectedRole) e.selectedRole = "Please choose a membership category";
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!tokenData || !selectedRole) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        token,
        personalInfo: {
          salutation:   personal.salutation || undefined,
          firstName:    personal.firstName.trim(),
          lastName:     personal.lastName.trim(),
          dateOfBirth:  personal.dateOfBirth,
          gender:       personal.gender,
        },
        contact: {
          email:  contact.email.trim().toLowerCase(),
          phone:  contact.phone.trim() || undefined,
          mobile: contact.mobile.trim() || undefined,
          emergencyContact: {
            name:         contact.ecName.trim(),
            relationship: contact.ecRelationship.trim(),
            phone:        contact.ecPhone.trim(),
            email:        contact.ecEmail.trim() || undefined,
          },
        },
        address: {
          street:   contact.street.trim()   || undefined,
          suburb:   contact.suburb.trim()   || undefined,
          state:    contact.state.trim()    || undefined,
          postcode: contact.postcode.trim() || undefined,
          country:  contact.country.trim()  || "Australia",
        },
        selectedRole,
      };

      const res = await fetch(`/api/clubs/${clubId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      setResult(data as RegistrationResult);
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-teal-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-1">Registration complete!</h1>
          <p className="text-slate-500 text-sm mb-6">
            Welcome to <strong>{result.clubName}</strong> — {result.seasonYear} season.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member ID</span>
              <span className="font-mono font-bold text-slate-800">{result.memberId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className={`font-semibold ${
                result.status === "pending_payment" ? "text-amber-600"
                : result.status === "awaiting_approval" ? "text-blue-600"
                : "text-teal-600"
              }`}>
                {result.status === "pending_payment"   ? "Payment required"
                : result.status === "awaiting_approval" ? "Awaiting approval"
                : "Submitted"}
              </span>
            </div>
            {result.requiresFee && result.feeAmountCents !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Fee</span>
                <span className="font-semibold text-slate-800">
                  ${(result.feeAmountCents / 100).toFixed(2)} AUD
                </span>
              </div>
            )}
          </div>

          {result.status === "pending_payment" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left text-sm text-amber-800">
              <strong>Payment required:</strong> your club will contact you with payment details.
              {result.feeDescription && (
                <p className="mt-1 text-xs text-amber-700">{result.feeDescription}</p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">
            A confirmation email has been sent to your inbox. Keep your Member ID safe.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invite link invalid</h2>
          <p className="text-slate-500 text-sm">{tokenError}</p>
          <p className="mt-4 text-xs text-slate-400">
            If you believe this is an error, please contact your club registrar for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { clubName, seasonYear, roleOptions } = tokenData;
  const selectedOption: ResolvedRoleOption | undefined =
    roleOptions.find((r) => r.role === selectedRole);

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="bg-teal-700 text-white rounded-2xl px-6 py-5 mb-6 text-center">
          <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest mb-1">
            {seasonYear} Season Registration
          </p>
          <h1 className="text-2xl font-black">{clubName}</h1>
          <p className="text-teal-300 text-sm mt-1">Complete your membership in 4 easy steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-between items-start mb-6 px-2">
          {STEPS.map((label, i) => (
            <StepDot key={label} n={i} current={step} label={label} />
          ))}
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">

          {/* ── Step 0: Personal info ─────────────────────────────────────── */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-teal-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Personal information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Salutation</Label>
                  <Select
                    value={personal.salutation}
                    onChange={(e) => setPersonal((p) => ({ ...p, salutation: e.target.value }))}
                  >
                    <option value="">— optional —</option>
                    {SALUTATIONS.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label required>First name</Label>
                    <Input
                      value={personal.firstName}
                      onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="Jane"
                    />
                    <FieldError msg={errors.firstName} />
                  </div>
                  <div>
                    <Label required>Last name</Label>
                    <Input
                      value={personal.lastName}
                      onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Smith"
                    />
                    <FieldError msg={errors.lastName} />
                  </div>
                </div>

                <div>
                  <Label required>Date of birth</Label>
                  <Input
                    type="date"
                    value={personal.dateOfBirth}
                    onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  />
                  <FieldError msg={errors.dateOfBirth} />
                </div>

                <div>
                  <Label required>Gender</Label>
                  <Select
                    value={personal.gender}
                    onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {GENDERS.map((g) => <option key={g}>{g}</option>)}
                  </Select>
                  <FieldError msg={errors.gender} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Contact & address ─────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-teal-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Contact details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label required>Email address</Label>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    placeholder="jane.smith@email.com"
                  />
                  <FieldError msg={errors.email} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="08 1234 5678"
                    />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      type="tel"
                      value={contact.mobile}
                      onChange={(e) => setContact((c) => ({ ...c, mobile: e.target.value }))}
                      placeholder="04xx xxx xxx"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600">Address (optional)</span>
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={contact.street}
                      onChange={(e) => setContact((c) => ({ ...c, street: e.target.value }))}
                      placeholder="Street address"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={contact.suburb}
                        onChange={(e) => setContact((c) => ({ ...c, suburb: e.target.value }))}
                        placeholder="Suburb / City"
                      />
                      <Input
                        value={contact.state}
                        onChange={(e) => setContact((c) => ({ ...c, state: e.target.value }))}
                        placeholder="State"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={contact.postcode}
                        onChange={(e) => setContact((c) => ({ ...c, postcode: e.target.value }))}
                        placeholder="Postcode"
                      />
                      <Input
                        value={contact.country}
                        onChange={(e) => setContact((c) => ({ ...c, country: e.target.value }))}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency contact */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600">Emergency contact</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label required>Full name</Label>
                      <Input
                        value={contact.ecName}
                        onChange={(e) => setContact((c) => ({ ...c, ecName: e.target.value }))}
                        placeholder="John Smith"
                      />
                      <FieldError msg={errors.ecName} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label required>Relationship</Label>
                        <Input
                          value={contact.ecRelationship}
                          onChange={(e) => setContact((c) => ({ ...c, ecRelationship: e.target.value }))}
                          placeholder="Parent, Spouse…"
                        />
                        <FieldError msg={errors.ecRelationship} />
                      </div>
                      <div>
                        <Label required>Phone</Label>
                        <Input
                          type="tel"
                          value={contact.ecPhone}
                          onChange={(e) => setContact((c) => ({ ...c, ecPhone: e.target.value }))}
                          placeholder="04xx xxx xxx"
                        />
                        <FieldError msg={errors.ecPhone} />
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contact.ecEmail}
                        onChange={(e) => setContact((c) => ({ ...c, ecEmail: e.target.value }))}
                        placeholder="optional"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Membership / role selector ───────────────────────── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-teal-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Membership category</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Choose the category that best describes your involvement with {clubName}.
              </p>

              <div className="space-y-3">
                {roleOptions.map((opt) => {
                  const isSelected = selectedRole === opt.role;
                  return (
                    <button
                      key={opt.role}
                      type="button"
                      onClick={() => setSelectedRole(opt.role as UserRole)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all
                        ${isSelected
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${isSelected ? "text-teal-800" : "text-slate-700"}`}>
                            {opt.label}
                          </p>
                          {opt.requiresFee && opt.feeAmountCents !== undefined ? (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Registration fee: <strong>${(opt.feeAmountCents / 100).toFixed(2)} AUD</strong>
                              {opt.gstIncluded === true ? " (incl. GST)" : ""}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">No registration fee</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                          ${isSelected ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                          {isSelected && (
                            <svg viewBox="0 0 20 20" fill="white" className="w-full h-full p-0.5">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414 4.293 9.707a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <FieldError msg={errors.selectedRole} />
            </div>
          )}

          {/* ── Step 3: Review & confirm ──────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-teal-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Review & confirm</h2>
              </div>

              <div className="space-y-4 text-sm">
                {/* Personal */}
                <ReviewSection title="Personal information">
                  <ReviewRow label="Name"
                    value={[personal.salutation, personal.firstName, personal.lastName].filter(Boolean).join(" ")} />
                  <ReviewRow label="Date of birth" value={personal.dateOfBirth} />
                  <ReviewRow label="Gender"         value={personal.gender} />
                </ReviewSection>

                {/* Contact */}
                <ReviewSection title="Contact details">
                  <ReviewRow label="Email"  value={contact.email} />
                  {contact.phone  && <ReviewRow label="Phone"  value={contact.phone} />}
                  {contact.mobile && <ReviewRow label="Mobile" value={contact.mobile} />}
                  {contact.street && (
                    <ReviewRow label="Address"
                      value={[contact.street, contact.suburb, contact.state, contact.postcode].filter(Boolean).join(", ")} />
                  )}
                  <ReviewRow label="Emergency contact"
                    value={`${contact.ecName} (${contact.ecRelationship}) — ${contact.ecPhone}`} />
                </ReviewSection>

                {/* Membership */}
                <ReviewSection title="Membership category">
                  <ReviewRow label="Category" value={selectedOption?.label ?? String(selectedRole)} />
                  {selectedOption?.requiresFee && selectedOption.feeAmountCents !== undefined ? (
                    <ReviewRow label="Fee"
                      value={`$${(selectedOption.feeAmountCents / 100).toFixed(2)} AUD`} />
                  ) : (
                    <ReviewRow label="Fee" value="No fee required" />
                  )}
                </ReviewSection>
              </div>

              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}
            </div>
          )}

        </div>{/* end step card */}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                border border-slate-300 text-slate-700 font-semibold text-sm
                hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-teal-600 text-white font-semibold text-sm
                hover:bg-teal-700 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-teal-600 text-white font-bold text-sm
                hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Complete registration</>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Small review helpers ──────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}
