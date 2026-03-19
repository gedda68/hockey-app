// components/admin/members/wizard/AccountStep.tsx
"use client";

import { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  User,
  Shield,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { UserRole, ROLE_DEFINITIONS } from "@/lib/types/roles";

export interface AccountStepData {
  createAccount: boolean;
  role: UserRole;
  password: string;
  confirmPassword: string;
  forcePasswordChange: boolean;
}

interface AccountStepProps {
  data: AccountStepData;
  onChange: (data: AccountStepData) => void;
  errors?: Record<string, string>;
  // Preview username based on name entered earlier
  previewFirstName?: string;
  previewLastName?: string;
}

// ── Password strength helper ──────────────────────────────────────────────────

type StrengthLevel = "empty" | "weak" | "ok" | "strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return "empty";
  if (password.length < 8) return "weak";
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (password.length >= 12 && hasUppercase && hasNumber && hasSpecial)
    return "strong";
  if (password.length >= 8 && (hasNumber || hasUppercase)) return "ok";
  return "weak";
}

const strengthConfig: Record<
  StrengthLevel,
  { label: string; color: string; bars: number }
> = {
  empty: { label: "", color: "bg-slate-200", bars: 0 },
  weak: { label: "Weak", color: "bg-red-500", bars: 1 },
  ok: { label: "Good", color: "bg-yellow-400", bars: 2 },
  strong: { label: "Strong", color: "bg-green-500", bars: 3 },
};

// ── Role groups for the selector ──────────────────────────────────────────────

const PLAYER_PORTAL_ROLES: UserRole[] = ["player", "member", "parent"];
const ADMIN_STAFF_ROLES: UserRole[] = [
  "club-admin",
  "coach",
  "manager",
  "umpire",
  "volunteer",
  "team-selector",
  "assoc-coach",
  "assoc-selector",
  "association-admin",
];

// ── Username preview helper ───────────────────────────────────────────────────

function buildUsernamePreview(firstName: string, lastName: string): string {
  const initial = firstName.replace(/[^a-zA-Z]/g, "").charAt(0).toLowerCase();
  const cleanLast = lastName.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!initial || !cleanLast) return "—";
  return `${initial}${cleanLast}001`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccountStep({
  data,
  onChange,
  errors = {},
  previewFirstName = "",
  previewLastName = "",
}: AccountStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (partial: Partial<AccountStepData>) =>
    onChange({ ...data, ...partial });

  const strength = getPasswordStrength(data.password);
  const strengthInfo = strengthConfig[strength];
  const usernamePreview = buildUsernamePreview(previewFirstName, previewLastName);
  const passwordsMatch =
    data.password && data.confirmPassword
      ? data.password === data.confirmPassword
      : null;

  return (
    <div className="space-y-6">
      {/* Toggle: Create login account */}
      <div className="flex items-start justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06054e] flex items-center justify-center flex-shrink-0 mt-0.5">
            <KeyRound size={20} className="text-yellow-400" />
          </div>
          <div>
            <div className="font-black text-[#06054e] uppercase text-sm">
              Create Login Account
            </div>
            <div className="text-slate-500 text-sm mt-0.5">
              Allow this member to log in to the player portal
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => update({ createAccount: !data.createAccount })}
          className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            data.createAccount ? "bg-[#06054e]" : "bg-slate-300"
          }`}
          role="switch"
          aria-checked={data.createAccount}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              data.createAccount ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* No account — info card */}
      {!data.createAccount && (
        <div className="flex items-start gap-3 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
          <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-blue-800 text-sm">
            <span className="font-black">No account will be created.</span> A
            login account can be added later from the member record by an
            administrator.
          </div>
        </div>
      )}

      {/* Account creation form */}
      {data.createAccount && (
        <div className="space-y-6">
          {/* Username preview */}
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
            <User size={18} className="text-yellow-600 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-black text-[#06054e] uppercase text-xs block">
                Auto-generated Username
              </span>
              <span className="text-slate-700">
                Username will be generated as{" "}
                <span className="font-black text-[#06054e]">
                  {usernamePreview}
                </span>{" "}
                (first initial + last name + counter)
              </span>
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm font-black text-[#06054e] uppercase mb-3">
              Account Role <span className="text-red-500">*</span>
            </label>

            {/* Player Portal group */}
            <div className="mb-4">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="text-lg">🏑</span> Player Portal
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PLAYER_PORTAL_ROLES.map((roleKey) => {
                  const def = ROLE_DEFINITIONS[roleKey];
                  const isSelected = data.role === roleKey;
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => update({ role: roleKey })}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-[#06054e] bg-[#06054e]/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{def.icon}</span>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-black uppercase ${isSelected ? "text-[#06054e]" : "text-slate-700"}`}
                        >
                          {def.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {def.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle
                          size={16}
                          className="text-yellow-500 flex-shrink-0 ml-auto"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin & Staff group */}
            <div>
              <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield size={14} /> Admin &amp; Staff
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ADMIN_STAFF_ROLES.map((roleKey) => {
                  const def = ROLE_DEFINITIONS[roleKey];
                  if (!def) return null;
                  const isSelected = data.role === roleKey;
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => update({ role: roleKey })}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-[#06054e] bg-[#06054e]/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{def.icon}</span>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-black uppercase ${isSelected ? "text-[#06054e]" : "text-slate-700"}`}
                        >
                          {def.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {def.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle
                          size={16}
                          className="text-yellow-500 flex-shrink-0 ml-auto"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {errors.role && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.role}
              </p>
            )}
          </div>

          {/* Password fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New password */}
            <div>
              <label className="block text-sm font-black text-[#06054e] uppercase mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={data.password}
                  onChange={(e) => update({ password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors ${
                    errors.password
                      ? "border-red-400 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength indicator */}
              {data.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          bar <= strengthInfo.bars
                            ? strengthInfo.color
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  {strengthInfo.label && (
                    <p
                      className={`text-xs font-black ${
                        strength === "weak"
                          ? "text-red-600"
                          : strength === "ok"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {strengthInfo.label}
                      {strength === "weak" && " — needs 8+ characters"}
                      {strength === "ok" &&
                        " — add uppercase + special for strong"}
                    </p>
                  )}
                </div>
              )}

              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-black text-[#06054e] uppercase mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={data.confirmPassword}
                  onChange={(e) => update({ confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#06054e] transition-colors ${
                    errors.confirmPassword
                      ? "border-red-400 bg-red-50"
                      : passwordsMatch === false
                        ? "border-red-300 bg-red-50"
                        : passwordsMatch === true
                          ? "border-green-400"
                          : "border-slate-200 bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {passwordsMatch === true && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1 font-black">
                  <CheckCircle size={13} /> Passwords match
                </p>
              )}
              {passwordsMatch === false && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={13} /> Passwords do not match
                </p>
              )}
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Force password change checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={data.forcePasswordChange}
                onChange={(e) =>
                  update({ forcePasswordChange: e.target.checked })
                }
                className="w-5 h-5 rounded border-2 border-slate-300 text-[#06054e] focus:ring-[#06054e] cursor-pointer"
              />
            </div>
            <div>
              <span className="font-black text-[#06054e] uppercase text-sm group-hover:text-yellow-600 transition-colors">
                Force password change on first login
              </span>
              <p className="text-slate-500 text-xs mt-0.5">
                The member will be required to set their own password the first
                time they log in. Recommended when using a temporary password.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
