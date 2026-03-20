"use client";
// app/(admin)/admin/members/[id]/page.tsx
// Member profile view page — shown after create and accessible from the members list.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, User, Mail, Phone, MapPin, CreditCard,
  Heart, Shield, AlertCircle, Loader2, Calendar, Hash,
  Building2, Users, ChevronRight, Activity,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function age(dob?: string) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function genderLabel(g?: string) {
  if (!g) return "—";
  return g.replace("gender-", "").replace(/^\w/, (c) => c.toUpperCase());
}

// ── section card ──────────────────────────────────────────────────────────────

function Section({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 flex items-center gap-3 border-b border-slate-100 ${color}`}>
        <div className="text-white">{icon}</div>
        <h2 className="font-black text-white uppercase text-sm tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">{label}</p>
      <p className="text-slate-800 font-semibold">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  );
}

// ── status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    s === "active"   ? "bg-green-100 text-green-700 border-green-200" :
    s === "inactive" ? "bg-slate-100 text-slate-600 border-slate-200" :
    s === "suspended"? "bg-red-100 text-red-700 border-red-200"       :
                       "bg-blue-100 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {status || "Unknown"}
    </span>
  );
}

// ── role pill ─────────────────────────────────────────────────────────────────

function RolePill({ role }: { role: string }) {
  const label = role.replace("role-", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
      {label}
    </span>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function MemberViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const [member, setMember]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/members/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Member not found");
        setMember(json.member);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // ── error ───────────────────────────────────────────────────────────────────
  if (error || !member) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={36} />
          <h2 className="font-black text-red-700 text-xl mb-2">Member not found</h2>
          <p className="text-red-600 mb-6">{error || "The member record could not be loaded."}</p>
          <Link href="/admin/members" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
            <ArrowLeft size={16} /> Back to Members
          </Link>
        </div>
      </div>
    );
  }

  // ── shorthand aliases ────────────────────────────────────────────────────────
  const pi   = member.personalInfo   || {};
  const ct   = member.contact        || {};
  const addr = member.address        || {};
  const mem  = member.membership     || {};
  const plr  = member.playerInfo     || {};
  const med  = member.medical        || {};
  const hc   = member.healthcare     || {};
  const ec   = member.emergencyContacts?.[0] || ct.emergencyContact || {};
  const roles: string[] = member.roles || [];
  const dobAge = age(pi.dateOfBirth);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/admin/members" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors">
          <ArrowLeft size={18} /> Back to Members
        </Link>
        <Link
          href={`/admin/members/${id}/edit`}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow"
        >
          <Pencil size={16} /> Edit Member
        </Link>
      </div>

      {/* ── Profile hero ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#06054e] to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {pi.photoUrl
              ? <img src={pi.photoUrl} alt={pi.displayName} className="w-full h-full object-cover" />
              : <User size={36} className="text-white/60" />
            }
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black truncate">{pi.displayName || `${pi.firstName} ${pi.lastName}`}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-white/70 text-sm font-bold">{member.memberId}</span>
              {dobAge && <span className="text-white/60 text-sm">· {dobAge} yrs</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={mem.status} />
              {mem.membershipType && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase">
                  {mem.membershipType}
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 text-center">
            {plr.primaryPosition && (
              <div>
                <p className="text-xs text-white/60 font-bold uppercase">Position</p>
                <p className="font-black text-lg">{plr.primaryPosition}</p>
              </div>
            )}
            {mem.joinDate && (
              <div>
                <p className="text-xs text-white/60 font-bold uppercase">Member Since</p>
                <p className="font-black text-lg">{new Date(mem.joinDate).getFullYear()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Personal Information */}
        <Section icon={<User size={18} />} title="Personal Information" color="bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name"    value={pi.firstName} />
            <Field label="Last Name"     value={pi.lastName} />
            <Field label="Date of Birth" value={pi.dateOfBirth ? `${formatDate(pi.dateOfBirth)}${dobAge ? ` (${dobAge})` : ""}` : undefined} />
            <Field label="Gender"        value={genderLabel(pi.gender)} />
          </div>
        </Section>

        {/* Contact */}
        <Section icon={<Mail size={18} />} title="Contact Details" color="bg-gradient-to-r from-violet-600 to-violet-700">
          <div className="space-y-3">
            <Field label="Primary Email" value={ct.primaryEmail ? <a href={`mailto:${ct.primaryEmail}`} className="text-violet-600 hover:underline">{ct.primaryEmail}</a> : undefined} />
            <Field label="Phone"  value={ct.phone  || ct.mobile} />
            <Field label="Mobile" value={ct.mobile || ct.phone} />
          </div>
        </Section>

        {/* Address */}
        <Section icon={<MapPin size={18} />} title="Address" color="bg-gradient-to-r from-teal-600 to-teal-700">
          <div className="space-y-1">
            {addr.street   && <p className="text-slate-800 font-semibold">{addr.street}</p>}
            {addr.suburb   && <p className="text-slate-700">{addr.suburb} {addr.state} {addr.postcode}</p>}
            {addr.country  && <p className="text-slate-500 text-sm">{addr.country}</p>}
            {!addr.street  && <p className="text-slate-300">—</p>}
          </div>
        </Section>

        {/* Membership */}
        <Section icon={<CreditCard size={18} />} title="Membership" color="bg-gradient-to-r from-amber-500 to-amber-600">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status"          value={<StatusBadge status={mem.status} />} />
            <Field label="Type"            value={mem.membershipType} />
            <Field label="Join Date"       value={formatDate(mem.joinDate)} />
            <Field label="Expiry Date"     value={formatDate(mem.expiryDate)} />
            <Field label="Renewal Date"    value={formatDate(mem.renewalDate)} />
          </div>
        </Section>

        {/* Roles */}
        {roles.length > 0 && (
          <Section icon={<Shield size={18} />} title="Roles" color="bg-gradient-to-r from-indigo-600 to-indigo-700">
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => <RolePill key={r} role={r} />)}
            </div>
          </Section>
        )}

        {/* Player Info */}
        {(plr.primaryPosition || plr.secondaryPosition || plr.jerseyNumber) && (
          <Section icon={<Activity size={18} />} title="Player Details" color="bg-gradient-to-r from-orange-500 to-orange-600">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary Position"   value={plr.primaryPosition} />
              <Field label="Secondary Position" value={plr.secondaryPosition} />
              <Field label="Jersey Number"      value={plr.jerseyNumber} />
              <Field label="Preferred Foot"     value={plr.preferredFoot} />
            </div>
          </Section>
        )}

        {/* Emergency Contact */}
        <Section icon={<Phone size={18} />} title="Emergency Contact" color="bg-gradient-to-r from-rose-600 to-rose-700">
          {ec.name ? (
            <div className="space-y-3">
              <Field label="Name"         value={ec.name} />
              <Field label="Relationship" value={ec.relationship} />
              <Field label="Phone"        value={ec.phone || ec.mobile} />
              {ec.email && <Field label="Email" value={<a href={`mailto:${ec.email}`} className="text-rose-600 hover:underline">{ec.email}</a>} />}
            </div>
          ) : (
            <p className="text-slate-400 text-sm italic">No emergency contact recorded.</p>
          )}
        </Section>

        {/* Medical */}
        <Section icon={<Heart size={18} />} title="Medical" color="bg-gradient-to-r from-red-600 to-red-700">
          <div className="space-y-3">
            <Field label="Conditions"  value={med.conditions} />
            <Field label="Allergies"   value={med.allergies} />
            <Field label="Medications" value={med.medications} />
            {(med.doctorName || med.doctorPhone) && (
              <div className="pt-2 border-t border-slate-100">
                <Field label="Doctor" value={[med.doctorName, med.doctorPhone].filter(Boolean).join(" · ")} />
              </div>
            )}
          </div>
        </Section>

        {/* Healthcare */}
        {(hc.medicare?.number || hc.privateHealth?.provider) && (
          <Section icon={<Shield size={18} />} title="Healthcare" color="bg-gradient-to-r from-cyan-600 to-cyan-700">
            <div className="space-y-4">
              {hc.medicare?.number && (
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 mb-2">Medicare</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Number"   value={hc.medicare.number} />
                    <Field label="Position" value={hc.medicare.position} />
                    <Field label="Expiry"   value={hc.medicare.expiryMonth && hc.medicare.expiryYear ? `${hc.medicare.expiryMonth}/${hc.medicare.expiryYear}` : undefined} />
                  </div>
                </div>
              )}
              {hc.privateHealth?.provider && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-black uppercase text-slate-400 mb-2">Private Health</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Provider"       value={hc.privateHealth.provider?.replace("provider-", "")} />
                    <Field label="Member Number"  value={hc.privateHealth.membershipNumber} />
                    <Field label="Expiry"         value={formatDate(hc.privateHealth.expiryDate)} />
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Notes */}
        {member.notes && (
          <Section icon={<Hash size={18} />} title="Notes" color="bg-gradient-to-r from-slate-600 to-slate-700">
            <p className="text-slate-700 whitespace-pre-wrap text-sm">{member.notes}</p>
          </Section>
        )}
      </div>

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/members" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Members
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/members/${id}/edit`}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
          >
            <Pencil size={16} /> Edit Member
          </Link>
        </div>
      </div>
    </div>
  );
}
