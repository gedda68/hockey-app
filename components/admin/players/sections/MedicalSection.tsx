// sections/MedicalSection.tsx
// Player medical information

import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/player.types";
import { Heart, AlertCircle } from "lucide-react";

export default function MedicalSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const hasAllergies = formData.medical.allergies?.trim().length > 0;
  const hasConditions = formData.medical.conditions?.trim().length > 0;

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
                <strong>Allergies:</strong> {formData.medical.allergies}
              </p>
            )}
            {hasConditions && (
              <p className="text-red-700 text-sm mt-1">
                <strong>Conditions:</strong> {formData.medical.conditions}
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
          value={formData.medical.conditions}
          onChange={(e) =>
            onChange("medical", {
              ...formData.medical,
              conditions: e.target.value,
            })
          }
          rows={3}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Any ongoing medical conditions (e.g., asthma, diabetes, epilepsy)"
        />
        <p className="text-xs text-slate-400 mt-1 ml-1">
          Include any conditions coaches and medical staff should be aware of
        </p>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500" />
          Allergies
        </label>
        <textarea
          value={formData.medical.allergies}
          onChange={(e) =>
            onChange("medical", {
              ...formData.medical,
              allergies: e.target.value,
            })
          }
          rows={2}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Food, medication, insect stings, or other allergies"
        />
        <p className="text-xs text-slate-400 mt-1 ml-1">
          Critical for emergency treatment - be specific
        </p>
      </div>

      {/* Current Medications */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Current Medications
        </label>
        <textarea
          value={formData.medical.medications}
          onChange={(e) =>
            onChange("medical", {
              ...formData.medical,
              medications: e.target.value,
            })
          }
          rows={2}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Regular medications, dosages, and frequency"
        />
      </div>

      {/* Doctor Information */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4">
          Doctor Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Doctor Name"
            name="doctorName"
            value={formData.medical.doctorName}
            onChange={(val) =>
              onChange("medical", { ...formData.medical, doctorName: val })
            }
            placeholder="Dr. John Smith"
            error={errors.doctorName}
          />
          <FormField
            label="Doctor Phone"
            name="doctorPhone"
            value={formData.medical.doctorPhone}
            onChange={(val) =>
              onChange("medical", { ...formData.medical, doctorPhone: val })
            }
            type="tel"
            placeholder="07 1234 5678"
            error={errors.doctorPhone}
          />
        </div>
      </div>

      {/* Health Insurance */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4">
          Health Insurance Information
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Health Fund Name"
              name="healthFundName"
              value={formData.medical.healthFundName}
              onChange={(val) =>
                onChange("medical", {
                  ...formData.medical,
                  healthFundName: val,
                })
              }
              placeholder="e.g., Bupa, Medibank, HCF"
              error={errors.healthFundName}
            />
            <FormField
              label="Health Fund Number"
              name="healthFundNumber"
              value={formData.medical.healthFundNumber}
              onChange={(val) =>
                onChange("medical", {
                  ...formData.medical,
                  healthFundNumber: val,
                })
              }
              placeholder="Policy/membership number"
              error={errors.healthFundNumber}
            />
          </div>
          <FormField
            label="Medicare Number"
            name="medicareNumber"
            value={formData.medical.medicareNumber}
            onChange={(val) =>
              onChange("medical", { ...formData.medical, medicareNumber: val })
            }
            placeholder="1234 56789 0 (with individual reference)"
            error={errors.medicareNumber}
          />
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <p className="text-xs text-blue-900 font-bold">
          🔒 <strong>Privacy:</strong> Medical information is encrypted and only
          accessible to authorized medical staff and coaches in emergency
          situations.
        </p>
      </div>
    </div>
  );
}
