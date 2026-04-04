"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
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
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Save,
  X,
  Facebook,
  Instagram,
  Twitter,
  DollarSign,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { LEVEL_MAP } from "@/components/admin/associations/AssociationsList";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParentAssociation {
  associationId: string;
  code: string;
  name: string;
  level: number;
}

interface AssociationFee {
  feeId: string;
  name: string;
  amount: number;
  category?: string;
  isActive: boolean;
}

interface AssociationPosition {
  positionId: string;
  title: string;
  description?: string;
  isActive: boolean;
}

interface AssociationInitialData {
  associationId?: string;
  code?: string;
  name?: string;
  fullName?: string;
  acronym?: string;
  parentAssociationId?: string;
  status?: string;
  level?: number;
  region?: string;
  state?: string;
  country?: string;
  timezone?: string;
  contact?: { primaryEmail?: string; secondaryEmail?: string; phone?: string; mobile?: string; website?: string };
  address?: { street?: string; suburb?: string; city?: string; state?: string; postcode?: string; country?: string };
  socialMedia?: { facebook?: string; instagram?: string; twitter?: string };
  branding?: { primaryColor?: string; secondaryColor?: string; accentColor?: string };
  fees?: AssociationFee[];
  positions?: AssociationPosition[];
  settings?: {
    requiresApproval?: boolean;
    autoApproveReturningPlayers?: boolean;
    allowMultipleClubs?: boolean;
    seasonStartMonth?: number;
    seasonEndMonth?: number;
    requiresInsurance?: boolean;
    requiresMedicalInfo?: boolean;
    requiresEmergencyContact?: boolean;
  };
}

interface AssociationFormProps {
  associationId?: string;
  initialData?: AssociationInitialData;
  parentAssociations?: ParentAssociation[];
}

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "identity",
    label: "Identity",
    icon: Building2,
    desc: "Name, code and hierarchy",
  },
  {
    id: "contact",
    label: "Contact",
    icon: Mail,
    desc: "Email, phone and website",
  },
  { id: "address", label: "Address", icon: MapPin, desc: "Physical location" },
  { id: "social", label: "Social", icon: Share2, desc: "Social media links" },
  {
    id: "branding",
    label: "Branding",
    icon: Palette,
    desc: "Colours and style",
  },
  {
    id: "fees",
    label: "Fees",
    icon: DollarSign,
    desc: "Membership fees",
  },
  {
    id: "positions",
    label: "Positions",
    icon: Users,
    desc: "Committee roles",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    desc: "Registration rules",
  },
];

type SectionId =
  | "identity"
  | "contact"
  | "address"
  | "social"
  | "branding"
  | "fees"
  | "positions"
  | "settings";

// ─── Default form state ───────────────────────────────────────────────────────

const defaultFormData = {
  // Identity
  associationId: "",
  code: "",
  name: "",
  fullName: "",
  acronym: "",
  parentAssociationId: "",
  status: "active",

  // Contact
  primaryEmail: "",
  secondaryEmail: "",
  phone: "",
  mobile: "",
  website: "",

  // Address
  street: "",
  suburb: "",
  city: "",
  addressState: "QLD",
  postcode: "",
  addressCountry: "Australia",
  region: "",
  state: "QLD",
  country: "Australia",
  timezone: "Australia/Brisbane",

  // Social Media
  facebook: "",
  instagram: "",
  twitter: "",

  // Branding
  primaryColor: "#06054e",
  secondaryColor: "#FFD700",
  accentColor: "#ffd700",

  // Fees & Positions
  fees: [] as AssociationFee[],
  positions: [] as AssociationPosition[],

  // Settings
  requiresApproval: false,
  autoApproveReturningPlayers: true,
  allowMultipleClubs: true,
  seasonStartMonth: 1,
  seasonEndMonth: 12,
  requiresInsurance: true,
  requiresMedicalInfo: true,
  requiresEmergencyContact: true,
};

// ─── Section validators ────────────────────────────────────────────────────────

function validateSection(
  section: SectionId,
  formData: typeof defaultFormData,
): Record<string, string> {
  const errs: Record<string, string> = {};

  if (section === "identity") {
    if (!formData.associationId.trim()) errs.associationId = "Required";
    if (!formData.code.trim()) errs.code = "Required";
    if (!formData.name.trim()) errs.name = "Required";
    if (!formData.fullName.trim()) errs.fullName = "Required";
  }

  if (section === "contact") {
    if (!formData.primaryEmail.trim()) {
      errs.primaryEmail = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
      errs.primaryEmail = "Invalid email";
    }
    if (!formData.phone.trim()) errs.phone = "Required";
  }

  if (section === "address") {
    if (!formData.street.trim()) errs.street = "Required";
    if (!formData.suburb.trim()) errs.suburb = "Required";
    if (!formData.postcode.trim()) errs.postcode = "Required";
    if (!formData.addressState.trim()) errs.addressState = "Required";
    if (!formData.region.trim()) errs.region = "Required";
  }

  return errs;
}

// ─── Allowed parent levels ────────────────────────────────────────────────────

function allowedParentLevels(selectedLevel: number): number[] {
  const map: Record<number, number[]> = {
    0: [], // National: no parent
    1: [0], // Sub-national: parent must be National (0)
    2: [0, 1], // State: parent can be National (0) or Sub-national (1)
    3: [1, 2], // Regional: parent can be Sub-national (1) or State (2)
    4: [2, 3], // City: parent can be State (2) or Regional (3)
  };
  return map[selectedLevel] ?? [];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssociationForm({
  associationId,
  initialData,
  parentAssociations = [],
}: AssociationFormProps) {
  const router = useRouter();
  const isEdit = Boolean(associationId);
  const { toasts, dismiss, success, error: toastError } = useToast();

  const [currentSection, setCurrentSection] = useState<SectionId>("identity");
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(
    new Set(),
  );
  const [sectionErrors, setSectionErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | "">("");

  const [formData, setFormData] = useState(defaultFormData);

  // Hydrate on edit
  useEffect(() => {
    if (initialData) {
      setFormData({
        associationId: initialData.associationId || "",
        code: initialData.code || "",
        name: initialData.name || "",
        fullName: initialData.fullName || "",
        acronym: initialData.acronym || "",
        parentAssociationId: initialData.parentAssociationId || "",
        status: initialData.status || "active",
        primaryEmail: initialData.contact?.primaryEmail || "",
        secondaryEmail: initialData.contact?.secondaryEmail || "",
        phone: initialData.contact?.phone || "",
        mobile: initialData.contact?.mobile || "",
        website: initialData.contact?.website || "",
        street: initialData.address?.street || "",
        suburb: initialData.address?.suburb || "",
        city: initialData.address?.city || "",
        addressState: initialData.address?.state || "QLD",
        postcode: initialData.address?.postcode || "",
        addressCountry: initialData.address?.country || "Australia",
        region: initialData.region || "",
        state: initialData.state || "QLD",
        country: initialData.country || "Australia",
        timezone: initialData.timezone || "Australia/Brisbane",
        facebook: initialData.socialMedia?.facebook || "",
        instagram: initialData.socialMedia?.instagram || "",
        twitter: initialData.socialMedia?.twitter || "",
        primaryColor: initialData.branding?.primaryColor || "#06054e",
        secondaryColor: initialData.branding?.secondaryColor || "#FFD700",
        accentColor: initialData.branding?.accentColor || "#ffd700",
        fees: Array.isArray(initialData.fees) ? initialData.fees : [],
        positions: Array.isArray(initialData.positions)
          ? initialData.positions
          : [],
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
      });

      // ✅ FIX: Handle level 0 properly (0 is a valid level, not falsy!)
      const levelToSet =
        typeof initialData.level === "number" ? initialData.level : "";
      setSelectedLevel(levelToSet);
      setCompletedSections(new Set(SECTIONS.map((s) => s.id as SectionId)));

    }
  }, [initialData]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSectionErrors((prev) => {
      const section = currentSection;
      if (prev[section]?.[field]) {
        const updated = { ...prev[section] };
        delete updated[field];
        return { ...prev, [section]: updated };
      }
      return prev;
    });

    if (field === "parentAssociationId") {
      setSelectedLevel("");
    }
  };

  const validParents = selectedLevel
    ? parentAssociations.filter((p) =>
        allowedParentLevels(selectedLevel as number).includes(p.level),
      )
    : parentAssociations;

  const currentIndex = SECTIONS.findIndex((s) => s.id === currentSection);

  const goToSection = (id: SectionId) => {
    if (isEdit) {
      setCurrentSection(id);
      return;
    }
    const targetIdx = SECTIONS.findIndex((s) => s.id === id);
    const isReachable =
      completedSections.has(id) ||
      targetIdx === 0 ||
      SECTIONS.slice(0, targetIdx).every((s) =>
        completedSections.has(s.id as SectionId),
      );
    if (isReachable) setCurrentSection(id);
  };

  const handleNext = () => {
    const errors = validateSection(currentSection, formData);
    if (Object.keys(errors).length > 0) {
      setSectionErrors((prev) => ({ ...prev, [currentSection]: errors }));
      return;
    }
    setSectionErrors((prev) => ({ ...prev, [currentSection]: {} }));
    setCompletedSections((prev) => new Set([...prev, currentSection]));

    if (currentIndex < SECTIONS.length - 1) {
      setCurrentSection(SECTIONS[currentIndex + 1].id as SectionId);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentSection(SECTIONS[currentIndex - 1].id as SectionId);
    }
  };

  const allSectionsComplete = () =>
    ["identity", "contact", "address"].every((s) =>
      completedSections.has(s as SectionId),
    );

  const handleSave = async () => {
    const requiredSections: SectionId[] = ["identity", "contact", "address"];
    const allErrors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    for (const s of requiredSections) {
      const errs = validateSection(s, formData);
      if (Object.keys(errs).length > 0) {
        allErrors[s] = errs;
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setSectionErrors(allErrors);
      const firstErrorSection = requiredSections.find((s) => allErrors[s]);
      if (firstErrorSection) setCurrentSection(firstErrorSection);
      toastError("Incomplete form", "Please fill in all required fields.");
      return;
    }

    setIsSaving(true);

    try {
      // Convert level properly
      const levelValue =
        selectedLevel === "" ||
        selectedLevel === null ||
        selectedLevel === undefined
          ? undefined
          : Number(selectedLevel);

      // ✅ CLEAN FEES: Remove date fields that cause validation issues
      const cleanedFees = (formData.fees || []).map((fee) => ({
        feeId: fee.feeId,
        name: fee.name,
        amount: fee.amount,
        category: fee.category || undefined,
        isActive: fee.isActive ?? true,
      }));

      // ✅ CLEAN POSITIONS
      const cleanedPositions = (formData.positions || []).map((pos) => ({
        positionId: pos.positionId,
        title: pos.title,
        description: pos.description || undefined,
        isActive: pos.isActive ?? true,
      }));

      const payload = {
        associationId: formData.associationId,
        code: formData.code,
        name: formData.name,
        fullName: formData.fullName,
        acronym: formData.acronym || undefined,
        parentAssociationId: formData.parentAssociationId || undefined,
        level: levelValue,
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
        fees: cleanedFees,
        positions: cleanedPositions,
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

      const url = isEdit
        ? `/api/admin/associations/${associationId}`
        : "/api/admin/associations";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        console.error("❌ VALIDATION ERROR:", responseData);
        throw new Error(
          responseData.error || responseData.details || "Validation failed",
        );
      }

      success(
        isEdit ? "Association updated" : "Association created",
        isEdit
          ? "Changes saved successfully."
          : `${formData.name} has been created.`,
      );

      setTimeout(() => {
        router.push("/admin/associations");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      console.error("❌ SAVE ERROR:", err);
      toastError("Save failed", err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const errs = sectionErrors[currentSection] || {};

  const field = (
    label: string,
    key: string,
    opts?: {
      type?: string;
      placeholder?: string;
      required?: boolean;
      disabled?: boolean;
      hint?: string;
    },
  ) => (
    <div>
      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
        {label}
        {opts?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={opts?.type || "text"}
        value={(formData as any)[key] || ""}
        onChange={(e) => handleChange(key, e.target.value)}
        placeholder={opts?.placeholder}
        disabled={opts?.disabled}
        className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all focus:ring-4 ring-yellow-400/20 ${
          errs[key]
            ? "border-red-400"
            : "border-slate-100 focus:border-yellow-400"
        } ${opts?.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {errs[key] && (
        <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errs[key]}</p>
      )}
      {opts?.hint && (
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
          {opts.hint}
        </p>
      )}
    </div>
  );

  // ─── Section renderers ────────────────────────────────────────────────────

  const renderIdentity = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field("Association ID", "associationId", {
          required: true,
          disabled: isEdit,
          placeholder: "e.g. bha",
          hint: isEdit
            ? "Cannot be changed after creation"
            : "Unique identifier, lowercase",
        })}
        {field("Code", "code", {
          required: true,
          placeholder: "e.g. BHA",
          hint: "Short uppercase code",
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field("Display Name", "name", {
          required: true,
          placeholder: "Brisbane Hockey Association",
        })}
        {field("Full Legal Name", "fullName", {
          required: true,
          placeholder: "Brisbane Hockey Association Inc.",
        })}
      </div>

      {field("Acronym", "acronym", { placeholder: "Optional short acronym" })}

      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Level <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedLevel}
          onChange={(e) => {
            const val = e.target.value === "" ? "" : parseInt(e.target.value);
            setSelectedLevel(val as number | "");
            // Reset parent when level changes
            setFormData((prev) => ({ ...prev, parentAssociationId: "" }));
          }}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
        >
          <option value="">Select level…</option>
          <option value="0">Level 0 – National</option>
          <option value="1">Level 1 – Sub-national</option>
          <option value="2">Level 2 – State</option>
          <option value="3">Level 3 – Regional</option>
          <option value="4">Level 4 – City</option>
        </select>
        {selectedLevel && (
          <p className="text-xs text-slate-500 font-bold mt-1 ml-1">
            {LEVEL_MAP[selectedLevel as number]?.label}
          </p>
        )}
      </div>

      {selectedLevel !== "" && (selectedLevel as number) > 0 && (
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Parent Association
          </label>
          {validParents.length === 0 ? (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
              <p className="text-sm font-bold text-yellow-700">
                No valid parent associations found for Level {selectedLevel}.
                Valid parents are:{" "}
                {allowedParentLevels(selectedLevel as number)
                  .map((l) => LEVEL_MAP[l]?.label)
                  .join(" or ")}
              </p>
            </div>
          ) : (
            <select
              value={formData.parentAssociationId}
              onChange={(e) =>
                handleChange("parentAssociationId", e.target.value)
              }
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              <option value="">None</option>
              {validParents.map((a) => (
                <option key={a.associationId} value={a.associationId}>
                  {a.code} – {a.name} (
                  {LEVEL_MAP[a.level]?.label || `L${a.level}`})
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
            Allowed parent levels:{" "}
            {allowedParentLevels(selectedLevel as number)
              .map((l) => LEVEL_MAP[l]?.label)
              .join(", ")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field("Primary Email", "primaryEmail", {
          type: "email",
          required: true,
          placeholder: "info@association.com",
        })}
        {field("Secondary Email", "secondaryEmail", {
          type: "email",
          placeholder: "Optional secondary email",
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field("Phone", "phone", {
          type: "tel",
          required: true,
          placeholder: "+61 7 1234 5678",
        })}
        {field("Mobile", "mobile", {
          type: "tel",
          placeholder: "Optional mobile",
        })}
      </div>
      {field("Website", "website", {
        type: "url",
        placeholder: "https://www.association.com",
      })}
    </div>
  );

  const renderAddress = () => (
    <div className="space-y-6">
      {field("Street Address", "street", {
        required: true,
        placeholder: "123 Hockey Drive",
      })}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field("Suburb", "suburb", { required: true, placeholder: "Suburb" })}
        {field("City / Town", "city", {
          placeholder: "City (defaults to suburb)",
        })}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {field("State", "addressState", { required: true, placeholder: "QLD" })}
        {field("Postcode", "postcode", { required: true, placeholder: "4000" })}
        {field("Country", "addressCountry", { placeholder: "Australia" })}
      </div>
      <div className="pt-2 border-t-2 border-slate-100">
        <p className="text-xs font-black uppercase text-slate-400 mb-4">
          Geographic Region
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {field("Region", "region", {
            required: true,
            placeholder: "e.g. Brisbane",
            hint: "Administrative region name",
          })}
          {field("State / Territory", "state", { placeholder: "QLD" })}
          {field("Timezone", "timezone", { placeholder: "Australia/Brisbane" })}
        </div>
      </div>
    </div>
  );

  const renderSocial = () => (
    <div className="space-y-6">
      <p className="text-sm font-bold text-slate-500">
        All social media fields are optional.
      </p>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Facebook size={22} className="text-blue-600" />
          </div>
          <div className="flex-1">
            {field("Facebook", "facebook", {
              placeholder: "https://facebook.com/yourpage",
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
            <Instagram size={22} className="text-pink-600" />
          </div>
          <div className="flex-1">
            {field("Instagram", "instagram", {
              placeholder: "https://instagram.com/yourpage",
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
            <Twitter size={22} className="text-sky-600" />
          </div>
          <div className="flex-1">
            {field("Twitter / X", "twitter", {
              placeholder: "https://twitter.com/yourpage",
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-8">
      <p className="text-sm font-bold text-slate-500">
        Choose colours that represent the association. These will appear
        throughout the system.
      </p>
      {[
        { label: "Primary Colour", key: "primaryColor" },
        { label: "Secondary Colour", key: "secondaryColor" },
        { label: "Accent Colour", key: "accentColor" },
      ].map((c) => (
        <div key={c.key}>
          <label className="block text-xs font-black uppercase text-slate-400 mb-3 ml-1">
            {c.label}
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="color"
              value={(formData as any)[c.key]}
              onChange={(e) => handleChange(c.key, e.target.value)}
              className="w-16 h-16 rounded-2xl border-2 border-slate-100 cursor-pointer flex-shrink-0"
            />
            <input
              type="text"
              value={(formData as any)[c.key]}
              onChange={(e) => handleChange(c.key, e.target.value)}
              className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-bold focus:border-yellow-400 outline-none"
              placeholder="#000000"
            />
            <div
              className="w-16 h-16 rounded-2xl border-2 border-slate-100 flex-shrink-0"
              style={{ backgroundColor: (formData as any)[c.key] }}
            />
          </div>
        </div>
      ))}

      <div>
        <p className="text-xs font-black uppercase text-slate-400 mb-3">
          Preview
        </p>
        <div
          className="rounded-2xl p-6 flex items-center gap-4"
          style={{ backgroundColor: formData.primaryColor }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm"
            style={{
              backgroundColor: formData.secondaryColor,
              color: formData.primaryColor,
            }}
          >
            {formData.code || "XXX"}
          </div>
          <div>
            <p className="font-black text-white">
              {formData.name || "Association Name"}
            </p>
            <p
              className="text-xs font-bold opacity-70"
              style={{ color: formData.accentColor }}
            >
              {LEVEL_MAP[selectedLevel as number]?.label || "Select a level"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFees = () => {
    const fees = formData.fees || [];

    const addFee = () => {
      const newFee = {
        feeId: `fee_${Date.now()}`,
        name: "",
        amount: 0,
        category: "",
        isActive: true,
      };
      handleChange("fees", [...fees, newFee]);
    };

    const removeFee = (feeId: string) => {
      handleChange(
        "fees",
        fees.filter((f) => f.feeId !== feeId),
      );
    };

    const updateFee = (feeId: string, field: string, value: unknown) => {
      handleChange(
        "fees",
        fees.map((f) =>
          f.feeId === feeId ? { ...f, [field]: value } : f,
        ),
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm font-bold text-slate-500">
            Membership fees and charges (optional)
          </p>
          <button
            type="button"
            onClick={addFee}
            className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            <Plus size={18} />
            Add Fee
          </button>
        </div>

        {fees.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <DollarSign size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold">No fees added yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Fee" to create membership fees
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {fees.map((fee) => (
              <div
                key={fee.feeId}
                className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                      Fee Name *
                    </label>
                    <input
                      type="text"
                      value={fee.name}
                      onChange={(e) =>
                        updateFee(fee.feeId, "name", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      placeholder="e.g. Registration Fee"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fee.amount}
                      onChange={(e) =>
                        updateFee(
                          fee.feeId,
                          "amount",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={fee.category || ""}
                      onChange={(e) =>
                        updateFee(fee.feeId, "category", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      placeholder="e.g. Player, Coach"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => removeFee(fee.feeId)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPositions = () => {
    const positions = formData.positions || [];

    const addPosition = () => {
      const newPosition = {
        positionId: `pos_${Date.now()}`,
        title: "",
        description: "",
        isActive: true,
      };
      handleChange("positions", [...positions, newPosition]);
    };

    const removePosition = (positionId: string) => {
      handleChange(
        "positions",
        positions.filter((p) => p.positionId !== positionId),
      );
    };

    const updatePosition = (positionId: string, field: string, value: unknown) => {
      handleChange(
        "positions",
        positions.map((p) =>
          p.positionId === positionId ? { ...p, [field]: value } : p,
        ),
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm font-bold text-slate-500">
            Committee positions and roles (optional)
          </p>
          <button
            type="button"
            onClick={addPosition}
            className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            <Plus size={18} />
            Add Position
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold">No positions added yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Position" to define committee roles
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <div
                key={position.positionId}
                className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                      Position Title *
                    </label>
                    <input
                      type="text"
                      value={position.title}
                      onChange={(e) =>
                        updatePosition(
                          position.positionId,
                          "title",
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      placeholder="e.g. President, Secretary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={position.description || ""}
                      onChange={(e) =>
                        updatePosition(
                          position.positionId,
                          "description",
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      placeholder="Brief description of role"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => removePosition(position.positionId)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    const checks = [
      {
        id: "requiresApproval",
        title: "Requires Approval",
        sub: "Admins must manually verify new members",
      },
      {
        id: "autoApproveReturningPlayers",
        title: "Auto-approve Returning Players",
        sub: "Skip manual approval for existing members",
      },
      {
        id: "allowMultipleClubs",
        title: "Allow Multiple Club Memberships",
        sub: "Members can join more than one club",
      },
      {
        id: "requiresInsurance",
        title: "Mandatory Insurance",
        sub: "Personal accident cover is required for all members",
      },
      {
        id: "requiresMedicalInfo",
        title: "Collect Medical Information",
        sub: "Request allergies and conditions during sign-up",
      },
      {
        id: "requiresEmergencyContact",
        title: "Require Emergency Contact",
        sub: "Members must provide an emergency contact",
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-yellow-200 transition-all cursor-pointer bg-slate-50/30"
            >
              <input
                type="checkbox"
                checked={(formData as any)[item.id]}
                onChange={(e) => handleChange(item.id, e.target.checked)}
                className="mt-1 w-5 h-5 accent-[#06054e]"
              />
              <div>
                <span className="block font-black text-[#06054e] text-sm">
                  {item.title}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {item.sub}
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-100">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Season Start Month
            </label>
            <select
              value={formData.seasonStartMonth}
              onChange={(e) =>
                handleChange("seasonStartMonth", parseInt(e.target.value))
              }
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Season End Month
            </label>
            <select
              value={formData.seasonEndMonth}
              onChange={(e) =>
                handleChange("seasonEndMonth", parseInt(e.target.value))
              }
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const sectionRenderers: Record<SectionId, () => JSX.Element> = {
    identity: renderIdentity,
    contact: renderContact,
    address: renderAddress,
    social: renderSocial,
    branding: renderBranding,
    fees: renderFees,
    positions: renderPositions,
    settings: renderSettings,
  };

  const isLastSection = currentIndex === SECTIONS.length - 1;

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pb-32">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-[#06054e] text-white flex items-center justify-center">
              <Building2 size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#06054e] tracking-tight">
                {isEdit ? "Edit Association" : "New Association"}
              </h1>
              <p className="text-slate-500 font-bold">
                {isEdit
                  ? "Navigate to any section to update details."
                  : "Complete all sections to create the association."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s, idx) => {
              const isActive = s.id === currentSection;
              const isDone = completedSections.has(s.id as SectionId);
              const isReachable =
                isEdit ||
                isDone ||
                idx === 0 ||
                SECTIONS.slice(0, idx).every((prev) =>
                  completedSections.has(prev.id as SectionId),
                );
              const Icon = s.icon;
              const hasError =
                Object.keys(sectionErrors[s.id] || {}).length > 0;

              return (
                <button
                  key={s.id}
                  onClick={() => goToSection(s.id as SectionId)}
                  disabled={!isReachable}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? "bg-[#06054e] text-white shadow-lg"
                      : hasError
                        ? "bg-red-50 text-red-700 border-2 border-red-200"
                        : isDone
                          ? "bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100"
                          : isReachable
                            ? "bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-slate-100"
                            : "bg-slate-50 text-slate-300 cursor-not-allowed border-2 border-slate-100"
                  }`}
                >
                  {isDone && !isActive && !hasError ? (
                    <CheckCircle2 size={16} className="text-green-600" />
                  ) : hasError ? (
                    <AlertCircle size={16} className="text-red-500" />
                  ) : (
                    <Icon size={16} />
                  )}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            {(() => {
              const s = SECTIONS[currentIndex];
              const Icon = s.icon;
              return (
                <>
                  <div className="w-2 h-8 bg-yellow-400 rounded-full" />
                  <div>
                    <h2 className="text-2xl font-black text-[#06054e]">
                      {s.label}
                    </h2>
                    <p className="text-sm font-bold text-slate-400">{s.desc}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {sectionRenderers[currentSection]()}
        </div>

        {!isEdit && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-slate-500">
                Progress
              </span>
              <span className="text-xs font-black text-slate-500">
                {completedSections.size} / {SECTIONS.length} sections
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-[#06054e] h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(completedSections.size / SECTIONS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/associations")}
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            <X size={18} />
            Cancel
          </button>

          <div className="flex-1" />

          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}

          {!isEdit && !isLastSection && (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}

          {(isEdit || isLastSection) && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (!isEdit && !allSectionsComplete())}
              className="flex items-center gap-2 px-8 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {isSaving
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Create Association"}
            </button>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
