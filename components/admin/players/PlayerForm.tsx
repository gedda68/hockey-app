"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  AlertCircle,
  Heart,
  FileText,
  History,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";

import {
  PlayerFormData,
  Club,
  Team,
  SectionId,
  SectionDefinition,
  DEFAULT_PLAYER_DATA,
} from "./types/player.types";

import PersonalSection from "./sections/PersonalSection";
import ClubSection from "./sections/ClubSection";
import MedicalSection from "./sections/MedicalSection";
import EmergencySection from "./sections/EmergencySection";
import DocumentsSection from "./sections/DocumentsSection";
import HistorySection from "./sections/HistorySection";

interface PlayerFormProps {
  playerId?: string;
  initialData?: any;
  clubs?: Club[];
  teams?: Team[];
}

const SECTIONS: SectionDefinition[] = [
  { id: "personal", label: "Personal", icon: User, desc: "Name and contact" },
  {
    id: "club",
    label: "Club & Team",
    icon: Building2,
    desc: "Club and team selection",
  },
  { id: "medical", label: "Medical", icon: Heart, desc: "Medical information" },
  {
    id: "emergency",
    label: "Emergency",
    icon: AlertCircle,
    desc: "Emergency contacts",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    desc: "Required documents",
  },
  { id: "history", label: "History", icon: History, desc: "Play history" },
];

// Generate player ID
function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validation
function validateSection(
  section: SectionId,
  formData: PlayerFormData,
): Record<string, string> {
  const errs: Record<string, string> = {};

  if (section === "personal") {
    if (!formData.firstName.trim()) errs.firstName = "Required";
    if (!formData.lastName.trim()) errs.lastName = "Required";
    if (!formData.dateOfBirth) errs.dateOfBirth = "Required";
    if (!formData.street.trim()) errs.street = "Required";
    if (!formData.suburb.trim()) errs.suburb = "Required";
    if (!formData.postcode.trim()) errs.postcode = "Required";
  }

  if (section === "club") {
    if (!formData.clubId) errs.clubId = "Required";
    if (!formData.primaryPosition) errs.primaryPosition = "Required";
  }

  if (section === "emergency") {
    if (formData.emergencyContacts.length === 0) {
      errs.emergencyContacts = "At least one emergency contact required";
    }
  }

  return errs;
}

export default function PlayerForm({
  playerId,
  initialData,
  clubs = [],
  teams = [],
}: PlayerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(playerId);
  const { toasts, dismiss, success, error: toastError } = useToast();

  const [currentSection, setCurrentSection] = useState<SectionId>("personal");
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(
    new Set(),
  );
  const [sectionErrors, setSectionErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<PlayerFormData>(DEFAULT_PLAYER_DATA);

  // Hydrate on edit
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...DEFAULT_PLAYER_DATA,
        ...initialData,
        playerId: initialData.playerId || initialData.id,
        medical: {
          ...DEFAULT_PLAYER_DATA.medical,
          ...(initialData.medical || {}),
        },
        emergencyContacts: initialData.emergencyContacts || [],
        guardians: initialData.guardians || [],
        teamIds: initialData.teamIds || [],
        documents: initialData.documents || [],
        playHistory: initialData.playHistory || [],
      });
      setCompletedSections(new Set(SECTIONS.map((s) => s.id)));
    } else {
      // Generate ID for new players
      setFormData((prev) => ({ ...prev, playerId: generatePlayerId() }));
    }
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

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
    ["personal", "club", "emergency"].every((s) =>
      completedSections.has(s as SectionId),
    );

  const handleSave = async () => {
    // Validate required sections
    const requiredSections: SectionId[] = ["personal", "club", "emergency"];
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
      const payload = {
        ...formData,
        playerId: formData.playerId || generatePlayerId(),
      };

      console.log("💾 SAVING PLAYER:", payload);

      const url = "/api/admin/players";
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
        isEdit ? "Player updated" : "Player registered",
        isEdit
          ? "Changes saved successfully."
          : `${formData.firstName} ${formData.lastName} has been registered.`,
      );

      setTimeout(() => {
        router.push("/admin/players");
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

  const renderCurrentSection = () => {
    const props = { formData, onChange: handleChange, errors: errs };

    switch (currentSection) {
      case "personal":
        return <PersonalSection {...props} />;
      case "club":
        return <ClubSection {...props} clubs={clubs} teams={teams} />;
      case "medical":
        return <MedicalSection {...props} />;
      case "emergency":
        return <EmergencySection {...props} />;
      case "documents":
        return <DocumentsSection {...props} />;
      case "history":
        return <HistorySection {...props} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pb-32">
        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-[#06054e] text-white flex items-center justify-center">
              <User size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#06054e]">
                {isEdit ? "Edit Player" : "New Player"}
              </h1>
              <p className="text-slate-500 font-bold">
                {isEdit ? "Update player details" : "Register a new player"}
              </p>
            </div>
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
            onClick={() => router.push("/admin/players")}
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
              disabled={isSaving || (!isEdit && !allSectionsComplete())}
              className="flex items-center gap-2 px-8 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:scale-[1.02] disabled:opacity-50"
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
                  : "Register Player"}
            </button>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
