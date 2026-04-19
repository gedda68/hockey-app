"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";

type Props = {
  canEdit: boolean;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialPhone: string;
};

export default function ProfileAccountEditor({
  canEdit,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialPhone,
}: Props) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  if (!canEdit) {
    return (
      <p className="text-sm text-slate-500 font-medium rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        Your account role cannot edit these fields here. Contact an administrator if something needs
        updating.
      </p>
    );
  }

  const dirty =
    firstName.trim() !== initialFirstName.trim() ||
    lastName.trim() !== initialLastName.trim() ||
    email.trim().toLowerCase() !== initialEmail.trim().toLowerCase() ||
    phone.trim() !== initialPhone.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) {
      toast.message("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() === "" ? null : phone.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }
      toast.success("Profile updated");
      await refreshUser();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profile-first" className="text-xs font-black uppercase text-slate-400">
            First name
          </label>
          <input
            id="profile-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-yellow-400"
            autoComplete="given-name"
            maxLength={80}
          />
        </div>
        <div>
          <label htmlFor="profile-last" className="text-xs font-black uppercase text-slate-400">
            Last name
          </label>
          <input
            id="profile-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-yellow-400"
            autoComplete="family-name"
            maxLength={80}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="profile-email" className="text-xs font-black uppercase text-slate-400">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-yellow-400"
            autoComplete="email"
            maxLength={200}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="profile-phone" className="text-xs font-black uppercase text-slate-400">
            Phone <span className="font-medium text-slate-400 normal-case">(optional)</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-yellow-400"
            autoComplete="tel"
            maxLength={40}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-[#06054e] hover:bg-yellow-300 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
        <span className="text-xs text-slate-500 font-medium">
          Username and roles are managed by an administrator.
        </span>
      </div>
    </form>
  );
}
