// components/admin/players/FormProgressIndicator.tsx
// Shows completion percentage for each section and overall progress

"use client";

import { PlayerFormData } from "../types/player.types";
import { CheckCircle, Circle, AlertCircle, XCircle } from "lucide-react";

interface SectionProgress {
  name: string;
  completed: number;
  total: number;
  status: "complete" | "partial" | "empty";
  errors: number;
}

interface FormProgressIndicatorProps {
  formData: PlayerFormData;
  errors: Record<string, string>;
}

export default function FormProgressIndicator({
  formData,
  errors,
}: FormProgressIndicatorProps) {
  const calculateSectionProgress = (): SectionProgress[] => {
    const sections: SectionProgress[] = [];

    // Personal Information
    const personalFields = [
      formData.firstName,
      formData.lastName,
      formData.dateOfBirth,
      formData.gender,
      formData.email,
      formData.phone,
    ];
    const personalCompleted = personalFields.filter((f) =>
      f?.toString().trim(),
    ).length;
    sections.push({
      name: "Personal Info",
      completed: personalCompleted,
      total: personalFields.length,
      status:
        personalCompleted === personalFields.length
          ? "complete"
          : personalCompleted > 0
            ? "partial"
            : "empty",
      errors: Object.keys(errors).filter((k) =>
        [
          "firstName",
          "lastName",
          "dateOfBirth",
          "gender",
          "email",
          "phone",
        ].includes(k),
      ).length,
    });

    // Address
    const addressFields = [
      formData.street,
      formData.suburb,
      formData.city,
      formData.state,
      formData.postcode,
      formData.country,
    ];
    const addressCompleted = addressFields.filter((f) =>
      f?.toString().trim(),
    ).length;
    sections.push({
      name: "Address",
      completed: addressCompleted,
      total: addressFields.length,
      status:
        addressCompleted === addressFields.length
          ? "complete"
          : addressCompleted > 0
            ? "partial"
            : "empty",
      errors: Object.keys(errors).filter((k) =>
        ["street", "suburb", "city", "state", "postcode", "country"].includes(
          k,
        ),
      ).length,
    });

    // Club
    const clubFields = [
      formData.clubId,
      formData.club?.registrationDate,
      formData.club?.registrationNumber,
      formData.club?.memberNumber,
    ];
    const clubCompleted = clubFields.filter((f) => f?.toString().trim()).length;
    sections.push({
      name: "Club",
      completed: clubCompleted,
      total: clubFields.length,
      status:
        clubCompleted === clubFields.length
          ? "complete"
          : clubCompleted > 0
            ? "partial"
            : "empty",
      errors: Object.keys(errors).filter(
        (k) => k.startsWith("club") || k === "clubId",
      ).length,
    });

    // Medical
    const medicalFields = [
      formData.medical?.conditions,
      formData.medical?.allergies,
      formData.medical?.medications,
      formData.medical?.doctorName,
      formData.medical?.doctorPhone,
      formData.medical?.medicareNumber,
    ];
    const medicalCompleted = medicalFields.filter((f) =>
      f?.toString().trim(),
    ).length;
    sections.push({
      name: "Medical",
      completed: medicalCompleted,
      total: medicalFields.length,
      status:
        medicalCompleted === medicalFields.length
          ? "complete"
          : medicalCompleted > 0
            ? "partial"
            : "empty",
      errors: Object.keys(errors).filter((k) => k.startsWith("medical")).length,
    });

    // Emergency Contacts
    const emergencyCompleted = formData.emergencyContacts?.length || 0;
    const emergencyTotal = 1; // At least 1 required
    sections.push({
      name: "Emergency Contacts",
      completed: Math.min(emergencyCompleted, emergencyTotal),
      total: emergencyTotal,
      status:
        emergencyCompleted >= emergencyTotal
          ? "complete"
          : emergencyCompleted > 0
            ? "partial"
            : "empty",
      errors: Object.keys(errors).filter((k) => k.includes("emergencyContact"))
        .length,
    });

    // Guardians (if minor)
    if (
      formData.dateOfBirth &&
      new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear() <
        18
    ) {
      const guardiansCompleted = formData.guardians?.length || 0;
      const guardiansTotal = 1;
      sections.push({
        name: "Guardians",
        completed: Math.min(guardiansCompleted, guardiansTotal),
        total: guardiansTotal,
        status:
          guardiansCompleted >= guardiansTotal
            ? "complete"
            : guardiansCompleted > 0
              ? "partial"
              : "empty",
        errors: Object.keys(errors).filter((k) => k.includes("guardian"))
          .length,
      });
    }

    // Documents
    const requiredDocs = ["birth_certificate", "photo"];
    const hasRequiredDocs = requiredDocs.filter((type) =>
      formData.documents?.some((d) => d.type === type && d.url),
    ).length;
    sections.push({
      name: "Documents",
      completed: hasRequiredDocs,
      total: requiredDocs.length,
      status:
        hasRequiredDocs === requiredDocs.length
          ? "complete"
          : hasRequiredDocs > 0
            ? "partial"
            : "empty",
      errors: Object.keys(errors).filter((k) => k.startsWith("documents"))
        .length,
    });

    // Consents (if exists)
    if (formData.consents) {
      const requiredConsents = ["firstAidConsent", "emergencyTreatmentConsent"];
      const hasConsents = requiredConsents.filter(
        (type) => formData.consents?.[type as keyof typeof formData.consents],
      ).length;
      sections.push({
        name: "Consents",
        completed: hasConsents,
        total: requiredConsents.length,
        status:
          hasConsents === requiredConsents.length
            ? "complete"
            : hasConsents > 0
              ? "partial"
              : "empty",
        errors: 0,
      });
    }

    return sections;
  };

  const sections = calculateSectionProgress();

  // Calculate overall progress
  const totalCompleted = sections.reduce((sum, s) => sum + s.completed, 0);
  const totalFields = sections.reduce((sum, s) => sum + s.total, 0);
  const overallPercentage =
    totalFields > 0 ? Math.round((totalCompleted / totalFields) * 100) : 0;
  const totalErrors = sections.reduce((sum, s) => sum + s.errors, 0);

  return (
    <div className="sticky top-4 p-6 bg-white border-2 border-slate-200 rounded-2xl shadow-lg">
      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black text-slate-700">Form Completion</h3>
          <span
            className={`text-2xl font-black ${
              overallPercentage === 100
                ? "text-green-600"
                : overallPercentage >= 50
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            {overallPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              overallPercentage === 100
                ? "bg-green-600"
                : overallPercentage >= 50
                  ? "bg-yellow-400"
                  : "bg-red-500"
            }`}
            style={{ width: `${overallPercentage}%` }}
          />
        </div>

        {/* Status Message */}
        <p className="text-xs text-slate-600 mt-2">
          {overallPercentage === 100 ? (
            <span className="text-green-700 font-bold flex items-center gap-1">
              <CheckCircle size={14} />
              Form complete! Ready to submit
            </span>
          ) : totalErrors > 0 ? (
            <span className="text-red-700 font-bold flex items-center gap-1">
              <AlertCircle size={14} />
              {totalErrors} error{totalErrors !== 1 ? "s" : ""} to fix
            </span>
          ) : (
            <span className="text-slate-600 font-bold">
              {totalCompleted} of {totalFields} fields completed
            </span>
          )}
        </p>
      </div>

      {/* Section Progress */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase text-slate-400 mb-3">
          Section Progress
        </h4>

        {sections.map((section) => {
          const percentage =
            section.total > 0
              ? Math.round((section.completed / section.total) * 100)
              : 0;

          return (
            <div key={section.name} className="flex items-center gap-3">
              {/* Status Icon */}
              {section.status === "complete" ? (
                <CheckCircle
                  size={20}
                  className="text-green-600 flex-shrink-0"
                />
              ) : section.status === "partial" ? (
                <Circle
                  size={20}
                  className="text-yellow-500 flex-shrink-0 fill-yellow-500"
                />
              ) : (
                <Circle size={20} className="text-slate-300 flex-shrink-0" />
              )}

              {/* Section Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">
                    {section.name}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      section.status === "complete"
                        ? "text-green-600"
                        : section.status === "partial"
                          ? "text-yellow-600"
                          : "text-slate-400"
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>

                {/* Mini Progress Bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      section.status === "complete"
                        ? "bg-green-600"
                        : section.status === "partial"
                          ? "bg-yellow-400"
                          : "bg-slate-300"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Error Count */}
                {section.errors > 0 && (
                  <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                    <XCircle size={10} />
                    {section.errors} error{section.errors !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-slate-600">Complete</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle size={14} className="text-yellow-500 fill-yellow-500" />
            <span className="text-slate-600">Partial</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle size={14} className="text-slate-300" />
            <span className="text-slate-600">Empty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
