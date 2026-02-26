// Complete PlayerForm with all 9 sections
// Integrates existing standalone sections with proper tab navigation

"use client";

import { useState } from "react";
import PersonalSection from "./sections/PersonalSection";
import ClubSection from "./sections/ClubSection";
import MedicalSection from "./sections/MedicalSection";
import EmergencySection from "./sections/EmergencySection";
import DocumentsSection from "./sections/DocumentsSection";
import HistorySection from "./sections/HistorySection";
import ConsentPermissionsSection from "./sections/ConsentPermissionsSection";
import PlayerStatusSection from "./sections/PlayerStatusSection";
import NotesHistorySection from "./sections/NotesHistorySection";
import { PlayerFormData } from "./types/player.types";
import {
  User,
  Building,
  Heart,
  Phone,
  FileText,
  History,
  Shield,
  Activity,
  MessageSquare,
  Save,
  X,
} from "lucide-react";

interface PlayerFormProps {
  mode?: "new" | "edit";
  existingPlayer?: PlayerFormData | null;
}

export default function PlayerForm({
  mode = "new",
  existingPlayer = null,
}: PlayerFormProps) {
  const [currentSection, setCurrentSection] = useState("personal");
  const [formData, setFormData] = useState<PlayerFormData>(
    existingPlayer || {
      // Personal
      firstName: "",
      lastName: "",
      preferredName: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      phone: "",
      street: "",
      suburb: "",
      city: "",
      state: "",
      postcode: "",
      country: "Australia",
      linkedMemberId: null,

      // Club
      clubId: "",
      club: {
        registrationDate: "",
        registrationEndDate: "",
        registrationNumber: "",
        memberNumber: "",
        transferHistory: [],
      },
      primaryPosition: "",
      secondaryPosition: "",

      // Medical - ✅ FIXED: Initialize as object
      medical: {
        conditions: "",
        allergies: "",
        medications: "",
        doctorName: "",
        doctorPhone: "",
        medicareNumber: "",
        healthFund: "",
        healthFundNumber: "",
      },
      conditions: [],
      allergies: [],
      medications: [],

      // Emergency
      emergencyContacts: [],
      guardians: [],

      // Documents
      documents: [],

      // History
      playHistory: [],

      // Consent & Permissions
      consents: {
        photoConsent: false,
        mediaConsent: false,
        transportConsent: false,
        firstAidConsent: false,
        emergencyTreatmentConsent: false,
      },

      // Player Status
      status: {
        current: "pending",
        registrationDate: "",
        expiryDate: "",
        renewalReminderDate: "",
        seasons: [],
      },

      // Notes
      notes: [],
    },
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Section definitions
  const sections = [
    {
      id: "personal",
      label: "Personal",
      icon: User,
      component: PersonalSection,
      description: "Name and contact",
    },
    {
      id: "club",
      label: "Club & Team",
      icon: Building,
      component: ClubSection,
      description: "Club and team selection",
    },
    {
      id: "medical",
      label: "Medical",
      icon: Heart,
      component: MedicalSection,
      description: "Health information",
    },
    {
      id: "emergency",
      label: "Emergency",
      icon: Phone,
      component: EmergencySection,
      description: "Emergency contacts",
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      component: DocumentsSection,
      description: "Files and certificates",
    },
    {
      id: "history",
      label: "History",
      icon: History,
      component: HistorySection,
      description: "Play history",
    },
    {
      id: "consent",
      label: "Consent",
      icon: Shield,
      component: ConsentPermissionsSection,
      description: "Permissions",
    },
    {
      id: "status",
      label: "Status",
      icon: Activity,
      component: PlayerStatusSection,
      description: "Registration status",
    },
    {
      id: "notes",
      label: "Notes",
      icon: MessageSquare,
      component: NotesHistorySection,
      description: "Admin notes",
    },
  ];

  const currentSectionConfig = sections.find((s) => s.id === currentSection);
  const CurrentSectionComponent = currentSectionConfig?.component;

  const handleFieldChange = (field: string, value: any) => {
    console.log(`📝 Field changed: ${field} =`, value);
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      console.log("📋 Updated formData:", updated);
      return updated;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateSection = (sectionId: string): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate required sections
    if (sectionId === "personal") {
      console.log("🔍 Validating personal section:", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        street: formData.street,
        suburb: formData.suburb,
        postcode: formData.postcode,
      });
      if (!formData.firstName) newErrors.firstName = "First name is required";
      if (!formData.lastName) newErrors.lastName = "Last name is required";
      if (!formData.dateOfBirth)
        newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.street) newErrors.street = "Street address is required";
      if (!formData.suburb) newErrors.suburb = "Suburb is required";
      if (!formData.postcode) newErrors.postcode = "Postcode is required";
    }

    if (sectionId === "club") {
      console.log("🔍 Validating club section:", {
        clubId: formData.clubId,
      });
      if (!formData.clubId) newErrors.clubId = "Club selection is required";
    }

    // All other sections (medical, emergency, documents, history, consent, status, notes) are optional
    // No validation needed

    console.log("❌ Validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSection = async (sectionId: string) => {
    // Only validate if it's a required section
    if (
      (sectionId === "personal" || sectionId === "club") &&
      !validateSection(sectionId)
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      // For new players, save to main API
      // For edit, determine which API to use
      const playerId = formData.playerId;

      if (!playerId && mode === "new") {
        // New player - must save main data first
        console.log("📝 Saving new player...");
        const response = await fetch("/api/admin/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Player created:", result);

          // Update formData with new playerId
          if (result.playerId) {
            setFormData((prev) => ({ ...prev, playerId: result.playerId }));
          }

          alert("Section saved successfully!");
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Save failed:", errorData);
          throw new Error(errorData.error || "Failed to save");
        }
      } else if (playerId) {
        // Existing player - save to appropriate API
        let apiUrl = "";
        let dataToSave: any = {};
        let method = "PUT";

        switch (sectionId) {
          case "consent":
            apiUrl = `/api/admin/players/${playerId}/consent`;
            dataToSave = formData.consents;
            break;

          case "status":
            apiUrl = `/api/admin/players/${playerId}/status`;
            dataToSave = formData.status;
            break;

          case "notes":
            apiUrl = `/api/admin/players/${playerId}/notes`;
            dataToSave = formData.notes;
            method = "POST"; // Notes uses POST for the array
            break;

          default:
            // All other sections save to main player API
            apiUrl = `/api/admin/players/${playerId}`;
            dataToSave = formData;
            break;
        }

        console.log(`📝 Saving to ${apiUrl}...`);
        const response = await fetch(apiUrl, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSave),
        });

        if (response.ok) {
          console.log("✅ Section saved successfully");
          alert("Section saved successfully!");
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Save failed:", errorData);
          throw new Error(errorData.error || "Failed to save");
        }
      }
    } catch (error: any) {
      console.error("❌ Error saving section:", error);
      alert(`Failed to save section. ${error.message || "Please try again."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    console.log("💾 === SAVE ALL STARTED ===");
    console.log("📋 Current formData:", formData);

    // Validate required sections
    const sectionsToValidate = ["personal", "club"];
    let allValid = true;

    for (const sectionId of sectionsToValidate) {
      console.log(`🔍 Validating ${sectionId}...`);
      if (!validateSection(sectionId)) {
        allValid = false;
        setCurrentSection(sectionId);
        alert(`Please complete required fields in ${sectionId} section`);
        return;
      }
    }

    console.log("✅ All validations passed");
    setIsSaving(true);

    try {
      console.log("💾 Saving all player data...");
      console.log("📤 Data to send:", JSON.stringify(formData, null, 2));

      // Save main player data
      const playerId = formData.playerId;
      const apiUrl =
        mode === "edit" && playerId
          ? `/api/admin/players/${playerId}`
          : "/api/admin/players";

      console.log(`📡 API URL: ${apiUrl}`);
      console.log(`📡 Method: ${mode === "edit" ? "PUT" : "POST"}`);

      const response = await fetch(apiUrl, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log(`📥 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API Error:", errorData);
        throw new Error(errorData.error || "Failed to save player");
      }

      const result = await response.json();
      const savedPlayerId = result.playerId || playerId;
      console.log("✅ Player saved:", savedPlayerId);
      console.log("📥 Server response:", result);

      // Save additional sections if they have data
      const additionalSaves: Promise<any>[] = [];

      if (formData.consents && savedPlayerId) {
        additionalSaves.push(
          fetch(`/api/admin/players/${savedPlayerId}/consent`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData.consents),
          }).catch((err) => console.warn("Consent save failed:", err)),
        );
      }

      if (formData.status && savedPlayerId) {
        additionalSaves.push(
          fetch(`/api/admin/players/${savedPlayerId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData.status),
          }).catch((err) => console.warn("Status save failed:", err)),
        );
      }

      if (formData.notes && formData.notes.length > 0 && savedPlayerId) {
        // Save each note separately
        formData.notes.forEach((note) => {
          additionalSaves.push(
            fetch(`/api/admin/players/${savedPlayerId}/notes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(note),
            }).catch((err) => console.warn("Note save failed:", err)),
          );
        });
      }

      // Wait for additional saves (but don't fail if they error)
      await Promise.allSettled(additionalSaves);

      console.log("✅ All data saved successfully");
      alert(`Player ${mode === "edit" ? "updated" : "created"} successfully!`);

      // Redirect to players list
      window.location.href = "/admin/players";
    } catch (error: any) {
      console.error("❌ Error saving player:", error);
      alert(`Failed to save player. ${error.message || "Please try again."}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {mode === "edit" ? "Edit Player" : "New Player"}
              </h1>
              {mode === "edit" && formData.firstName && (
                <p className="text-sm text-slate-600 mt-1">
                  {formData.firstName} {formData.lastName}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 flex items-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {isSaving ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          {/* DEBUG PANEL - Shows formData in real-time */}
          <div className="py-3 bg-red-50 border-2 border-red-300 rounded-lg mb-3 -mx-6 px-6">
            <details>
              <summary className="font-bold text-red-900 cursor-pointer">
                🔍 DEBUG - Click to view current form data
              </summary>
              <div className="mt-3 text-xs font-mono bg-white p-3 rounded overflow-auto max-h-60">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-bold text-blue-900 mb-2">Personal:</p>
                    <p>
                      <strong>firstName:</strong>{" "}
                      {formData.firstName || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>lastName:</strong>{" "}
                      {formData.lastName || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>dateOfBirth:</strong>{" "}
                      {formData.dateOfBirth || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>gender:</strong> {formData.gender || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>email:</strong> {formData.email || "(optional)"}
                    </p>
                    <p>
                      <strong>phone:</strong> {formData.phone || "(optional)"}
                    </p>
                    <p>
                      <strong>street:</strong> {formData.street || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>suburb:</strong> {formData.suburb || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>postcode:</strong>{" "}
                      {formData.postcode || "❌ EMPTY"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-blue-900 mb-2">Club:</p>
                    <p>
                      <strong>clubId:</strong> {formData.clubId || "❌ EMPTY"}
                    </p>
                    <p>
                      <strong>linkedMemberId:</strong>{" "}
                      {formData.linkedMemberId || "(none)"}
                    </p>
                    <p>
                      <strong>playerId:</strong>{" "}
                      {formData.playerId || "(not created yet)"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded">
                  <p className="font-bold text-yellow-900">⚠️ Instructions:</p>
                  <p className="text-yellow-800 text-xs mt-1">
                    1. Type in a field (e.g., First Name)
                    <br />
                    2. Check if the value appears above
                    <br />
                    3. If it stays "❌ EMPTY", onChange is not working!
                    <br />
                    4. Open Console (F12) and look for "📝 Field changed" logs
                  </p>
                </div>
              </div>
            </details>
          </div>

          <div className="flex gap-2 overflow-x-auto py-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = currentSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={18} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-100 p-8">
          {/* Section Header */}
          <div className="mb-8 pb-6 border-b-2 border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  {currentSectionConfig?.label}
                </h2>
                <p className="text-slate-600">
                  {currentSectionConfig?.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSection(currentSection)}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Section"}
              </button>
            </div>
          </div>

          {/* Section Component */}
          {CurrentSectionComponent && (
            <CurrentSectionComponent
              formData={formData}
              onChange={handleFieldChange}
              errors={errors}
            />
          )}
        </div>

        {/* Section Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => {
              const currentIndex = sections.findIndex(
                (s) => s.id === currentSection,
              );
              if (currentIndex > 0) {
                setCurrentSection(sections[currentIndex - 1].id);
              }
            }}
            disabled={currentSection === sections[0].id}
            className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {/* Show different button on last section */}
          {currentSection === sections[sections.length - 1].id ? (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {isSaving ? "Saving..." : "Save All & Finish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const currentIndex = sections.findIndex(
                  (s) => s.id === currentSection,
                );
                if (currentIndex < sections.length - 1) {
                  setCurrentSection(sections[currentIndex + 1].id);
                }
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
