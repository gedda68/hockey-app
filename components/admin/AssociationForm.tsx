"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  X,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Loader2,
  AlertCircle,
  Palette,
  Settings2,
  Share2,
} from "lucide-react";

interface AssociationFormProps {
  associationId?: string;
  initialData?: any;
  parentAssociations?: any[];
}

export default function AssociationForm({
  associationId,
  initialData,
  parentAssociations = [],
}: AssociationFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Unified State Object
  const [formData, setFormData] = useState({
    // Identity
    associationId: "",
    code: "",
    name: "",
    fullName: "",
    acronym: "",

    // Hierarchy
    parentAssociationId: "",

    // Location
    region: "",
    state: "QLD",
    country: "Australia",
    timezone: "Australia/Brisbane",

    // Address
    street: "",
    suburb: "",
    city: "",
    addressState: "QLD",
    postcode: "",
    addressCountry: "Australia",

    // Contact
    primaryEmail: "",
    secondaryEmail: "",
    phone: "",
    mobile: "",
    website: "",

    // Social Media
    facebook: "",
    instagram: "",
    twitter: "",

    // Settings
    requiresApproval: false,
    autoApproveReturningPlayers: true,
    allowMultipleClubs: true,
    seasonStartMonth: 1,
    seasonEndMonth: 12,
    requiresInsurance: true,
    requiresMedicalInfo: true,
    requiresEmergencyContact: true,

    // Branding
    primaryColor: "#06054e",
    secondaryColor: "#FFD700",
    accentColor: "#ffd700",

    // Status
    status: "active",
  });

  // Hydrate form on edit
  useEffect(() => {
    if (initialData) {
      setFormData({
        associationId: initialData.associationId || "",
        code: initialData.code || "",
        name: initialData.name || "",
        fullName: initialData.fullName || "",
        acronym: initialData.acronym || "",
        parentAssociationId: initialData.parentAssociationId || "",
        region: initialData.region || "",
        state: initialData.state || "QLD",
        country: initialData.country || "Australia",
        timezone: initialData.timezone || "Australia/Brisbane",
        street: initialData.address?.street || "",
        suburb: initialData.address?.suburb || "",
        city: initialData.address?.city || "",
        addressState: initialData.address?.state || "QLD",
        postcode: initialData.address?.postcode || "",
        addressCountry: initialData.address?.country || "Australia",
        primaryEmail: initialData.contact?.primaryEmail || "",
        secondaryEmail: initialData.contact?.secondaryEmail || "",
        phone: initialData.contact?.phone || "",
        mobile: initialData.contact?.mobile || "",
        website: initialData.contact?.website || "",
        facebook: initialData.socialMedia?.facebook || "",
        instagram: initialData.socialMedia?.instagram || "",
        twitter: initialData.socialMedia?.twitter || "",
        requiresApproval: initialData.settings?.requiresApproval ?? false,
        autoApproveReturningPlayers:
          initialData.settings?.autoApproveReturningPlayers ?? true,
        allowMultipleClubs: initialData.settings?.allowMultipleClubs ?? true,
        seasonStartMonth: initialData.settings?.seasonStartMonth || 1,
        seasonEndMonth: initialData.settings?.seasonEndMonth || 12,
        requiresInsurance: initialData.settings?.requiresInsurance ?? true,
        requiresMedicalInfo: initialData.settings?.requiresMedicalInfo ?? true,
        requiresEmergencyContact:
          initialData.settings?.requiresEmergencyContact ?? true,
        primaryColor: initialData.branding?.primaryColor || "#06054e",
        secondaryColor: initialData.branding?.secondaryColor || "#FFD700",
        accentColor: initialData.branding?.accentColor || "#ffd700",
        status: initialData.status || "active",
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = [
      "associationId",
      "code",
      "name",
      "fullName",
      "region",
      "primaryEmail",
      "phone",
      "street",
      "suburb",
      "postcode",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = "Required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError("Please fill in all required fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        associationId: formData.associationId,
        code: formData.code,
        name: formData.name,
        fullName: formData.fullName,
        acronym: formData.acronym || undefined,
        parentAssociationId: formData.parentAssociationId || undefined,
        region: formData.region,
        state: formData.state,
        country: formData.country,
        timezone: formData.timezone,
        address: {
          street: formData.street,
          suburb: formData.suburb,
          city: formData.city || formData.suburb,
          state: formData.addressState,
          postcode: formData.postcode,
          country: formData.addressCountry,
        },
        contact: {
          primaryEmail: formData.primaryEmail,
          secondaryEmail: formData.secondaryEmail || undefined,
          phone: formData.phone,
          mobile: formData.mobile || undefined,
          website: formData.website || undefined,
        },
        socialMedia: {
          facebook: formData.facebook || undefined,
          instagram: formData.instagram || undefined,
          twitter: formData.twitter || undefined,
        },
        settings: {
          requiresApproval: formData.requiresApproval,
          autoApproveReturningPlayers: formData.autoApproveReturningPlayers,
          allowMultipleClubs: formData.allowMultipleClubs,
          seasonStartMonth: formData.seasonStartMonth,
          seasonEndMonth: formData.seasonEndMonth,
          requiresInsurance: formData.requiresInsurance,
          requiresMedicalInfo: formData.requiresMedicalInfo,
          requiresEmergencyContact: formData.requiresEmergencyContact,
        },
        branding: {
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          accentColor: formData.accentColor,
        },
        status: formData.status,
      };

      const url = associationId
        ? `/api/admin/associations/${associationId}`
        : "/api/admin/associations";
      const method = associationId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      router.push("/admin/associations");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* 1. HEADER SECTION */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-[#06054e] text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Building2 size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-[#06054e] tracking-tight">
              {associationId ? "Edit Association" : "New Association"}
            </h1>
            <p className="text-slate-500 font-bold">
              Manage structural details and registration rules.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-700 font-bold">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
      </div>

      {/* 2. BASIC INFORMATION */}
      <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-black text-[#06054e] mb-8 flex items-center gap-3">
          <div className="w-2 h-8 bg-yellow-400 rounded-full" />
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Association ID *
            </label>
            <input
              type="text"
              value={formData.associationId}
              onChange={(e) => handleChange("associationId", e.target.value)}
              disabled={!!associationId}
              placeholder="e.g. bha"
              className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all focus:ring-4 ring-yellow-400/20 ${errors.associationId ? "border-red-400" : "border-slate-100 focus:border-yellow-400"} ${associationId ? "opacity-50" : ""}`}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                handleChange("code", e.target.value.toUpperCase())
              }
              placeholder="BHA"
              className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all focus:ring-4 ring-yellow-400/20 ${errors.code ? "border-red-400" : "border-slate-100 focus:border-yellow-400"}`}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Organization Full Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="e.g. Brisbane Hockey Association Inc."
              className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all focus:ring-4 ring-yellow-400/20 ${errors.fullName ? "border-red-400" : "border-slate-100 focus:border-yellow-400"}`}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Parent Association
            </label>
            <select
              value={formData.parentAssociationId}
              onChange={(e) =>
                handleChange("parentAssociationId", e.target.value)
              }
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              <option value="">None (Root Level)</option>
              {parentAssociations
                .filter((a) => a.associationId !== associationId)
                .map((assoc) => (
                  <option key={assoc.associationId} value={assoc.associationId}>
                    {assoc.code} - {assoc.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. CONTACT & ADDRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <h2 className="text-2xl font-black text-[#06054e] mb-8 flex items-center gap-3">
            <Mail className="text-yellow-500" /> Contact
          </h2>
          <div className="space-y-6">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Primary Email *
              </label>
              <input
                type="email"
                value={formData.primaryEmail}
                onChange={(e) => handleChange("primaryEmail", e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <h2 className="text-2xl font-black text-[#06054e] mb-8 flex items-center gap-3">
            <MapPin className="text-yellow-500" /> Location
          </h2>
          <div className="space-y-6">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => handleChange("street", e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                  Suburb *
                </label>
                <input
                  type="text"
                  value={formData.suburb}
                  onChange={(e) => handleChange("suburb", e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                  Postcode *
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => handleChange("postcode", e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. BRANDING & COLORS */}
      <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-black text-[#06054e] mb-8 flex items-center gap-3">
          <Palette className="text-yellow-500" /> Branding
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: "Primary", key: "primaryColor" },
            { label: "Secondary", key: "secondaryColor" },
            { label: "Accent", key: "accentColor" },
          ].map((color) => (
            <div key={color.key}>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                {color.label} Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData[color.key as keyof typeof formData] as string}
                  onChange={(e) => handleChange(color.key, e.target.value)}
                  className="w-16 h-16 rounded-2xl border-2 border-slate-100 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData[color.key as keyof typeof formData] as string}
                  onChange={(e) => handleChange(color.key, e.target.value)}
                  className="flex-1 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-bold"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SETTINGS */}
      <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-black text-[#06054e] mb-8 flex items-center gap-3">
          <Settings2 className="text-yellow-500" /> Registration Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              id: "requiresApproval",
              title: "Requires Approval",
              sub: "Admins must manually verify new members",
            },
            {
              id: "autoApproveReturningPlayers",
              title: "Auto-approve Returning",
              sub: "System bypass for existing members",
            },
            {
              id: "requiresInsurance",
              title: "Mandatory Insurance",
              sub: "Personal accident cover is required",
            },
            {
              id: "requiresMedicalInfo",
              title: "Collect Medical Data",
              sub: "Ask for allergies/conditions during signup",
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-4 p-5 rounded-[1.5rem] border-2 border-slate-50 hover:border-yellow-200 transition-all cursor-pointer bg-slate-50/30"
            >
              <input
                type="checkbox"
                checked={formData[item.id as keyof typeof formData] as boolean}
                onChange={(e) => handleChange(item.id, e.target.checked)}
                className="mt-1 w-6 h-6 rounded-lg accent-[#06054e]"
              />
              <div>
                <span className="block font-black text-[#06054e]">
                  {item.title}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  {item.sub}
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* 6. FLOATING ACTIONS */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
        <div className="bg-[#06054e] rounded-[2.5rem] p-3 shadow-2xl flex gap-3 border-4 border-white">
          <button
            type="button"
            onClick={() => router.push("/admin/associations")}
            className="flex-1 px-6 py-4 bg-white/10 text-white rounded-[1.8rem] font-bold hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-yellow-400 text-[#06054e] rounded-[1.8rem] font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Save size={24} />
            )}
            {isSaving ? "Saving..." : "Save Association"}
          </button>
        </div>
      </div>
    </form>
  );
}
