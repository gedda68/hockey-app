// components/member/MoreDetailsForm.tsx
// Self-service sections for My Details: personal preferences, emergency contacts, healthcare,
// medical details and blue card. Saves through /api/member/my-profile/details.

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Lock } from "lucide-react";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import { resolveSelection, type PickOption } from "@/lib/members/profileOptions";
import { CARD_TYPES, CARD_CATEGORIES, CARD_STATUSES, ISSUING_STATES, blueCardStatus } from "@/lib/members/blueCard";

type Doc = Record<string, any>;
type Contact = { contactId?: string; name: string; relationship: string; phone: string; mobile: string; email: string };

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 disabled:bg-amber-50 disabled:text-amber-800";
const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-400 mb-1";

function Card({ title, locked, children }: { title: string; locked?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">{title}</h2>
        {locked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        )}
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type = "text", span2 = false, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; span2?: boolean; placeholder?: string;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; disabled?: boolean }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={inputCls} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TypeaheadField({ label, value, onChange, options, disabled, placeholder, span2 = false }: {
  label: string; value: string; onChange: (v: string) => void; options: PickOption[]; disabled?: boolean; placeholder?: string; span2?: boolean;
}) {
  const resolved = resolveSelection(options, value);
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      {disabled ? (
        <input className={inputCls} value={resolved.options.find((o) => o.value === resolved.value)?.label ?? value} disabled readOnly />
      ) : (
        <TypeaheadSelect options={resolved.options} value={resolved.value} onChange={onChange} placeholder={placeholder ?? "Type to search…"}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400" />
      )}
    </div>
  );
}

const blankContact = (): Contact => ({ name: "", relationship: "", phone: "", mobile: "", email: "" });

export default function MoreDetailsForm({ member, onSaved }: { member: Doc; onSaved: () => void }) {
  const locked: string[] = member.lockedFields ?? [];
  const isLocked = (k: string) => locked.some((l) => l === k || k.startsWith(`${l}.`));

  const [salutation, setSalutation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mcNumber, setMcNumber] = useState(""); const [mcPos, setMcPos] = useState("");
  const [mcMonth, setMcMonth] = useState(""); const [mcYear, setMcYear] = useState("");
  const [phProvider, setPhProvider] = useState(""); const [phNumber, setPhNumber] = useState(""); const [phExpiry, setPhExpiry] = useState("");
  const [conditions, setConditions] = useState(""); const [medications, setMedications] = useState(""); const [allergies, setAllergies] = useState("");
  const [bc, setBc] = useState<Doc>({});
  const [saving, setSaving] = useState(false);
  const [opts, setOpts] = useState<{ salutations: PickOption[]; genders: PickOption[]; relationships: PickOption[] }>({
    salutations: [], genders: [], relationships: [],
  });

  useEffect(() => {
    fetch("/api/member/profile-options", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOpts(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSalutation(member.personalInfo?.salutation ?? "");
    setDisplayName(member.personalInfo?.displayName ?? "");
    setGender(member.personalInfo?.gender ?? "");
    setEmail(member.contact?.primaryEmail ?? member.contact?.email ?? "");
    const list: Doc[] = Array.isArray(member.emergencyContacts) ? member.emergencyContacts : [];
    setContacts(list.map((c) => ({ contactId: c.contactId, name: c.name ?? "", relationship: c.relationship ?? "", phone: c.phone ?? "", mobile: c.mobile ?? "", email: c.email ?? "" })));
    const mc = member.healthcare?.medicare ?? {};
    setMcNumber(mc.number ?? ""); setMcPos(mc.position ?? ""); setMcMonth(mc.expiryMonth ?? ""); setMcYear(mc.expiryYear ?? "");
    const ph = member.healthcare?.privateHealth ?? {};
    setPhProvider(ph.provider ?? ""); setPhNumber(ph.membershipNumber ?? ""); setPhExpiry(ph.expiryDate ?? "");
    setConditions(member.medical?.conditions ?? ""); setMedications(member.medical?.medications ?? ""); setAllergies(member.medical?.allergies ?? "");
    setBc(member.blueCard ?? {});
  }, [member]);

  const setContact = (i: number, patch: Partial<Contact>) => setContacts((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const bcSet = (k: string, v: string) => setBc((b) => ({ ...b, [k]: v }));
  const status = blueCardStatus(bc);

  async function save() {
    setSaving(true);
    try {
      const body: Doc = {};
      if (!isLocked("personalInfo.salutation")) body.personalInfo = { salutation, displayName, gender };
      if (!isLocked("contact.primaryEmail")) body.contact = { primaryEmail: email };
      if (!isLocked("emergencyContacts")) body.emergencyContacts = contacts;
      if (!isLocked("healthcare")) {
        body.healthcare = {
          medicare: { number: mcNumber, position: mcPos, expiryMonth: mcMonth, expiryYear: mcYear },
          privateHealth: { provider: phProvider, membershipNumber: phNumber, expiryDate: phExpiry },
        };
      }
      body.medical = { conditions, medications, allergies };
      if (!isLocked("blueCard")) body.blueCard = bc;

      const res = await fetch("/api/member/my-profile/details", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(data.message ?? "Details updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="About you" locked={isLocked("personalInfo.salutation")}>
        <TypeaheadField label="Title" value={salutation} onChange={setSalutation} options={opts.salutations} disabled={isLocked("personalInfo.salutation")} />
        <Field label="Preferred name" value={displayName} onChange={setDisplayName} disabled={isLocked("personalInfo.displayName")} />
        <TypeaheadField label="Gender" value={gender} onChange={setGender} options={opts.genders} disabled={isLocked("personalInfo.gender")} />
        <Field label="Email address" type="email" value={email} onChange={setEmail} disabled={isLocked("contact.primaryEmail")} />
      </Card>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Emergency contacts &amp; relations</h2>
          <button type="button" disabled={isLocked("emergencyContacts") || contacts.length >= 5}
            onClick={() => setContacts((c) => [...c, blankContact()])}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline disabled:opacity-40">
            <Plus className="h-3.5 w-3.5" /> Add contact
          </button>
        </div>
        <div className="p-5 space-y-5">
          {contacts.length === 0 && <p className="text-sm text-slate-400">No contacts yet — add a parent, partner or friend we can call.</p>}
          {contacts.map((c, i) => (
            <div key={c.contactId ?? i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-100 rounded-xl p-4">
              <Field label={`Contact ${i + 1} name`} value={c.name} onChange={(v) => setContact(i, { name: v })} disabled={isLocked("emergencyContacts")} />
              <TypeaheadField label="Relationship" value={c.relationship} onChange={(v) => setContact(i, { relationship: v })} options={opts.relationships} disabled={isLocked("emergencyContacts")} />
              <Field label="Phone" value={c.phone} onChange={(v) => setContact(i, { phone: v })} disabled={isLocked("emergencyContacts")} />
              <Field label="Mobile" value={c.mobile} onChange={(v) => setContact(i, { mobile: v })} disabled={isLocked("emergencyContacts")} />
              <Field label="Email" type="email" span2 value={c.email} onChange={(v) => setContact(i, { email: v })} disabled={isLocked("emergencyContacts")} />
              <button type="button" disabled={isLocked("emergencyContacts")} onClick={() => setContacts((cs) => cs.filter((_, j) => j !== i))}
                className="sm:col-span-2 justify-self-start inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <Card title="Healthcare" locked={isLocked("healthcare")}>
        <Field label="Medicare number" value={mcNumber} onChange={setMcNumber} disabled={isLocked("healthcare")} />
        <Field label="Position on card" value={mcPos} onChange={setMcPos} disabled={isLocked("healthcare")} />
        <Field label="Expiry month" value={mcMonth} onChange={setMcMonth} disabled={isLocked("healthcare")} placeholder="MM" />
        <Field label="Expiry year" value={mcYear} onChange={setMcYear} disabled={isLocked("healthcare")} placeholder="YYYY" />
        <Field label="Private health provider" value={phProvider} onChange={setPhProvider} disabled={isLocked("healthcare")} />
        <Field label="Membership number" value={phNumber} onChange={setPhNumber} disabled={isLocked("healthcare")} />
        <Field label="Private health expiry" type="date" value={phExpiry} onChange={setPhExpiry} disabled={isLocked("healthcare")} />
      </Card>

      <Card title="Medical details">
        <Field label="Conditions" span2 value={conditions} onChange={setConditions} disabled={isLocked("medical.conditions")} />
        <Field label="Medications" span2 value={medications} onChange={setMedications} disabled={isLocked("medical.medications")} />
        <Field label="Allergies" span2 value={allergies} onChange={setAllergies} disabled={isLocked("medical.allergies")} />
      </Card>

      <Card title="Blue card (working with children)" locked={isLocked("blueCard")}>
        <div className="sm:col-span-2 text-sm font-semibold text-slate-600">
          Status: <span className="font-black text-slate-800">{status.label}</span>
          {bc.lastVerifiedDate ? <span className="text-green-700"> · verified {String(bc.lastVerifiedDate).slice(0, 10)}</span> : <span className="text-slate-400"> · not yet verified by your club</span>}
          <p className="text-xs text-slate-400 font-medium mt-1">Your club confirms your card. Changing the card details asks them to verify it again.</p>
        </div>
        <Select label="Card type" value={bc.cardType ?? ""} onChange={(v) => bcSet("cardType", v)} options={CARD_TYPES} disabled={isLocked("blueCard")} />
        <Select label="Category" value={bc.category ?? ""} onChange={(v) => bcSet("category", v)} options={CARD_CATEGORIES} disabled={isLocked("blueCard")} />
        <Select label="Card status" value={bc.status ?? ""} onChange={(v) => bcSet("status", v)} options={CARD_STATUSES} disabled={isLocked("blueCard")} />
        <Field label="Card number" value={bc.cardNumber ?? ""} onChange={(v) => bcSet("cardNumber", v)} disabled={isLocked("blueCard")} />
        <Field label="Name on card" value={bc.nameOnCard ?? ""} onChange={(v) => bcSet("nameOnCard", v)} disabled={isLocked("blueCard")} />
        <Select label="Issuing state" value={bc.issuingState ?? ""} onChange={(v) => bcSet("issuingState", v)} options={ISSUING_STATES} disabled={isLocked("blueCard")} />
        <Field label="Issue date" type="date" value={String(bc.issueDate ?? "").slice(0, 10)} onChange={(v) => bcSet("issueDate", v)} disabled={isLocked("blueCard")} />
        <Field label="Expiry date" type="date" value={String(bc.expiryDate ?? "").slice(0, 10)} onChange={(v) => bcSet("expiryDate", v)} disabled={isLocked("blueCard")} />
      </Card>

      <button type="button" onClick={() => void save()} disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-black rounded-xl py-3 text-sm">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving…" : "Save these details"}
      </button>
    </div>
  );
}
