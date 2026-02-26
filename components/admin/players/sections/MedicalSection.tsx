// sections/MedicalSection.tsx
// Player medical information - FIXED with null safety

"use client";

import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/player.types";
import { Heart, AlertCircle } from "lucide-react";

export default function MedicalSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  // ✅ FIXED: Safe access to medical object with default values
  const medical = formData.medical || {
    conditions: "",
    allergies: "",
    medications: "",
    doctorName: "",
    doctorPhone: "",
    medicareNumber: "",
    healthFund: "",
    healthFundNumber: "",
  };

  const hasAllergies = medical.allergies?.trim().length > 0;
  const hasConditions = medical.conditions?.trim().length > 0;
  const hasMedications = medical.medications?.trim().length > 0;

  // Helper to update medical fields
  const updateMedical = (field: string, value: any) => {
    onChange("medical", {
      ...medical,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Medical Alert Banner */}
      {(hasAllergies || hasConditions) && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle
            className="text-red-600 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div>
            <h4 className="font-black text-red-900 text-sm">
              ⚠️ MEDICAL ALERT
            </h4>
            {hasAllergies && (
              <p className="text-red-700 text-sm mt-1">
                <strong>Allergies:</strong> {medical.allergies}
              </p>
            )}
            {hasConditions && (
              <p className="text-red-700 text-sm mt-1">
                <strong>Conditions:</strong> {medical.conditions}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-slate-500 font-bold flex items-center gap-2">
        <Heart size={16} className="text-red-500" />
        Medical information is kept confidential and used only for emergency
        purposes
      </p>

      {/* Medical Conditions */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Medical Conditions
        </label>
        <textarea
          value={medical.conditions || ""}
          onChange={(e) => updateMedical("conditions", e.target.value)}
          rows={3}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Any ongoing medical conditions (e.g., asthma, diabetes, epilepsy)"
        />
        <p className="text-xs text-slate-400 mt-1 ml-1">
          List all medical conditions that emergency responders should be aware
          of
        </p>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Allergies
        </label>
        <textarea
          value={medical.allergies || ""}
          onChange={(e) => updateMedical("allergies", e.target.value)}
          rows={3}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Any allergies (medications, foods, environmental)"
        />
        <p className="text-xs text-slate-400 mt-1 ml-1">
          Include severity and reactions (e.g., "Penicillin - severe
          anaphylaxis")
        </p>
      </div>

      {/* Current Medications */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Current Medications
        </label>
        <textarea
          value={medical.medications || ""}
          onChange={(e) => updateMedical("medications", e.target.value)}
          rows={3}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Current medications and dosages"
        />
        <p className="text-xs text-slate-400 mt-1 ml-1">
          Include name, dosage, and frequency (e.g., "Ventolin inhaler - as
          needed")
        </p>
      </div>

      {/* Doctor Information */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4">
          Doctor Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Doctor's Name"
            name="doctorName"
            value={medical.doctorName || ""}
            onChange={(val) => updateMedical("doctorName", val)}
            placeholder="Dr. Jane Smith"
          />

          <FormField
            label="Doctor's Phone"
            name="doctorPhone"
            type="tel"
            value={medical.doctorPhone || ""}
            onChange={(val) => updateMedical("doctorPhone", val)}
            placeholder="07 1234 5678"
          />
        </div>
      </div>

      {/* Health Insurance */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4">
          Health Insurance
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Medicare Number"
            name="medicareNumber"
            value={medical.medicareNumber || ""}
            onChange={(val) => updateMedical("medicareNumber", val)}
            placeholder="1234 56789 0"
          />

          <FormField
            label="Health Fund"
            name="healthFund"
            value={medical.healthFund || ""}
            onChange={(val) => updateMedical("healthFund", val)}
            placeholder="e.g., Bupa, HCF, Medibank"
          />

          <FormField
            label="Health Fund Number"
            name="healthFundNumber"
            value={medical.healthFundNumber || ""}
            onChange={(val) => updateMedical("healthFundNumber", val)}
            placeholder="Member number"
          />
        </div>
      </div>

      {/* Important Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-900 font-bold">
          💡 <strong>Important:</strong> This information will be shared with
          coaches and first aid officers. In an emergency, this information may
          be shared with medical professionals.
        </p>
      </div>
    </div>
  );
}
