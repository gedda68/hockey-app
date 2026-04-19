"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Info,
  Mail,
  MapPin,
  Palette,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { useAdminEditingScope } from "@/components/admin/AdminEditingScopeProvider";

// Types
import {
  ClubFormData,
  Association,
  SectionId,
  SectionDefinition,
  DEFAULT_CLUB_DATA,
} from "./types/club.types";

// Sections
import IdentitySection from "./sections/IdentitySection";
import DetailsSection from "./sections/DetailsSection";
import ContactSection from "./sections/ContactSection";
import AddressSection from "./sections/AddressSection";
import ColorsSection from "./sections/ColorsSection";
import CommitteeSection from "./sections/CommitteeSection";
import ClubPartnersEditor from "./ClubPartnersEditor";

interface ClubFormProps {
  clubId?: string;
  initialData?: any;
  associations?: Association[];
}

const SECTIONS: SectionDefinition[] = [
  {
    id: "identity",
    label: "Identity",
    icon: Building2,
    desc: "Name and association",
  },
  {
    id: "details",
    label: "Details",
    icon: Info,
    desc: "Logo, ground, history",
  },
  { id: "contact", label: "Contact", icon: Mail, desc: "Email, phone, social" },
  { id: "address", label: "Address", icon: MapPin, desc: "Physical location" },
  { id: "colors", label: "Colors", icon: Palette, desc: "Club branding" },
  {
    id: "committee",
    label: "Committee",
    icon: Users,
    desc: "Committee members",
  },
];

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Generate club ID
function generateClubId(): string {
  return `club-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validation
function validateSection(
  section: SectionId,
  formData: ClubFormData,
): Record<string, string> {
  const errs: Record<string, string> = {};

  if (section === "identity") {
    if (!formData.name.trim()) errs.name = "Required";
    if (!formData.shortName.trim()) errs.shortName = "Required";
    if (!formData.parentAssociationId) errs.parentAssociationId = "Required";
    const ps = formData.portalSlug?.trim();
    if (ps && !/^[a-z0-9-]+$/i.test(ps)) {
      errs.portalSlug = "Use letters, numbers, and hyphens only";
    }
  }

  if (section === "contact") {
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Invalid email";
    }
  }

  if (section === "address") {
    if (!formData.street.trim()) errs.street = "Required";
    if (!formData.suburb.trim()) errs.suburb = "Required";
    if (!formData.postcode.trim()) errs.postcode = "Required";
  }

  return errs;
}

export default function ClubForm({
  clubId,
  initialData,
  associations = [],
}: ClubFormProps) {
  const router = useRouter();
  const isEdit = Boolean(clubId);
  const editingScope = useAdminEditingScope();
  const { toasts, dismiss, success, error: toastError } = useToast();

  const [currentSection, setCurrentSection] = useState<SectionId>("identity");
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(
    new Set(),
  );
  const [sectionErrors, setSectionErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [adminHeaderUploading, setAdminHeaderUploading] = useState(false);
  const [publicHeaderUploading, setPublicHeaderUploading] = useState(false);
  const [formData, setFormData] = useState<ClubFormData>(DEFAULT_CLUB_DATA);

  // Hydrate on edit
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || "",
        name: initialData.name || "",
        shortName: initialData.shortName || "",
        slug: initialData.slug || "",
        portalSlug: initialData.portalSlug || "",
        parentAssociationId: initialData.parentAssociationId || "",
        logo: initialData.logo || "",
        established: initialData.established || "",
        homeGround: initialData.homeGround || "",
        description: initialData.description || "",
        about: initialData.about || "",
        primaryColor: initialData.colors?.primary || "#06054e",
        secondaryColor: initialData.colors?.secondary || "#FFD700",
        accentColor: initialData.colors?.accent || "#ffffff",
        adminHeaderBannerUrl:
          (
            initialData as {
              branding?: { adminHeaderBannerUrl?: string };
            }
          ).branding?.adminHeaderBannerUrl?.trim() || "",
        publicHeaderBannerUrl:
          (
            initialData as {
              branding?: { publicHeaderBannerUrl?: string };
            }
          ).branding?.publicHeaderBannerUrl?.trim() || "",
        street: initialData.address?.street || "",
        suburb: initialData.address?.suburb || "",
        city: initialData.address?.city || "",
        state: initialData.address?.state || "QLD",
        postcode: initialData.address?.postcode || "",
        country: initialData.address?.country || "Australia",
        region: initialData.region || "",
        email: initialData.contact?.email || "",
        phone: initialData.contact?.phone || "",
        website: initialData.contact?.website || "",
        facebook: initialData.socialMedia?.facebook || "",
        instagram: initialData.socialMedia?.instagram || "",
        twitter: initialData.socialMedia?.twitter || "",
        committee: Array.isArray(initialData.committee)
          ? initialData.committee
          : [],
        committeePositions: Array.isArray(initialData.committeePositions)
          ? initialData.committeePositions
          : DEFAULT_CLUB_DATA.committeePositions,
        publicPartners: Array.isArray(
          (initialData as { publicPartners?: unknown }).publicPartners,
        )
          ? (
              (initialData as { publicPartners: { name?: string; url?: string; logoUrl?: string }[] })
                .publicPartners || []
            ).map((p) => ({
              name: String(p.name ?? "").trim(),
              url: typeof p.url === "string" ? p.url.trim() : "",
              logoUrl: typeof p.logoUrl === "string" ? p.logoUrl.trim() : "",
            }))
          : [],
        active: initialData.active ?? true,
      });

      setCompletedSections(new Set(SECTIONS.map((s) => s.id)));
    } else {
      // Generate ID for new clubs
      setFormData((prev) => ({ ...prev, id: generateClubId() }));
    }
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug when name changes
      if (field === "name" && !isEdit) {
        updated.slug = generateSlug(value);
      }

      return updated;
    });

    // Clear field error
    setSectionErrors((prev) => {
      const section = currentSection;
      if (prev[section]?.[field]) {
        const updated = { ...prev[section] };
        delete updated[field];
        return { ...prev, [section]: updated };
      }
      return prev;
    });
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
    ["identity", "address"].every((s) => completedSections.has(s as SectionId));

  const uploadAdminHeaderBanner = async (file: File) => {
    if (!isEdit || !formData.id.trim()) {
      toastError(
        "Save the club first",
        "Create the club and open edit mode to upload an admin header image.",
      );
      return;
    }
    setAdminHeaderUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", `clubs/${encodeURIComponent(formData.id)}/branding`);
      const res = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed",
        );
      }
      const url = typeof data.url === "string" ? data.url : "";
      if (!url) throw new Error("No file URL returned");
      handleChange("adminHeaderBannerUrl", url);
      success(
        "Image uploaded",
        "Admin header URL filled in — click Save Changes to persist.",
      );
    } catch (e) {
      toastError(
        "Upload failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setAdminHeaderUploading(false);
    }
  };

  const uploadPublicHeaderBanner = async (file: File) => {
    if (!isEdit || !formData.id.trim()) {
      toastError(
        "Save the club first",
        "Create the club and open edit mode to upload a public header image.",
      );
      return;
    }
    setPublicHeaderUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", `clubs/${encodeURIComponent(formData.id)}/branding`);
      const res = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed",
        );
      }
      const url = typeof data.url === "string" ? data.url : "";
      if (!url) throw new Error("No file URL returned");
      handleChange("publicHeaderBannerUrl", url);
      success(
        "Image uploaded",
        "Public site header URL filled in — click Save Changes to persist.",
      );
    } catch (e) {
      toastError(
        "Upload failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setPublicHeaderUploading(false);
    }
  };

  const handleSave = async () => {
    // Validate required sections
    const requiredSections: SectionId[] = ["identity", "address"];
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

    if (editingScope.savesBlocked) {
      toastError(
        "Cannot save",
        editingScope.blockReason ??
          "You are not permitted to edit this club with your current login.",
      );
      return;
    }

    if (
      isEdit &&
      initialData?.id &&
      formData.id.trim() !== String(initialData.id).trim()
    ) {
      toastError(
        "Cannot save",
        "This form no longer matches the club record. Refresh the page.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        id: formData.id,
        name: formData.name,
        shortName: formData.shortName,
        slug: formData.slug,
        portalSlug: formData.portalSlug?.trim() || undefined,
        parentAssociationId: formData.parentAssociationId,
        logo: formData.logo || undefined,
        established: formData.established || undefined,
        homeGround: formData.homeGround || undefined,
        description: formData.description || undefined,
        about: formData.about || undefined,
        colors: {
          primary: formData.primaryColor,
          secondary: formData.secondaryColor,
          accent: formData.accentColor,
        },
        address: {
          street: formData.street,
          suburb: formData.suburb,
          city: formData.city || formData.suburb,
          state: formData.state,
          postcode: formData.postcode,
          country: formData.country,
        },
        region: formData.region || undefined,
        contact: {
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          website: formData.website || undefined,
        },
        socialMedia: {
          facebook: formData.facebook || undefined,
          instagram: formData.instagram || undefined,
          twitter: formData.twitter || undefined,
        },
        committee: formData.committee,
        committeePositions: formData.committeePositions,
        active: formData.active,
        publicPartners: (formData.publicPartners || [])
          .filter((p) => p.name.trim())
          .slice(0, 20)
          .map((p) => ({
            name: p.name.trim(),
            ...(p.url.trim() ? { url: p.url.trim() } : {}),
            ...(p.logoUrl.trim() ? { logoUrl: p.logoUrl.trim() } : {}),
          })),
        branding: {
          ...(initialData &&
          typeof (initialData as { branding?: unknown }).branding === "object" &&
          (initialData as { branding: Record<string, unknown> }).branding
            ? {
                ...(initialData as { branding: Record<string, unknown> })
                  .branding,
              }
            : {}),
          adminHeaderBannerUrl: formData.adminHeaderBannerUrl.trim() || null,
          publicHeaderBannerUrl: formData.publicHeaderBannerUrl.trim() || null,
        },
      };

      console.log("💾 SAVING CLUB:", payload);

      const url = "/api/admin/clubs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Save failed");
      }

      success(
        isEdit ? "Club updated" : "Club created",
        isEdit
          ? "Changes saved successfully."
          : `${formData.name} has been created.`,
      );

      setTimeout(() => {
        router.push("/admin/clubs");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      console.error("❌ SAVE ERROR:", err);
      toastError("Save failed", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const errs = sectionErrors[currentSection] || {};
  const isLastSection = currentIndex === SECTIONS.length - 1;

  // Render current section
  const renderCurrentSection = () => {
    const props = { formData, onChange: handleChange, errors: errs };

    switch (currentSection) {
      case "identity":
        return (
          <IdentitySection
            {...props}
            associations={associations}
            isEdit={isEdit}
          />
        );
      case "details":
        return <DetailsSection {...props} />;
      case "contact":
        return <ContactSection {...props} />;
      case "address":
        return <AddressSection {...props} />;
      case "colors":
        return (
          <>
            <ColorsSection
              {...props}
              clubIdForUpload={isEdit ? formData.id : undefined}
              isEditMode={isEdit}
              adminHeaderUploading={adminHeaderUploading}
              onAdminHeaderBannerFile={(f) => void uploadAdminHeaderBanner(f)}
              publicHeaderUploading={publicHeaderUploading}
              onPublicHeaderBannerFile={(f) => void uploadPublicHeaderBanner(f)}
            />
            <ClubPartnersEditor
              partners={formData.publicPartners || []}
              onChangePartners={(rows) => handleChange("publicPartners", rows)}
              clubId={clubId}
              isEdit={isEdit}
            />
          </>
        );
      case "committee":
        return <CommitteeSection {...props} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pb-32">
        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-[#06054e] text-white flex items-center justify-center">
                <Building2 size={40} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-[#06054e]">
                  {isEdit ? "Edit Club" : "New Club"}
                </h1>
                <p className="text-slate-500 font-bold">
                  {isEdit ? "Update club details" : "Create a new hockey club"}
                </p>
              </div>
            </div>
            {isEdit && clubId ? (
              <Link
                href={`/admin/clubs/${encodeURIComponent(clubId)}/volunteer-duty-roster`}
                className="inline-flex items-center gap-2 self-start rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-[#06054e] hover:border-amber-400"
              >
                <ClipboardList size={18} />
                Volunteer duty roster
              </Link>
            ) : null}
          </div>
        </div>

        {/* Section Nav */}
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
                      ? "bg-[#06054e] text-white"
                      : hasError
                        ? "bg-red-50 text-red-700 border-2 border-red-200"
                        : isDone
                          ? "bg-green-50 text-green-700 border-2 border-green-200"
                          : isReachable
                            ? "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {isDone && !isActive && !hasError ? (
                    <CheckCircle2 size={16} />
                  ) : hasError ? (
                    <AlertCircle size={16} />
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

        {/* Progress */}
        {!isEdit && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-slate-500">
                Progress
              </span>
              <span className="text-xs font-black text-slate-500">
                {completedSections.size} / {SECTIONS.length}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-[#06054e] h-2 rounded-full transition-all"
                style={{
                  width: `${(completedSections.size / SECTIONS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/clubs")}
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
          >
            <X size={18} />
            Cancel
          </button>

          <div className="flex-1" />

          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}

          {!isEdit && !isLastSection && (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e]"
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}

          {(isEdit || isLastSection) && (
            <button
              type="button"
              onClick={handleSave}
              disabled={
                isSaving ||
                editingScope.savesBlocked ||
                (!isEdit && !allSectionsComplete())
              }
              className="flex items-center gap-2 px-8 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:scale-[1.02] disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Create Club"}
            </button>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
