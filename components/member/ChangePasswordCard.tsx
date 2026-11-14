// components/member/ChangePasswordCard.tsx
// Voluntary password change for the signed-in person. The API signs them out afterwards, so we send them to log in again.

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-400 mb-1";

export default function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSave = !!current && next.length >= 8 && next === confirm && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not change password");
      toast.success("Password changed — please sign in again");
      window.location.href = "/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-teal-600" />
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Change password</h2>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Current password</label>
          <input className={inputCls} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>New password</label>
          <input className={inputCls} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          {tooShort && <p className="text-xs text-red-600 mt-1">At least 8 characters.</p>}
        </div>
        <div>
          <label className={labelCls}>Confirm new password</label>
          <input className={inputCls} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {mismatch && <p className="text-xs text-red-600 mt-1">Passwords don&apos;t match.</p>}
        </div>
        <button type="submit" disabled={!canSave}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-black rounded-xl py-3 text-sm">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Change password
        </button>
        <p className="sm:col-span-2 text-xs text-slate-400">You&apos;ll be signed out afterwards and asked to sign in with the new password.</p>
      </div>
    </form>
  );
}
