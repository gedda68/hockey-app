// app/(website)/clubs/[clubId]/members/new/AddMemberForm.tsx
// COMPLETE FORM - All 5 Steps + Salutation + Edit Mode + Family Relationships

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, User, MapPin, Award, Heart, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { MemberDoc } from "@/types/api";
import type { AddMemberFormData, SocialMediaLink } from "./member-form-types";
import StepProgress, { Step } from "@/components/StepProgress";
import { Step1PersonalInfo } from "./Step1PersonalInfo";
import { Step2ContactAddress } from "./Step2ContactAddress";
import { Step3MembershipRoles } from "./Step3MembershipRoles";
import { Step4Healthcare } from "./Step4Healthcare";
import { Step5EmergencyFamily } from "./Step5EmergencyFamily";

// Config item types — replaces ad-hoc `any` casts for API config responses
interface RoleOption   { roleId: string; name: string; category?: string; displayOrder?: number }
interface GenderOption { genderId: string; name: string }
interface MembershipTypeOption { typeId: string; name: string; description?: string }
interface RelationshipTypeOption { typeId: string; name: string; forward: string; reverse: string }
interface HealthProviderOption { providerId: string; name: string }
interface SalutationOption { salutationId: string; name: string }
interface RelationshipOption {
  relationshipId: string;
  name: string;
}

interface AddMemberFormProps {
  clubId: string;
  mode?: "create" | "edit";
  initialData?: Partial<AddMemberFormData> & { memberId?: string };
  onSuccess?: (member: MemberResult) => void;
}

interface MemberResult {
  memberId: string;
  personalInfo: { firstName: string; lastName: string; displayName?: string };
}

export default function AddMemberForm({
  clubId,
  mode = "create",
  initialData,
  onSuccess,
}: AddMemberFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [hasFamilyMembers, setHasFamilyMembers] = useState(false);
  const [hasMedicare, setHasMedicare] = useState(false);
  const [hasPrivateHealth, setHasPrivateHealth] = useState(false);

  // Config data from database
  const [salutations, setSalutations] = useState<SalutationOption[]>([]);
  const [genders, setGenders] = useState<GenderOption[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [relationships, setRelationships] = useState<RelationshipOption[]>([]);
  const [healthProviders, setHealthProviders] = useState<HealthProviderOption[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipTypeOption[]>([]);
  const [searchResults, setSearchResults] = useState<Record<number, MemberDoc[]>>({});

  // Get initial form data based on mode
  const getInitialFormData = (): AddMemberFormData => {
    if (mode === "edit" && initialData) {
      return {
        personalInfo: initialData.personalInfo || {
          salutation: "",
          firstName: "",
          lastName: "",
          displayName: "",
          dateOfBirth: "",
          gender: "",
          photoUrl: null,
        },
        contact: initialData.contact || {
          primaryEmail: "",
          emailOwnership: "Own",
          phone: "",
          mobile: "",
        },
        address: initialData.address || {
          street: "",
          suburb: "",
          state: "QLD",
          postcode: "",
          country: "Australia",
        },
        healthcare: initialData.healthcare || {
          medicare: null,
          privateHealth: null,
        },
        emergencyContacts: initialData.emergencyContacts || [],
        membership: initialData.membership || {
          membershipType: "",
          status: "Active",
          joinDate: new Date().toISOString().split("T")[0],
        },
        roles: initialData.roles || [],
        playerInfo: initialData.playerInfo || null,
        medical: initialData.medical || {
          conditions: "",
          medications: "",
          allergies: "",
        },
        familyRelationships: initialData.familyRelationships || [],
        socialMedia: initialData.socialMedia || [],
      };
    }

    return {
      personalInfo: {
        salutation: "",
        firstName: "",
        lastName: "",
        displayName: "",
        dateOfBirth: "",
        gender: "",
        photoUrl: null,
      },
      contact: {
        primaryEmail: "",
        emailOwnership: "Own",
        phone: "",
        mobile: "",
      },
      address: {
        street: "",
        suburb: "",
        state: "QLD",
        postcode: "",
        country: "Australia",
      },
      healthcare: {
        medicare: null,
        privateHealth: null,
      },
      emergencyContacts: [],
      membership: {
        membershipType: "",
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0],
      },
      roles: [],
      playerInfo: null,
      medical: {
        conditions: "",
        medications: "",
        allergies: "",
      },
      familyRelationships: [],
      socialMedia: [],
    };
  };

  const [formData, setFormData] = useState<AddMemberFormData>(getInitialFormData());
  const [socialMedia, setSocialMedia] = useState<SocialMediaLink[]>(
    initialData?.socialMedia || [],
  );

  // Load initial data for edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      if (initialData.personalInfo?.photoUrl) {
        setPhotoPreview(initialData.personalInfo.photoUrl);
      }
      setHasFamilyMembers((initialData.familyRelationships?.length ?? 0) > 0);
      setHasMedicare(!!initialData.healthcare?.medicare);
      setHasPrivateHealth(!!initialData.healthcare?.privateHealth);
    }
  }, [mode, initialData]);

  // Fetch config data
  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setIsLoadingConfig(true);
    try {
      const [
        salutationsRes,
        gendersRes,
        typesRes,
        rolesRes,
        relsRes,
        healthRes,
        relTypesRes,
      ] = await Promise.all([
        fetch("/api/admin/global-config/salutations?activeOnly=true"),
        fetch("/api/admin/config/gender?activeOnly=true"),
        fetch("/api/admin/club-membership-types?activeOnly=true"),
        fetch("/api/admin/club-roles?activeOnly=true"),
        fetch("/api/admin/config/relationships?activeOnly=true"),
        fetch("/api/admin/private-health-providers?activeOnly=true"),
        fetch("/api/admin/relationship-types?activeOnly=true"),
      ]);

      const [
        salutationsData,
        gendersData,
        typesData,
        rolesData,
        relsData,
        healthData,
        relTypesData,
      ] = await Promise.all([
        salutationsRes.json(),
        gendersRes.json(),
        typesRes.json(),
        rolesRes.json(),
        relsRes.json(),
        healthRes.json(),
        relTypesRes.json(),
      ]);

      setSalutations(salutationsData);
      setGenders(gendersData);
      setMembershipTypes(typesData);
      setRoles(rolesData);
      setRelationships(
        (relsData as Array<{
          id?: string;
          relationshipId?: string;
          name: string;
        }>).map((r) => ({
          relationshipId: r.relationshipId ?? r.id ?? "",
          name: r.name,
        })),
      );
      setHealthProviders(healthData);
      setRelationshipTypes(relTypesData);

      console.log("✅ Config loaded:", {
        salutations: salutationsData.length,
        genders: gendersData.length,
        membershipTypes: typesData.length,
        roles: rolesData.length,
        relationships: relsData.length,
        healthProviders: healthData.length,
        relationshipTypes: relTypesData.length,
      });
    } catch (error) {
      toast.error("Failed to load form configuration", {
        description: "Please refresh the page.",
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Photo handlers
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large — maximum size is 5 MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mode === "edit") {
      setFormData((prev) => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, photoUrl: null },
      }));
    }
  };

  // Role handlers
  const toggleRole = (roleId: string) => {
    const newRoles = formData.roles.includes(roleId)
      ? formData.roles.filter((r) => r !== roleId)
      : [...formData.roles, roleId];

    setFormData((prev) => ({ ...prev, roles: newRoles }));

    const playerRole = roles.find((r) => r.name === "Player");
    if (
      playerRole &&
      !newRoles.includes(playerRole.roleId) &&
      formData.playerInfo
    ) {
      setFormData((prev) => ({ ...prev, playerInfo: null }));
    } else if (
      playerRole &&
      newRoles.includes(playerRole.roleId) &&
      !formData.playerInfo
    ) {
      setFormData((prev) => ({
        ...prev,
        playerInfo: { jerseyNumber: "", position: "" },
      }));
    }
  };

  // Emergency contact handlers
  const addEmergencyContact = () => {
    if (formData.emergencyContacts.length >= 3) {
      toast.warning("Maximum 3 emergency contacts allowed");
      return;
    }
    setFormData({
      ...formData,
      emergencyContacts: [
        ...formData.emergencyContacts,
        {
          contactId: `emerg-${Date.now()}`,
          priority: formData.emergencyContacts.length + 1,
          name: "",
          relationship: "",
          phone: "",
          mobile: "",
          email: "",
        },
      ],
    });
  };

  const removeEmergencyContact = (index: number) => {
    const updated = formData.emergencyContacts.filter((_, i) => i !== index);
    updated.forEach((contact, i) => {
      contact.priority = i + 1;
    });
    setFormData({ ...formData, emergencyContacts: updated });
  };

  const updateEmergencyContact = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...formData.emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, emergencyContacts: updated });
  };

  // Family relationship handlers
  const addFamilyRelationship = () => {
    setFormData({
      ...formData,
      familyRelationships: [
        ...formData.familyRelationships,
        {
          relationshipId: `famrel-${Date.now()}`,
          relatedMemberId: "",
          relationshipType: "",
          forwardRelation: "",
          reverseRelation: "",
          searchQuery: "",
        },
      ],
    });
  };

  const removeFamilyRelationship = (index: number) => {
    const updated = formData.familyRelationships.filter((_, i) => i !== index);
    setFormData({ ...formData, familyRelationships: updated });
  };

  const updateFamilyRelationship = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...formData.familyRelationships];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "relationshipType") {
      const relType = relationshipTypes.find((rt) => rt.typeId === value);
      if (relType) {
        updated[index].forwardRelation = relType.forward;
        updated[index].reverseRelation = relType.reverse;
      }
    }

    setFormData({ ...formData, familyRelationships: updated });
  };

  const searchMembers = async (query: string, index: number) => {
    if (query.length < 2) return;
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/search?q=${query}`);
      const results = await res.json();
      setSearchResults((prev) => ({ ...prev, [index]: results }));
    } catch (error) {
      console.error("Error searching members:", error);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // ADDED: Stop event propagation

    // ⚠️ VALIDATION 1: Check if emergency contacts exist
    if (formData.emergencyContacts.length === 0) {
      toast.warning("Emergency contact required", {
        description: 'Go to Step 5 and click "Add Emergency Contact".',
      });
      setCurrentStep(5);
      return false;
    }

    // ⚠️ VALIDATION 2: Check if emergency contacts are complete
    const invalidContacts = formData.emergencyContacts.filter(
      (c) => !c.name?.trim() || !c.relationship || !c.phone?.trim(),
    );

    if (invalidContacts.length > 0) {
      toast.warning("Incomplete emergency contact details", {
        description: `Name, relationship and phone are required. Missing in ${invalidContacts.length} contact(s).`,
      });
      setCurrentStep(5);
      return false;
    }

    setIsLoading(true);

    try {
      const memberIdForEdit =
        mode !== "create" ? initialData?.memberId : undefined;
      if (mode !== "create" && !memberIdForEdit) {
        toast.error("Cannot update: missing member ID");
        setIsLoading(false);
        return;
      }

      let photoUrl = formData.personalInfo.photoUrl;
      if (photoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", photoFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          photoUrl = url;
        }
      }

      const memberData = {
        ...formData,
        personalInfo: {
          ...formData.personalInfo,
          displayName:
            formData.personalInfo.displayName ||
            `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`,
          photoUrl,
          socialMedia,
        },
      };


      const url =
        mode === "create"
          ? `/api/clubs/${clubId}/members`
          : `/api/clubs/${clubId}/members/${memberIdForEdit}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${mode} member`);
      }

      const member = await res.json();

      if (mode === "create") {
        toast.success("Member created successfully!", {
          description: `${member.personalInfo.firstName} ${member.personalInfo.lastName} — ID: ${member.memberId}`,
        });
      } else {
        toast.success("Member updated successfully!", {
          description: `${member.personalInfo.firstName} ${member.personalInfo.lastName}'s information has been saved.`,
        });
      }

      // Delay navigation to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(member);
        } else {
          router.push(`/clubs/${clubId}/members`);
        }
      }, 2000);
    } catch (error: unknown) {
      toast.error(mode === "create" ? "Failed to create member" : "Failed to update member", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalSteps = 5;

  const steps: Step[] = [
    { num: 1, title: "Personal Info", icon: User },
    { num: 2, title: "Contact & Address", icon: MapPin },
    { num: 3, title: "Membership & Roles", icon: Award },
    { num: 4, title: "Healthcare", icon: Heart },
    { num: 5, title: "Emergency & Family", icon: Users },
  ];

  const handleStepClick = (stepNum: number) => {
    // Only allow navigation in edit mode
    if (mode === "edit") {
      setCurrentStep(stepNum);
    }
  };

  const rolesByCategory = roles.reduce((acc: Record<string, RoleOption[]>, role) => {
    const category = role.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(role);
    return acc;
  }, {});

  if (isLoadingConfig) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#06054e] mx-auto mb-4"></div>
        <p className="text-lg font-bold text-slate-600">
          Loading form configuration...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Progress */}
      <StepProgress
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        mode={mode}
      />


      {/* STEP 1: Personal Information */}
      {currentStep === 1 && (
        <Step1PersonalInfo
          formData={formData}
          setFormData={setFormData}
          salutations={salutations}
          genders={genders}
          photoPreview={photoPreview}
          fileInputRef={fileInputRef}
          handlePhotoChange={handlePhotoChange}
          removePhoto={removePhoto}
        />
      )}

      {/* STEP 2: Contact & Address */}
      {currentStep === 2 && (
        <Step2ContactAddress
          formData={formData}
          setFormData={setFormData}
          socialMedia={socialMedia}
          setSocialMedia={setSocialMedia}
        />
      )}

      {/* STEP 3: Membership & Roles */}
      {currentStep === 3 && (
        <Step3MembershipRoles
          formData={formData}
          setFormData={setFormData}
          membershipTypes={membershipTypes}
          roles={roles}
          rolesByCategory={rolesByCategory}
          toggleRole={toggleRole}
        />
      )}

      {/* STEP 4: Healthcare */}
      {currentStep === 4 && (
        <Step4Healthcare
          formData={formData}
          setFormData={setFormData}
          healthProviders={healthProviders}
          hasMedicare={hasMedicare}
          setHasMedicare={setHasMedicare}
          hasPrivateHealth={hasPrivateHealth}
          setHasPrivateHealth={setHasPrivateHealth}
        />
      )}

      {/* STEP 5: Emergency Contacts & Family */}
      {currentStep === 5 && (
        <Step5EmergencyFamily
          formData={formData}
          setFormData={setFormData}
          relationships={relationships}
          relationshipTypes={relationshipTypes}
          hasFamilyMembers={hasFamilyMembers}
          setHasFamilyMembers={setHasFamilyMembers}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          addEmergencyContact={addEmergencyContact}
          removeEmergencyContact={removeEmergencyContact}
          updateEmergencyContact={updateEmergencyContact}
          addFamilyRelationship={addFamilyRelationship}
          removeFamilyRelationship={removeFamilyRelationship}
          updateFamilyRelationship={updateFamilyRelationship}
          searchMembers={searchMembers}
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-all"
            >
              <ArrowLeft size={20} />
              Previous
            </button>
          )}
          {currentStep === 1 && (
            <Link
              href={`/clubs/${clubId}/members`}
              className="flex items-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-all"
            >
              <ArrowLeft size={20} />
              Cancel
            </Link>
          )}
        </div>

        <div className="flex gap-3">
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 3 && formData.roles.length === 0) {
                  toast.warning("Please select at least one role");
                  return;
                }
                setCurrentStep(currentStep + 1);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
            >
              Next
              <ArrowLeft size={20} className="rotate-180" />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-4">
              {/* Warning text if no emergency contacts */}
              {formData.emergencyContacts.length === 0 && (
                <div className="text-red-600 text-sm font-bold">
                  ⚠️ Add at least one emergency contact
                </div>
              )}

              <div className="flex items-center gap-4 ml-auto">
                {/* Cancel Button (only in edit mode) */}
                {mode === "edit" && (
                  <Link
                    href={`/clubs/${clubId}/members/${initialData?.memberId}`}
                    className="px-6 py-3 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </Link>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading || formData.emergencyContacts.length === 0
                  }
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all ${
                    formData.emergencyContacts.length === 0
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={
                    formData.emergencyContacts.length === 0
                      ? "Add at least one emergency contact first"
                      : ""
                  }
                >
                  <Save size={20} />
                  {isLoading
                    ? mode === "create"
                      ? "Creating..."
                      : "Updating..."
                    : formData.emergencyContacts.length === 0
                      ? "⚠️ Add Emergency Contact First"
                      : mode === "create"
                        ? "Create Member"
                        : "Update Member"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
