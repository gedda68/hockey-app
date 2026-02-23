"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  MapPin,
  Share2,
  Palette,
  DollarSign,
  Users,
  Settings2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";

// Types
import {
  AssociationFormData,
  ParentAssociation,
  SectionId,
  SectionDefinition,
  DEFAULT_FORM_DATA,
} from "./types/association.types";

// Sections
import IdentitySection from "./sections/IdentitySection";
import ContactSection from "./sections/ContactSection";
import AddressSection from "./sections/AddressSection";
import SocialMediaSection from "./sections/SocialMediaSection";
import BrandingSection from "./sections/BrandingSection";
import FeesSection from "./sections/FeesSection";
import PositionsSection from "./sections/PositionsSection";
import SettingsSection from "./sections/SettingsSection";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssociationFormProps {
  associationId?: string;
  initialData?: any;
  parentAssociations?: ParentAssociation[];
}

// ─── Section Definitions ──────────────────────────────────────────────────────

const SECTIONS: SectionDefinition[] = [
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
  { id: "fees", label: "Fees", icon: DollarSign, desc: "Membership fees" },
  { id: "positions", label: "Positions", icon: Users, desc: "Committee roles" },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    desc: "Registration rules",
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateSection(
  section: SectionId,
  formData: AssociationFormData,
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
    // Region is now optional - no validation
  }

  return errs;
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

  // State
  const [currentSection, setCurrentSection] = useState<SectionId>("identity");
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(
    new Set(),
  );
  const [sectionErrors, setSectionErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | "">("");
  const [formData, setFormData] =
    useState<AssociationFormData>(DEFAULT_FORM_DATA);

  // ─── Hydrate on Edit ──────────────────────────────────────────────────────────

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
        useAccentColor: initialData.branding?.accentColor ? true : false,
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

      // ✅ FIX: Handle level 0 properly
      const levelToSet =
        typeof initialData.level === "number" ? initialData.level : "";
      setSelectedLevel(levelToSet);
      setCompletedSections(new Set(SECTIONS.map((s) => s.id)));

      console.log("🔍 EDIT MODE LOADED:", {
        level: initialData.level,
        levelSet: levelToSet,
      });
    }
  }, [initialData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleChange = (field: string, value: any) => {
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
    // ✅ FIX: Removed level reset on parent change
  };

  const handleLevelChange = (level: number | "") => {
    setSelectedLevel(level);
    // Reset parent when level changes
    setFormData((prev) => ({ ...prev, parentAssociationId: "" }));
  };

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
      SECTIONS.slice(0, targetIdx).every((s) => completedSections.has(s.id));
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
      setCurrentSection(SECTIONS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentSection(SECTIONS[currentIndex - 1].id);
    }
  };

  const allSectionsComplete = () =>
    ["identity", "contact", "address"].every((s) =>
      completedSections.has(s as SectionId),
    );

  const handleSave = async () => {
    // Validate required sections
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
      const levelValue =
        selectedLevel === "" ? undefined : Number(selectedLevel);

      // Clean fees and positions
      const cleanedFees = (formData.fees || []).map((fee) => ({
        feeId: fee.feeId,
        name: fee.name,
        amount: fee.amount,
        category: fee.category || undefined,
        isActive: fee.isActive ?? true,
      }));

      const cleanedPositions = (formData.positions || []).map((pos) => ({
        positionId: pos.positionId,
        title: pos.title,
        description: pos.description || undefined,
        phone: pos.phone || undefined,
        email: pos.email || undefined,
        isPaid: pos.isPaid ?? false,
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
        region: formData.region || undefined,
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
          // ✅ FIX: Only include accent color if enabled
          ...(formData.useAccentColor && { accentColor: formData.accentColor }),
        },
        status: formData.status,
      };

      console.log("💾 SAVING:", { levelValue, payload });

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
      console.log("📡 API RESPONSE:", responseData);

      if (!res.ok) {
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
    } catch (err: any) {
      console.error("❌ SAVE ERROR:", err);
      toastError("Save failed", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render Section ───────────────────────────────────────────────────────────

  const errs = sectionErrors[currentSection] || {};

  const renderCurrentSection = () => {
    const props = { formData, onChange: handleChange, errors: errs };

    switch (currentSection) {
      case "identity":
        return (
          <IdentitySection
            {...props}
            selectedLevel={selectedLevel}
            onLevelChange={handleLevelChange}
            parentAssociations={parentAssociations}
            isEdit={isEdit}
          />
        );
      case "contact":
        return <ContactSection {...props} />;
      case "address":
        return <AddressSection {...props} />;
      case "social":
        return <SocialMediaSection {...props} />;
      case "branding":
        return <BrandingSection {...props} selectedLevel={selectedLevel} />;
      case "fees":
        return <FeesSection {...props} />;
      case "positions":
        return <PositionsSection {...props} />;
      case "settings":
        return <SettingsSection {...props} />;
      default:
        return null;
    }
  };

  const isLastSection = currentIndex === SECTIONS.length - 1;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pb-32">
        {/* Page Header */}
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

        {/* Section Navigation */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s, idx) => {
              const isActive = s.id === currentSection;
              const isDone = completedSections.has(s.id);
              const isReachable =
                isEdit ||
                isDone ||
                idx === 0 ||
                SECTIONS.slice(0, idx).every((prev) =>
                  completedSections.has(prev.id),
                );
              const Icon = s.icon;
              const hasError =
                Object.keys(sectionErrors[s.id] || {}).length > 0;

              return (
                <button
                  key={s.id}
                  onClick={() => goToSection(s.id)}
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

        {/* Active Section */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-yellow-400 rounded-full" />
            <div>
              <h2 className="text-2xl font-black text-[#06054e]">
                {SECTIONS[currentIndex].label}
              </h2>
              <p className="text-sm font-bold text-slate-400">
                {SECTIONS[currentIndex].desc}
              </p>
            </div>
          </div>

          {renderCurrentSection()}
        </div>

        {/* Progress (create mode only) */}
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

      {/* Floating Action Bar */}
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
