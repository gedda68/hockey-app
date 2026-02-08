// app/(admin)/admin/members/create/page.tsx
"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Heart,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Step Components (will import these)
import PersonalInfoStep from "@/components/admin/members/wizard/PersonalInfoStep";
import ContactInfoStep from "@/components/admin/members/wizard/ContactInfoStep";
import EmergencyContactStep from "@/components/admin/members/wizard/EmergencyContactStep";
import AddressStep from "@/components/admin/members/wizard/AddressStep";
import MembershipStep from "@/components/admin/members/wizard/MembershipStep";
import MedicalStep from "@/components/admin/members/wizard/MedicalStep";
import ReviewStep from "@/components/admin/members/wizard/ReviewStep";

const STEPS = [
  {
    id: 1,
    title: "Personal Info",
    icon: User,
    description: "Basic information",
  },
  { id: 2, title: "Contact", icon: Mail, description: "Contact details" },
  { id: 3, title: "Emergency", icon: Phone, description: "Emergency contact" },
  { id: 4, title: "Address", icon: MapPin, description: "Location details" },
  {
    id: 5,
    title: "Membership",
    icon: CreditCard,
    description: "Membership & roles",
  },
  { id: 6, title: "Medical", icon: Heart, description: "Medical information" },
  { id: 7, title: "Review", icon: CheckCircle, description: "Review & submit" },
];

export default function CreateMemberPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clubId: "club-commercial-hc", // TODO: Get from user context
    associationId: "",
    personalInfo: {
      salutation: "",
      firstName: "",
      lastName: "",
      displayName: "",
      dateOfBirth: "",
      gender: "",
      photoUrl: "",
    },
    contact: {
      email: "",
      phone: "",
      mobile: "",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
    },
    address: {
      street: "",
      suburb: "",
      state: "QLD",
      postcode: "",
      country: "Australia",
    },
    membership: {
      clubId: "",
      joinDate: new Date().toISOString().split("T")[0],
      membershipTypes: [] as string[],
      status: "Active" as const,
    },
    roles: [] as string[],
    teams: [] as any[],
    medical: {
      conditions: "",
      medications: "",
      allergies: "",
      doctorName: "",
      doctorPhone: "",
      healthcareCard: {
        number: "",
        expiryDate: "",
      },
    },
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (section: string, data: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        ...data,
      },
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Personal Info
        if (!formData.personalInfo.firstName.trim()) {
          newErrors.firstName = "First name is required";
        }
        if (!formData.personalInfo.lastName.trim()) {
          newErrors.lastName = "Last name is required";
        }
        if (!formData.personalInfo.dateOfBirth) {
          newErrors.dateOfBirth = "Date of birth is required";
        }
        if (!formData.personalInfo.gender) {
          newErrors.gender = "Gender is required";
        }
        break;

      case 2: // Contact Info
        if (!formData.contact.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email)) {
          newErrors.email = "Invalid email format";
        }
        break;

      case 3: // Emergency Contact
        if (!formData.contact.emergencyContact.name.trim()) {
          newErrors.emergencyName = "Emergency contact name is required";
        }
        if (!formData.contact.emergencyContact.relationship) {
          newErrors.emergencyRelationship = "Relationship is required";
        }
        if (!formData.contact.emergencyContact.phone.trim()) {
          newErrors.emergencyPhone = "Emergency contact phone is required";
        }
        break;

      case 4: // Address
        if (!formData.address.street.trim()) {
          newErrors.street = "Street address is required";
        }
        if (!formData.address.suburb.trim()) {
          newErrors.suburb = "Suburb is required";
        }
        if (!formData.address.state) {
          newErrors.state = "State is required";
        }
        if (!formData.address.postcode.trim()) {
          newErrors.postcode = "Postcode is required";
        } else if (!/^\d{4}$/.test(formData.address.postcode)) {
          newErrors.postcode = "Postcode must be 4 digits";
        }
        break;

      case 5: // Membership
        if (formData.membership.membershipTypes.length === 0) {
          newErrors.membershipTypes =
            "At least one membership type is required";
        }
        break;

      case 6: // Medical (optional - no validation)
        break;

      case 7: // Review (no validation)
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(7, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    // 1. Validation check
    if (!validateStep(currentStep)) {
      toast.error("Please review all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // 2. Parse JSON once and check for errors immediately
      const data = await res
        .json()
        .catch(() => ({ error: "Invalid server response" }));

      if (!res.ok) {
        throw new Error(data.error || "Failed to create member");
      }

      // 3. Success path
      toast.success("Member created successfully!");
      router.push(`/admin/members/${data.member.memberId}`);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Connection failed");
      // 4. CRITICAL: Always reset the button if we aren't redirecting
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/members"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Members
          </Link>
          <div className="text-sm text-slate-600 font-bold">
            Step {currentStep} of {STEPS.length}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-black transition-all ${
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                          ? "bg-[#06054e] text-white ring-4 ring-yellow-400"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle size={24} />
                    ) : (
                      <step.icon size={24} />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-black uppercase ${
                        currentStep >= step.id
                          ? "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all ${
                      currentStep > step.id ? "bg-green-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#06054e] uppercase flex items-center gap-3">
              {(() => {
                const step = STEPS[currentStep - 1];
                return (
                  <>
                    <step.icon size={32} className="text-yellow-500" />
                    {step.title}
                  </>
                );
              })()}
            </h2>
            <p className="text-slate-600 mt-1 font-bold">
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          {/* Render current step */}
          {currentStep === 1 && (
            <PersonalInfoStep
              data={formData.personalInfo}
              onChange={(data) => updateFormData("personalInfo", data)}
              errors={errors}
            />
          )}
          {currentStep === 2 && (
            <ContactInfoStep
              data={formData.contact}
              onChange={(data) => updateFormData("contact", data)}
              errors={errors}
            />
          )}
          {currentStep === 3 && (
            <EmergencyContactStep
              data={formData.contact.emergencyContact}
              onChange={(data) =>
                updateFormData("contact", { emergencyContact: data })
              }
              errors={errors}
            />
          )}
          {currentStep === 4 && (
            <AddressStep
              data={formData.address}
              onChange={(data) => updateFormData("address", data)}
              errors={errors}
            />
          )}
          {currentStep === 5 && (
            <MembershipStep
              membershipData={formData.membership}
              roles={formData.roles}
              onMembershipChange={(data) => updateFormData("membership", data)}
              onRolesChange={(roles) =>
                setFormData((prev) => ({ ...prev, roles }))
              }
              // FIX: Update BOTH the top-level clubId and the membership nested clubId
              onClubChange={(clubId) => {
                setFormData((prev) => ({
                  ...prev,
                  clubId: clubId, // Top level for easy access
                  membership: {
                    ...prev.membership,
                    clubId: clubId, // Nested if your API looks here
                  },
                }));
              }}
              errors={errors}
            />
          )}

          {currentStep === 6 && (
            <MedicalStep
              data={formData.medical}
              onChange={(data) => updateFormData("medical", data)}
              errors={errors}
            />
          )}
          {currentStep === 7 && (
            <ReviewStep
              formData={formData}
              onEdit={(step) => setCurrentStep(step)}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={20} />
            Previous
          </button>

          {currentStep < 7 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
            >
              Next
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Create Member
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
