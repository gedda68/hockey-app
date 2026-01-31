// components/registration/PersonalDetailsStep.tsx
// Step 2: Personal details form with auto-fill support

"use client";

import { useState, useEffect } from "react";
import { User, ChevronRight, ChevronLeft } from "lucide-react";

interface PersonalDetailsStepProps {
  suggestedData?: any;
  isReturningPlayer: boolean;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function PersonalDetailsStep({
  suggestedData,
  isReturningPlayer,
  onComplete,
  onBack,
}: PersonalDetailsStepProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    mobile: "",

    // Address
    street: "",
    suburb: "",
    city: "",
    state: "QLD",
    postcode: "",
    country: "Australia",

    // Emergency contact
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    emergencyAlternate: "",

    // Medical
    medicalConditions: "",
    medications: "",
    allergies: "",
    doctorName: "",
    doctorPhone: "",
    healthFund: "",
    healthFundNumber: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill from suggested data
  useEffect(() => {
    if (suggestedData) {
      setFormData({
        firstName: suggestedData.personalInfo?.firstName || "",
        lastName: suggestedData.personalInfo?.lastName || "",
        dateOfBirth: suggestedData.personalInfo?.dateOfBirth || "",
        gender: suggestedData.personalInfo?.gender || "",
        phone: suggestedData.personalInfo?.phone || "",
        mobile: suggestedData.personalInfo?.mobile || "",

        street: suggestedData.address?.street || "",
        suburb: suggestedData.address?.suburb || "",
        city: suggestedData.address?.city || "",
        state: suggestedData.address?.state || "QLD",
        postcode: suggestedData.address?.postcode || "",
        country: suggestedData.address?.country || "Australia",

        emergencyName: suggestedData.emergencyContact?.name || "",
        emergencyRelationship:
          suggestedData.emergencyContact?.relationship || "",
        emergencyPhone: suggestedData.emergencyContact?.phone || "",
        emergencyAlternate:
          suggestedData.emergencyContact?.alternatePhone || "",

        medicalConditions: suggestedData.medicalInfo?.conditions || "",
        medications: suggestedData.medicalInfo?.medications || "",
        allergies: suggestedData.medicalInfo?.allergies || "",
        doctorName: suggestedData.medicalInfo?.doctorName || "",
        doctorPhone: suggestedData.medicalInfo?.doctorPhone || "",
        healthFund: suggestedData.medicalInfo?.healthFundProvider || "",
        healthFundNumber: suggestedData.medicalInfo?.healthFundNumber || "",
      });
    }
  }, [suggestedData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
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

    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";

    if (!formData.street) newErrors.street = "Street address is required";
    if (!formData.suburb) newErrors.suburb = "Suburb is required";
    if (!formData.postcode) newErrors.postcode = "Postcode is required";

    if (!formData.emergencyName)
      newErrors.emergencyName = "Emergency contact name is required";
    if (!formData.emergencyPhone)
      newErrors.emergencyPhone = "Emergency contact phone is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onComplete({
      personalInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
        mobile: formData.mobile,
      },
      address: {
        street: formData.street,
        suburb: formData.suburb,
        city: formData.city || formData.suburb,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
      },
      emergencyContact: {
        name: formData.emergencyName,
        relationship: formData.emergencyRelationship,
        phone: formData.emergencyPhone,
        alternatePhone: formData.emergencyAlternate,
      },
      medicalInfo: {
        conditions: formData.medicalConditions,
        medications: formData.medications,
        allergies: formData.allergies,
        doctorName: formData.doctorName,
        doctorPhone: formData.doctorPhone,
        healthFundProvider: formData.healthFund,
        healthFundNumber: formData.healthFundNumber,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#06054e] text-white flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">
              Personal Details
            </h1>
            <p className="text-lg text-slate-600 font-bold mt-1">
              Step 2:{" "}
              {isReturningPlayer
                ? "Review and update your details"
                : "Tell us about yourself"}
            </p>
          </div>
        </div>

        {isReturningPlayer && (
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <p className="text-sm font-bold text-green-700">
              ✓ We've pre-filled your details from last season. Please review
              and update if needed.
            </p>
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                First Name <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.firstName ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.firstName && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Last Name <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.lastName ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.lastName && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.lastName}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Date of Birth <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.dateOfBirth ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Gender <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["male", "female"].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => handleChange("gender", gender)}
                  className={`px-4 py-3 rounded-xl font-bold transition-all capitalize ${
                    formData.gender === gender
                      ? "bg-[#06054e] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
            {errors.gender && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.gender}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Phone <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="0400 123 456"
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.phone ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.phone && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Mobile (optional)
              </span>
            </label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => handleChange("mobile", e.target.value)}
              placeholder="0400 123 456"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">Address</h2>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Street Address <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => handleChange("street", e.target.value)}
              placeholder="123 Main Street"
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.street ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.street && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.street}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-black uppercase text-slate-600">
                  Suburb <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.suburb}
                onChange={(e) => handleChange("suburb", e.target.value)}
                placeholder="Brisbane"
                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                  errors.suburb ? "border-red-500" : "border-slate-200"
                }`}
              />
              {errors.suburb && (
                <p className="text-sm text-red-600 font-bold mt-1">
                  {errors.suburb}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-black uppercase text-slate-600">
                  State
                </span>
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              >
                <option value="QLD">QLD</option>
                <option value="NSW">NSW</option>
                <option value="VIC">VIC</option>
                <option value="SA">SA</option>
                <option value="WA">WA</option>
                <option value="TAS">TAS</option>
                <option value="NT">NT</option>
                <option value="ACT">ACT</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-black uppercase text-slate-600">
                  Postcode <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => handleChange("postcode", e.target.value)}
                placeholder="4000"
                maxLength={4}
                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                  errors.postcode ? "border-red-500" : "border-slate-200"
                }`}
              />
              {errors.postcode && (
                <p className="text-sm text-red-600 font-bold mt-1">
                  {errors.postcode}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">
          Emergency Contact
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Name <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formData.emergencyName}
              onChange={(e) => handleChange("emergencyName", e.target.value)}
              placeholder="Jane Smith"
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.emergencyName ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.emergencyName && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.emergencyName}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Relationship
              </span>
            </label>
            <input
              type="text"
              value={formData.emergencyRelationship}
              onChange={(e) =>
                handleChange("emergencyRelationship", e.target.value)
              }
              placeholder="Mother, Father, Partner, etc."
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Phone <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="tel"
              value={formData.emergencyPhone}
              onChange={(e) => handleChange("emergencyPhone", e.target.value)}
              placeholder="0400 789 012"
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
                errors.emergencyPhone ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.emergencyPhone && (
              <p className="text-sm text-red-600 font-bold mt-1">
                {errors.emergencyPhone}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Alternate Phone (optional)
              </span>
            </label>
            <input
              type="tel"
              value={formData.emergencyAlternate}
              onChange={(e) =>
                handleChange("emergencyAlternate", e.target.value)
              }
              placeholder="0400 789 013"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">
          Medical Information
        </h2>
        <p className="text-sm font-bold text-slate-600 mb-6">
          This information is confidential and will only be used in case of
          emergency
        </p>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block mb-2">
              <span className="text-sm font-black uppercase text-slate-600">
                Medical Conditions
              </span>
            </label>
            <textarea
              value={formData.medicalConditions}
              onChange={(e) =>
                handleChange("medicalConditions", e.target.value)
              }
              placeholder="E.g., Asthma, Diabetes, etc."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-black uppercase text-slate-600">
                  Current Medications
                </span>
              </label>
              <input
                type="text"
                value={formData.medications}
                onChange={(e) => handleChange("medications", e.target.value)}
                placeholder="E.g., Ventolin, etc."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              />
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-black uppercase text-slate-600">
                  Allergies
                </span>
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => handleChange("allergies", e.target.value)}
                placeholder="E.g., Peanuts, Penicillin, etc."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            Continue
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
