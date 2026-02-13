// app/(website)/clubs/[clubId]/members/new/AddMemberForm.tsx
// COMPLETE FORM - All 5 Steps + Salutation + Edit Mode + Family Relationships

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Users,
  Shield,
  Upload,
  X,
  Camera,
  Save,
  ArrowLeft,
  Award,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import TypeAheadSelect from "@/components/admin/TypeAheadSelect";
import { useCustomAlert } from "@/components/ui/CustomAlert";
import SocialMediaEditor from "@/components/member-sections/SocialMediaEditor";
import StepProgress, { Step } from "@/components/member-sections/StepProgress";

interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

interface AddMemberFormProps {
  clubId: string;
  mode?: "create" | "edit";
  initialData?: any;
  onSuccess?: (member: any) => void;
}

interface FormData {
  personalInfo: {
    salutation: string;
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
    photoUrl: string | null;
  };
  contact: {
    primaryEmail: string;
    emailOwnership: string;
    phone: string;
    mobile: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  healthcare: {
    medicare: {
      number: string;
      position: string;
      expiryMonth: string;
      expiryYear: string;
    } | null;
    privateHealth: {
      provider: string;
      membershipNumber: string;
      expiryDate: string;
    } | null;
  };
  emergencyContacts: Array<{
    contactId: string;
    priority: number;
    name: string;
    relationship: string;
    phone: string;
    mobile: string;
    email: string;
  }>;
  membership: {
    membershipType: string;
    status: string;
    joinDate: string;
  };
  roles: string[];
  playerInfo: {
    jerseyNumber: string;
    position: string;
  } | null;
  medical: {
    conditions: string;
    medications: string;
    allergies: string;
  };
  familyRelationships: Array<{
    relationshipId: string;
    relatedMemberId: string;
    relationshipType: string;
    forwardRelation: string;
    reverseRelation: string;
    searchQuery: string;
  }>;
  socialMedia: SocialMediaLink[];
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
  const { showAlert, AlertComponent } = useCustomAlert();

  // Config data from database
  const [salutations, setSalutations] = useState([]);
  const [genders, setGenders] = useState([]);
  const [membershipTypes, setMembershipTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [healthProviders, setHealthProviders] = useState([]);
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [searchResults, setSearchResults] = useState<any>({});

  // Get initial form data based on mode
  const getInitialFormData = (): FormData => {
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
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [socialMedia, setSocialMedia] = useState<SocialMediaLink[]>(
    initialData?.socialMedia || [],
  );

  // Load initial data for edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      if (initialData.personalInfo?.photoUrl) {
        setPhotoPreview(initialData.personalInfo.photoUrl);
      }
      setHasFamilyMembers(initialData.familyRelationships?.length > 0);
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
      setRelationships(relsData);
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
      console.error("Error fetching config:", error);
      showAlert(
        "error",
        "Loading Error",
        "Failed to load form configuration.\n\nPlease refresh the page.",
      );
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Photo handlers
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert(
          "error",
          "File Too Large",
          "Maximum file size is 5MB.\n\nPlease choose a smaller image.",
        );
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

    const playerRole = roles.find((r: any) => r.name === "Player");
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
      showAlert(
        "warning",
        "Maximum Contacts Reached",
        "You can add up to 3 emergency contacts.",
      );
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
    value: any,
  ) => {
    const updated = [...formData.familyRelationships];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "relationshipType") {
      const relType = relationshipTypes.find((rt: any) => rt.typeId === value);
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

    console.log("🔍 Form submitted - validating emergency contacts...");
    console.log("Emergency contacts count:", formData.emergencyContacts.length);

    // ⚠️ VALIDATION 1: Check if emergency contacts exist
    if (formData.emergencyContacts.length === 0) {
      console.error("❌ VALIDATION FAILED: No emergency contacts");
      showAlert(
        "warning",
        "Emergency Contact Required",
        'Please add at least one emergency contact before creating the member.\n\nGo to Step 5 and click "Add Emergency Contact".',
      );
      setCurrentStep(5);
      return false; // EXPLICIT return false
    }

    // ⚠️ VALIDATION 2: Check if emergency contacts are complete
    const invalidContacts = formData.emergencyContacts.filter(
      (c) => !c.name?.trim() || !c.relationship || !c.phone?.trim(),
    );

    if (invalidContacts.length > 0) {
      console.error(
        "❌ VALIDATION FAILED: Incomplete contacts:",
        invalidContacts.length,
      );
      showAlert(
        "warning",
        "Incomplete Contact Information",
        `Please complete all required fields for emergency contacts:\n\n• Name\n• Relationship\n• Phone\n\nMissing information in ${invalidContacts.length} contact(s).`,
      );
      setCurrentStep(5);
      return false; // EXPLICIT return false
    }

    console.log("✅ VALIDATION PASSED: Emergency contacts are valid");
    console.log("Proceeding with member creation...");

    setIsLoading(true);

    try {
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

      console.log("📤 Sending member data to API...");

      const url =
        mode === "create"
          ? `/api/clubs/${clubId}/members`
          : `/api/clubs/${clubId}/members/${initialData.memberId}`;

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

      console.log("✅ Member saved successfully:", member.memberId);

      // Success Alert
      if (mode === "create") {
        showAlert(
          "success",
          "Member Created Successfully!",
          `Member ID: ${member.memberId}\n\n${member.personalInfo.firstName} ${member.personalInfo.lastName} has been added to the club.`,
        );
      } else {
        showAlert(
          "success",
          "Member Updated Successfully!",
          `${member.personalInfo.firstName} ${member.personalInfo.lastName}'s information has been updated.`,
        );
      }

      // Delay navigation to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(member);
        } else {
          router.push(`/clubs/${clubId}/members`);
        }
      }, 2000);
    } catch (error: any) {
      console.error(`❌ Error ${mode}ing member:`, error);
      showAlert(
        "error",
        mode === "create"
          ? "Failed to Create Member"
          : "Failed to Update Member",
        `${error.message}\n\nPlease check your information and try again.`,
      );
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

  const rolesByCategory = roles.reduce((acc: any, role: any) => {
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
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
            <User size={24} />
            Personal Information
          </h2>

          {/* Profile Picture */}
          <div className="mb-8">
            <label className="text-xs font-black uppercase text-slate-400 ml-2">
              Profile Picture (Optional)
            </label>
            <div className="mt-2 flex items-center gap-6">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                  <Camera size={32} className="text-slate-400" />
                </div>
              )}

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all"
                >
                  <Upload size={18} />
                  {photoPreview ? "Change Photo" : "Upload Photo"}
                </button>
                <p className="text-xs text-slate-500 mt-2">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Salutation - Type Ahead */}
            <div>
              <TypeAheadSelect
                label="Salutation"
                options={salutations}
                value={formData.personalInfo.salutation}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      salutation: value,
                    },
                  })
                }
                displayField="name"
                valueField="id"
                fullNameField="fullName"
                placeholder="Mr, Mrs, Dr..."
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.personalInfo.firstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      firstName: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                placeholder="John"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.personalInfo.lastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      lastName: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                placeholder="Smith"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      dateOfBirth: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Gender *
              </label>
              <select
                required
                value={formData.personalInfo.gender}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      gender: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              >
                <option value="">Select gender</option>
                {genders.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Contact & Address */}
      {currentStep === 2 && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
            <Mail size={24} />
            Contact & Address
          </h2>

          <div className="space-y-6">
            {/* Contact Section */}
            <div>
              <h3 className="text-lg font-black text-slate-700 mb-4">
                Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contact.primaryEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: {
                          ...formData.contact,
                          primaryEmail: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="john.smith@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Email Ownership
                  </label>
                  <select
                    value={formData.contact.emailOwnership}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: {
                          ...formData.contact,
                          emailOwnership: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  >
                    <option value="Own">Own</option>
                    <option value="Shared">Shared</option>
                    <option value="Parent">Parent/Guardian</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone: e.target.value },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="07 3123 4567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.contact.mobile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: {
                          ...formData.contact,
                          mobile: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="0411 111 111"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="text-lg font-black text-slate-700 mb-4">
                Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          street: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Suburb
                  </label>
                  <input
                    type="text"
                    value={formData.address.suburb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          suburb: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="Brisbane"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    State
                  </label>
                  <select
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  >
                    <option value="QLD">Queensland</option>
                    <option value="NSW">New South Wales</option>
                    <option value="VIC">Victoria</option>
                    <option value="SA">South Australia</option>
                    <option value="WA">Western Australia</option>
                    <option value="TAS">Tasmania</option>
                    <option value="NT">Northern Territory</option>
                    <option value="ACT">Australian Capital Territory</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.address.postcode}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow 4 digits for Australian postcodes
                      if (value === "" || /^\d{0,4}$/.test(value)) {
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            postcode: value,
                          },
                        });
                      }
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="4000"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          country: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="Australia"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Media Section */}
      {currentStep === 2 && (
        <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 mt-6">
          <SocialMediaEditor
            socialMedia={socialMedia}
            onChange={setSocialMedia}
            readOnly={false}
          />
        </div>
      )}

      {/* STEP 3: Membership & Roles */}
      {currentStep === 3 && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
            <Award size={24} />
            Membership & Roles
          </h2>

          <div className="space-y-6">
            {/* Membership Type */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Membership Type *
              </label>
              <select
                required
                value={formData.membership.membershipType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    membership: {
                      ...formData.membership,
                      membershipType: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              >
                <option value="">Select membership type</option>
                {membershipTypes.map((type: any) => (
                  <option key={type.typeId} value={type.typeId}>
                    {type.name} - ${type.basePrice}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Roles */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2 mb-3 block">
                Member Roles * (Select at least one)
              </label>

              {Object.entries(rolesByCategory).map(
                ([category, categoryRoles]: [string, any]) => (
                  <div key={category} className="mb-6">
                    <h4 className="text-sm font-black text-slate-600 mb-3">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryRoles.map((role: any) => (
                        <button
                          key={role.roleId}
                          type="button"
                          onClick={() => toggleRole(role.roleId)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.roles.includes(role.roleId)
                              ? "border-[#06054e] bg-[#06054e] text-white"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {role.icon || "🏑"}
                            </span>
                            <div>
                              <p
                                className={`font-black ${
                                  formData.roles.includes(role.roleId)
                                    ? "text-white"
                                    : "text-slate-900"
                                }`}
                              >
                                {role.name}
                              </p>
                              {role.description && (
                                <p
                                  className={`text-xs mt-1 ${
                                    formData.roles.includes(role.roleId)
                                      ? "text-white/80"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {role.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>

            {/* Player Info (conditional) */}
            {formData.playerInfo && (
              <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <h3 className="text-lg font-black text-blue-900 mb-4">
                  Player Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black uppercase text-blue-700 ml-2">
                      Jersey Number
                    </label>
                    <input
                      type="text"
                      value={formData.playerInfo.jerseyNumber || ""}
                      onChange={(e) => {
                        // Only allow integers (0-99)
                        const value = e.target.value;
                        if (value === "" || /^\d{1,2}$/.test(value)) {
                          setFormData({
                            ...formData,
                            playerInfo: {
                              ...formData.playerInfo!,
                              jerseyNumber: value,
                            },
                          });
                        }
                      }}
                      className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                      placeholder="7"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-blue-700 ml-2">
                      Position
                    </label>
                    <select
                      value={formData.playerInfo.position || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          playerInfo: {
                            ...formData.playerInfo!,
                            position: e.target.value,
                          },
                        })
                      }
                      className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                    >
                      <option value="">Select position</option>
                      <option value="Forward">Forward</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Defender">Defender</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Status and Join Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Status
                </label>
                <select
                  value={formData.membership.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      membership: {
                        ...formData.membership,
                        status: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Join Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.membership.joinDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      membership: {
                        ...formData.membership,
                        joinDate: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Healthcare */}
      {currentStep === 4 && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
            <Heart size={24} />
            Healthcare & Medical
          </h2>

          <div className="space-y-6">
            {/* Medicare */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="hasMedicare"
                  checked={hasMedicare}
                  onChange={(e) => {
                    setHasMedicare(e.target.checked);
                    if (!e.target.checked) {
                      setFormData({
                        ...formData,
                        healthcare: { ...formData.healthcare, medicare: null },
                      });
                    } else {
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          medicare: {
                            number: "",
                            position: "",
                            expiryMonth: "",
                            expiryYear: "",
                          },
                        },
                      });
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
                />
                <label
                  htmlFor="hasMedicare"
                  className="text-lg font-black text-slate-700"
                >
                  💳 I have Medicare
                </label>
              </div>

              {hasMedicare && formData.healthcare.medicare && (
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3">
                      <label className="text-xs font-black uppercase text-green-700 ml-2">
                        Medicare Number (10 digits)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.healthcare.medicare.number}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow digits
                          if (value === "" || /^\d{0,10}$/.test(value)) {
                            setFormData({
                              ...formData,
                              healthcare: {
                                ...formData.healthcare,
                                medicare: {
                                  ...formData.healthcare.medicare!,
                                  number: value,
                                },
                              },
                            });
                          }
                        }}
                        className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-green-700 ml-2">
                        Position (1-9)
                      </label>
                      <input
                        type="text"
                        maxLength={1}
                        value={formData.healthcare.medicare.position}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow single digit 1-9
                          if (value === "" || /^[1-9]$/.test(value)) {
                            setFormData({
                              ...formData,
                              healthcare: {
                                ...formData.healthcare,
                                medicare: {
                                  ...formData.healthcare.medicare!,
                                  position: value,
                                },
                              },
                            });
                          }
                        }}
                        className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-green-700 ml-2">
                        Expiry Month
                      </label>
                      <select
                        value={formData.healthcare.medicare.expiryMonth}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            healthcare: {
                              ...formData.healthcare,
                              medicare: {
                                ...formData.healthcare.medicare!,
                                expiryMonth: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                      >
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (m) => (
                            <option
                              key={m}
                              value={m.toString().padStart(2, "0")}
                            >
                              {m.toString().padStart(2, "0")}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-green-700 ml-2">
                        Expiry Year
                      </label>
                      <select
                        value={formData.healthcare.medicare.expiryYear}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            healthcare: {
                              ...formData.healthcare,
                              medicare: {
                                ...formData.healthcare.medicare!,
                                expiryYear: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                      >
                        <option value="">Year</option>
                        {Array.from(
                          { length: 10 },
                          (_, i) => new Date().getFullYear() + i,
                        ).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Private Health Insurance */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="hasPrivateHealth"
                  checked={hasPrivateHealth}
                  onChange={(e) => {
                    setHasPrivateHealth(e.target.checked);
                    if (!e.target.checked) {
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          privateHealth: null,
                        },
                      });
                    } else {
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          privateHealth: {
                            provider: "",
                            membershipNumber: "",
                            expiryDate: "",
                          },
                        },
                      });
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
                />
                <label
                  htmlFor="hasPrivateHealth"
                  className="text-lg font-black text-slate-700"
                >
                  🏥 I have Private Health Insurance
                </label>
              </div>

              {hasPrivateHealth && formData.healthcare.privateHealth && (
                <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-xs font-black uppercase text-blue-700 ml-2">
                        Provider
                      </label>
                      <select
                        value={formData.healthcare.privateHealth.provider}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            healthcare: {
                              ...formData.healthcare,
                              privateHealth: {
                                ...formData.healthcare.privateHealth!,
                                provider: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                      >
                        <option value="">Select provider</option>
                        {healthProviders.map((provider: any) => (
                          <option
                            key={provider.providerId}
                            value={provider.providerId}
                          >
                            {provider.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-blue-700 ml-2">
                        Membership Number
                      </label>
                      <input
                        type="text"
                        value={
                          formData.healthcare.privateHealth.membershipNumber
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            healthcare: {
                              ...formData.healthcare,
                              privateHealth: {
                                ...formData.healthcare.privateHealth!,
                                membershipNumber: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                        placeholder="ABC123456"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-blue-700 ml-2">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.healthcare.privateHealth.expiryDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            healthcare: {
                              ...formData.healthcare,
                              privateHealth: {
                                ...formData.healthcare.privateHealth!,
                                expiryDate: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Medical Information */}
            <div>
              <h3 className="text-lg font-black text-slate-700 mb-4">
                Medical Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Medical Conditions
                  </label>
                  <textarea
                    value={formData.medical?.conditions || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        medical: {
                          ...formData.medical,
                          conditions: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    rows={2}
                    placeholder="e.g., Asthma, Diabetes"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Medications
                  </label>
                  <textarea
                    value={formData.medical?.medications || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        medical: {
                          ...formData.medical,
                          medications: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    rows={2}
                    placeholder="e.g., Ventolin inhaler as needed"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Allergies
                  </label>
                  <textarea
                    value={formData.medical?.allergies || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        medical: {
                          ...formData.medical,
                          allergies: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    rows={2}
                    placeholder="e.g., Penicillin, Nuts"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Emergency Contacts & Family */}
      {currentStep === 5 && (
        <>
          {/* WARNING BANNER - Shows if no emergency contacts */}
          {formData.emergencyContacts.length === 0 && (
            <div className="bg-red-50 border-4 border-red-500 rounded-[2rem] p-6 mb-6 shadow-xl">
              <div className="flex items-start gap-4">
                <AlertCircle
                  size={32}
                  className="text-red-600 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-black text-red-900 mb-2">
                    ⚠️ Emergency Contact Required
                  </h3>
                  <p className="text-red-800 font-bold mb-3">
                    You must add at least one emergency contact before you can
                    create this member.
                  </p>
                  <p className="text-sm text-red-700 font-bold">
                    👇 Click the "Add Emergency Contact" button below to get
                    started.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contacts */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
            <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
              <Shield size={24} />
              Emergency Contacts
            </h2>

            <div className="space-y-6">
              {formData.emergencyContacts.map((contact, index) => (
                <div
                  key={contact.contactId}
                  className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-700">
                      Contact {index + 1} (Priority {contact.priority})
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-black uppercase text-slate-400 ml-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contact.name}
                        onChange={(e) =>
                          updateEmergencyContact(index, "name", e.target.value)
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                        placeholder="Jane Smith"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-black uppercase text-slate-400 ml-2">
                        Relationship *
                      </label>
                      <select
                        required
                        value={contact.relationship}
                        onChange={(e) =>
                          updateEmergencyContact(
                            index,
                            "relationship",
                            e.target.value,
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                      >
                        <option value="">Select relationship</option>
                        {relationships.map((rel: any) => (
                          <option
                            key={rel.relationshipId}
                            value={rel.relationshipId}
                          >
                            {rel.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 ml-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contact.phone}
                        onChange={(e) =>
                          updateEmergencyContact(index, "phone", e.target.value)
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                        placeholder="0411 111 111"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 ml-2">
                        Mobile
                      </label>
                      <input
                        type="tel"
                        value={contact.mobile}
                        onChange={(e) =>
                          updateEmergencyContact(
                            index,
                            "mobile",
                            e.target.value,
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                        placeholder="0422 222 222"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-black uppercase text-slate-400 ml-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          updateEmergencyContact(index, "email", e.target.value)
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.emergencyContacts.length < 3 && (
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-[#06054e] hover:text-[#06054e] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-bold"
                >
                  <Plus size={20} />
                  Add Emergency Contact{" "}
                  {formData.emergencyContacts.length > 0
                    ? `(${formData.emergencyContacts.length}/3)`
                    : ""}
                </button>
              )}
            </div>
          </div>

          {/* Family Relationships */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="hasFamilyMembers"
                checked={hasFamilyMembers}
                onChange={(e) => setHasFamilyMembers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
              />
              <label
                htmlFor="hasFamilyMembers"
                className="text-lg font-black text-slate-700"
              >
                👥 This member has family in the club
              </label>
            </div>

            {hasFamilyMembers && (
              <div className="space-y-6 mt-6">
                {formData.familyRelationships.map((rel, index) => (
                  <div
                    key={rel.relationshipId}
                    className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-slate-700">
                        Relationship {index + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeFamilyRelationship(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black uppercase text-slate-400 ml-2">
                          Search Member
                        </label>
                        <input
                          type="text"
                          value={rel.searchQuery || ""}
                          onChange={(e) => {
                            updateFamilyRelationship(
                              index,
                              "searchQuery",
                              e.target.value,
                            );
                            searchMembers(e.target.value, index);
                          }}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                          placeholder="Type member name or ID..."
                        />

                        {searchResults[index] &&
                          searchResults[index].length > 0 && (
                            <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                              {searchResults[index].map((member: any) => (
                                <button
                                  key={member.memberId}
                                  type="button"
                                  onClick={() => {
                                    updateFamilyRelationship(
                                      index,
                                      "relatedMemberId",
                                      member.memberId,
                                    );
                                    updateFamilyRelationship(
                                      index,
                                      "searchQuery",
                                      `${member.personalInfo.firstName} ${member.personalInfo.lastName} (${member.memberId})`,
                                    );
                                    setSearchResults((prev) => ({
                                      ...prev,
                                      [index]: [],
                                    }));
                                  }}
                                  className="w-full p-3 text-left hover:bg-slate-50 transition-all"
                                >
                                  <p className="font-bold">
                                    {member.personalInfo.firstName}{" "}
                                    {member.personalInfo.lastName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {member.memberId}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase text-slate-400 ml-2">
                          Relationship Type
                        </label>
                        <select
                          value={rel.relationshipType}
                          onChange={(e) =>
                            updateFamilyRelationship(
                              index,
                              "relationshipType",
                              e.target.value,
                            )
                          }
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                        >
                          <option value="">Select relationship</option>
                          {relationshipTypes.map((rt: any) => (
                            <option key={rt.typeId} value={rt.typeId}>
                              {rt.forward} (→ {rt.reverse})
                            </option>
                          ))}
                        </select>
                      </div>

                      {rel.relatedMemberId && rel.forwardRelation && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <p className="text-sm text-blue-800">
                            ℹ️ <strong>{rel.searchQuery.split(" (")[0]}</strong>{" "}
                            will be linked as your{" "}
                            <strong>{rel.reverseRelation}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFamilyRelationship}
                  className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-[#06054e] hover:text-[#06054e] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-bold"
                >
                  <Plus size={20} />
                  Add Family Relationship
                </button>
              </div>
            )}
          </div>
        </>
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
                  showAlert(
                    "warning",
                    "Role Required",
                    "Please select at least one role.",
                  );
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
      {AlertComponent}
    </form>
  );
}
