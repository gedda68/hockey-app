// components/admin/clubs/ClubForm.tsx
// Reusable club form for create and edit operations

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Palette,
  Phone,
  FileText,
  Users,
  BadgeDollarSign,
  Save,
  Plus,
  Edit2,
  Trash2,
  Facebook,
  Instagram,
  Info,
  Search,
} from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import {
  Label,
  TextInput,
  TextArea,
  SelectInput,
  ColorInput,
  CheckboxInput,
  SectionCard,
  FormGrid,
  FormField,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  EmptyState,
} from "@/components/admin/forms/FormComponents";

/* ---------------------------------------------
   Types
--------------------------------------------- */

interface Association {
  id: string;
  name: string;
}

interface Fee {
  id: string;
  category: string;
  name: string;
  amount: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
}

interface ClubFormData {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
  committee: CommitteeMember[];
  committeePositions: string[];
  established: string;
  homeGround: string;
  description: string;
  about: string;
  active: boolean;
  association?: Association | null;
  fees: Fee[];
}

interface ClubFormProps {
  initialData?: ClubFormData;
  mode: "create" | "edit";
  onSubmit: (data: ClubFormData) => Promise<void>;
  onCancel: () => void;
}

/* ---------------------------------------------
   Helper Functions
--------------------------------------------- */

const DEFAULT_LOGO = "/logos/clubs/_default.png";
const CURRENT_YEAR = new Date().getFullYear();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEmptyFee(): Fee {
  return {
    id: crypto.randomUUID(),
    category: "",
    name: "",
    amount: "",
    validFrom: `${CURRENT_YEAR}-01-01`,
    validTo: `${CURRENT_YEAR}-12-31`,
    isActive: true,
  };
}

function createEmptyMember(): CommitteeMember {
  return {
    id: crypto.randomUUID(),
    name: "",
    position: "",
    email: "",
    phone: "",
  };
}

/* ---------------------------------------------
   Club Form Component
--------------------------------------------- */

export default function ClubForm({
  initialData,
  mode,
  onSubmit,
  onCancel,
}: ClubFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPositionManager, setShowPositionManager] = useState(false);
  const [newPosition, setNewPosition] = useState("");

  // Load default positions from config
  const [defaultPositions, setDefaultPositions] = useState<string[]>([]);
  const [feeCategories, setFeeCategories] = useState<string[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);

  const [formData, setFormData] = useState<ClubFormData>(
    initialData || {
      id: crypto.randomUUID(),
      name: "",
      shortName: "",
      slug: "",
      logo: DEFAULT_LOGO,
      colors: {
        primary: "#06054e",
        secondary: "#FFD700",
        accent: "#FFFFFF",
      },
      address: {
        street: "",
        suburb: "",
        state: "QLD",
        postcode: "",
        country: "Australia",
      },
      contact: {
        email: "",
        phone: "",
        website: "",
      },
      socialMedia: {
        facebook: "",
        instagram: "",
        twitter: "",
      },
      committee: [],
      committeePositions: [],
      established: "",
      homeGround: "",
      description: "",
      about: "",
      active: true,
      association: null,
      fees: [],
    }
  );

  // Load configuration data
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Load committee positions from config
      const posRes = await fetch("/api/admin/config/committee-positions");
      if (posRes.ok) {
        const positions = await posRes.json();
        setDefaultPositions(positions);
        if (!initialData && formData.committeePositions.length === 0) {
          setFormData((prev) => ({ ...prev, committeePositions: positions }));
        }
      }

      // Load fee categories from config
      const feeRes = await fetch("/api/admin/config/fee-categories");
      if (feeRes.ok) {
        const categories = await feeRes.json();
        setFeeCategories(categories);
      }

      // Load associations
      const assocRes = await fetch("/api/admin/associations");
      if (assocRes.ok) {
        const assocs = await assocRes.json();
        setAssociations(assocs);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof ClubFormData>(
    field: K,
    value: ClubFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = <T extends keyof ClubFormData>(
    parent: T,
    field: keyof ClubFormData[T],
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (mode === "create" && formData.name) {
      updateField("slug", generateSlug(formData.name));
    }
  }, [formData.name, mode]);

  // Committee position management
  const addPosition = () => {
    if (newPosition.trim()) {
      if (!formData.committeePositions.includes(newPosition.trim())) {
        updateField("committeePositions", [
          ...formData.committeePositions,
          newPosition.trim(),
        ]);
      }
      setNewPosition("");
    }
  };

  const removePosition = (position: string) => {
    const inUse = formData.committee.some((m) => m.position === position);
    if (inUse) {
      alert("Cannot remove position that is currently in use");
      return;
    }
    updateField(
      "committeePositions",
      formData.committeePositions.filter((p) => p !== position)
    );
  };

  const resetToDefaultPositions = () => {
    if (
      confirm(
        "Reset to default positions? This will clear any custom positions."
      )
    ) {
      updateField("committeePositions", defaultPositions);
    }
  };

  // Committee member management
  const addMember = () => {
    updateField("committee", [...formData.committee, createEmptyMember()]);
  };

  const removeMember = (id: string) => {
    updateField(
      "committee",
      formData.committee.filter((m) => m.id !== id)
    );
  };

  const updateMember = (
    id: string,
    field: keyof CommitteeMember,
    value: string
  ) => {
    updateField(
      "committee",
      formData.committee.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  // Fee management
  const addFee = () => {
    updateField("fees", [...formData.fees, createEmptyFee()]);
  };

  const removeFee = (id: string) => {
    updateField(
      "fees",
      formData.fees.filter((f) => f.id !== id)
    );
  };

  const updateFee = (id: string, field: keyof Fee, value: any) => {
    updateField(
      "fees",
      formData.fees.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <SectionCard
        title="Basic Information"
        icon={<Info className="text-yellow-500" />}
      >
        <FormGrid cols={2}>
          <FormField>
            <Label required>Club Name</Label>
            <TextInput
              value={formData.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Brisbane Hockey Club"
              required
            />
          </FormField>

          <FormField>
            <Label required>Short Name</Label>
            <TextInput
              value={formData.shortName}
              onChange={(v) => updateField("shortName", v)}
              placeholder="BHC"
              required
            />
          </FormField>

          <FormField>
            <Label required>Slug (URL)</Label>
            <TextInput
              value={formData.slug}
              onChange={(v) => updateField("slug", v)}
              placeholder="brisbane-hockey-club"
              required
            />
          </FormField>

          <FormField>
            <Label>Established Year</Label>
            <TextInput
              value={formData.established}
              onChange={(v) => updateField("established", v)}
              placeholder="1975"
              type="number"
            />
          </FormField>

          <FormField>
            <Label>Home Ground</Label>
            <TextInput
              value={formData.homeGround}
              onChange={(v) => updateField("homeGround", v)}
              placeholder="Downey Park"
            />
          </FormField>

          <FormField>
            <Label>Logo URL</Label>
            <TextInput
              value={formData.logo}
              onChange={(v) => updateField("logo", v)}
              placeholder="/logos/clubs/brisbane.png"
            />
          </FormField>
        </FormGrid>

        <div className="mt-6">
          <CheckboxInput
            checked={formData.active}
            onChange={(v) => updateField("active", v)}
            label="Active Club"
          />
        </div>
      </SectionCard>

      {/* Brand Colors */}
      <SectionCard
        title="Brand Colors"
        icon={<Palette className="text-yellow-500" />}
      >
        <FormGrid cols={3}>
          <FormField>
            <Label>Primary Color</Label>
            <ColorInput
              value={formData.colors.primary}
              onChange={(v) => updateNestedField("colors", "primary", v)}
              label="Main club color"
            />
          </FormField>

          <FormField>
            <Label>Secondary Color</Label>
            <ColorInput
              value={formData.colors.secondary}
              onChange={(v) => updateNestedField("colors", "secondary", v)}
              label="Accent color"
            />
          </FormField>

          <FormField>
            <Label>Tertiary Color</Label>
            <ColorInput
              value={formData.colors.accent}
              onChange={(v) => updateNestedField("colors", "accent", v)}
              label="Additional color"
            />
          </FormField>
        </FormGrid>
      </SectionCard>

      {/* Address */}
      <SectionCard
        title="Address"
        icon={<MapPin className="text-yellow-500" />}
      >
        <FormGrid cols={2}>
          <div className="md:col-span-2">
            <Label>Street Address</Label>
            <TextInput
              value={formData.address.street}
              onChange={(v) => updateNestedField("address", "street", v)}
              placeholder="123 Hockey Lane"
            />
          </div>

          <FormField>
            <Label>Suburb</Label>
            <TextInput
              value={formData.address.suburb}
              onChange={(v) => updateNestedField("address", "suburb", v)}
              placeholder="Windsor"
            />
          </FormField>

          <FormField>
            <Label>State</Label>
            <SelectInput
              value={formData.address.state}
              onChange={(v) => updateNestedField("address", "state", v)}
              options={["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"]}
            />
          </FormField>

          <FormField>
            <Label>Postcode</Label>
            <TextInput
              value={formData.address.postcode}
              onChange={(v) => updateNestedField("address", "postcode", v)}
              placeholder="4030"
            />
          </FormField>

          <FormField>
            <Label>Country</Label>
            <TextInput
              value={formData.address.country}
              onChange={(v) => updateNestedField("address", "country", v)}
              placeholder="Australia"
            />
          </FormField>
        </FormGrid>
      </SectionCard>

      {/* Contact Information */}
      <SectionCard
        title="Contact Information"
        icon={<Phone className="text-yellow-500" />}
      >
        <FormGrid cols={2}>
          <FormField>
            <Label>Email</Label>
            <TextInput
              value={formData.contact.email}
              onChange={(v) => updateNestedField("contact", "email", v)}
              placeholder="info@club.com"
              type="email"
            />
          </FormField>

          <FormField>
            <Label>Phone</Label>
            <TextInput
              value={formData.contact.phone}
              onChange={(v) => updateNestedField("contact", "phone", v)}
              placeholder="(07) 3456 7890"
              type="tel"
            />
          </FormField>

          <div className="md:col-span-2">
            <Label>Website</Label>
            <TextInput
              value={formData.contact.website}
              onChange={(v) => updateNestedField("contact", "website", v)}
              placeholder="https://www.club.com"
              type="url"
            />
          </div>
        </FormGrid>
      </SectionCard>

      {/* Social Media */}
      <SectionCard
        title="Social Media"
        icon={<Globe className="text-yellow-500" />}
      >
        <FormGrid cols={2}>
          <FormField>
            <Label>Facebook</Label>
            <TextInput
              value={formData.socialMedia.facebook}
              onChange={(v) => updateNestedField("socialMedia", "facebook", v)}
              placeholder="https://facebook.com/club"
            />
          </FormField>

          <FormField>
            <Label>Instagram</Label>
            <TextInput
              value={formData.socialMedia.instagram}
              onChange={(v) => updateNestedField("socialMedia", "instagram", v)}
              placeholder="https://instagram.com/club"
            />
          </FormField>
        </FormGrid>
      </SectionCard>

      {/* Description */}
      <SectionCard
        title="Description"
        icon={<FileText className="text-yellow-500" />}
      >
        <div className="mb-4">
          <Label>About (Plain Text)</Label>
          <TextArea
            value={formData.about}
            onChange={(v) => updateField("about", v)}
            placeholder="Brief description of the club..."
            rows={3}
          />
        </div>

        <div>
          <Label>Full Description (Rich Text)</Label>
          <RichTextEditor
            value={formData.description}
            onChange={(v) => updateField("description", v)}
          />
        </div>
      </SectionCard>

      {/* Committee Positions */}
      <SectionCard
        title="Committee Positions"
        icon={<Users className="text-yellow-500" />}
        right={
          <button
            type="button"
            onClick={() => setShowPositionManager(!showPositionManager)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            <Edit2 size={18} />
            {showPositionManager ? "Hide" : "Manage"} Positions
          </button>
        }
      >
        {showPositionManager && (
          <div className="mb-6 p-6 bg-indigo-50 rounded-2xl border-2 border-indigo-200">
            <h3 className="font-black text-indigo-900 mb-4">
              Manage Custom Positions
            </h3>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPosition();
                  }
                }}
                className="flex-1 p-3 bg-white border-2 border-indigo-300 rounded-xl outline-none font-bold"
                placeholder="Enter new position name..."
              />
              <button
                type="button"
                onClick={addPosition}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-indigo-700 mb-2">
                Current Positions ({formData.committeePositions.length}):
              </p>

              <div className="flex flex-wrap gap-2">
                {formData.committeePositions.map((position) => {
                  const inUse = formData.committee.some(
                    (m) => m.position === position
                  );
                  return (
                    <div
                      key={position}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm ${
                        inUse
                          ? "bg-green-100 text-green-700 border-2 border-green-300"
                          : "bg-white text-indigo-700 border-2 border-indigo-300"
                      }`}
                    >
                      <span>{position}</span>
                      {inUse && (
                        <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
                          In Use
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePosition(position)}
                        className="ml-1 text-red-600 hover:text-red-800"
                        title={
                          inUse ? "Cannot delete - in use" : "Delete position"
                        }
                        disabled={inUse}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={resetToDefaultPositions}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Reset to Default Positions
            </button>
          </div>
        )}

        <p className="text-sm text-slate-600 font-bold">
          These positions will be available in the dropdown when adding
          committee members.
        </p>
      </SectionCard>

      {/* Committee Members */}
      <SectionCard
        title="Committee Members"
        icon={<Users className="text-yellow-500" />}
        right={
          <button
            type="button"
            onClick={addMember}
            className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            <Plus size={20} />
            Add Member
          </button>
        }
      >
        <div className="space-y-4">
          {formData.committee.map((member, index) => (
            <div
              key={member.id}
              className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-black text-slate-700">
                  Member {index + 1}
                </h3>
                <IconButton
                  onClick={() => removeMember(member.id)}
                  icon={<Trash2 size={18} />}
                  variant="danger"
                  title="Remove member"
                />
              </div>

              <FormGrid cols={2}>
                <FormField>
                  <Label>Name</Label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      updateMember(member.id, "name", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                    placeholder="Full name"
                  />
                </FormField>

                <FormField>
                  <Label>Position</Label>
                  <select
                    value={member.position}
                    onChange={(e) =>
                      updateMember(member.id, "position", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="">Select position...</option>
                    {formData.committeePositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField>
                  <Label>Email</Label>
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) =>
                      updateMember(member.id, "email", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                    placeholder="email@example.com"
                  />
                </FormField>

                <FormField>
                  <Label>Phone</Label>
                  <input
                    type="tel"
                    value={member.phone}
                    onChange={(e) =>
                      updateMember(member.id, "phone", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                    placeholder="0400 000 000"
                  />
                </FormField>
              </FormGrid>
            </div>
          ))}

          {formData.committee.length === 0 && (
            <EmptyState
              icon={<Users size={48} />}
              title="No committee members added yet"
              description="Click 'Add Member' to get started"
            />
          )}
        </div>
      </SectionCard>

      {/* Club Fees */}
      <SectionCard
        title="Club Fees"
        icon={<BadgeDollarSign className="text-yellow-500" />}
        right={
          <button
            type="button"
            onClick={addFee}
            className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            <Plus size={20} />
            Add Fee
          </button>
        }
      >
        <div className="space-y-4">
          {formData.fees.map((fee, index) => (
            <div
              key={fee.id}
              className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-black text-slate-700">Fee {index + 1}</h3>
                <IconButton
                  onClick={() => removeFee(fee.id)}
                  icon={<Trash2 size={18} />}
                  variant="danger"
                  title="Remove fee"
                />
              </div>

              <FormGrid cols={2}>
                <FormField>
                  <Label>Category</Label>
                  <SelectInput
                    value={fee.category}
                    onChange={(v) => updateFee(fee.id, "category", v)}
                    options={feeCategories}
                    placeholder="Select category..."
                  />
                </FormField>

                <FormField>
                  <Label>Fee Name</Label>
                  <input
                    type="text"
                    value={fee.name}
                    onChange={(e) => updateFee(fee.id, "name", e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                    placeholder="Membership Fee"
                  />
                </FormField>

                <FormField>
                  <Label>Amount ($)</Label>
                  <input
                    type="number"
                    value={fee.amount}
                    onChange={(e) =>
                      updateFee(fee.id, "amount", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                    placeholder="150.00"
                    step="0.01"
                  />
                </FormField>

                <FormField>
                  <Label>Valid From</Label>
                  <input
                    type="date"
                    value={fee.validFrom}
                    onChange={(e) =>
                      updateFee(fee.id, "validFrom", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </FormField>

                <FormField>
                  <Label>Valid To</Label>
                  <input
                    type="date"
                    value={fee.validTo}
                    onChange={(e) =>
                      updateFee(fee.id, "validTo", e.target.value)
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </FormField>

                <FormField>
                  <div className="pt-7">
                    <CheckboxInput
                      checked={fee.isActive}
                      onChange={(v) => updateFee(fee.id, "isActive", v)}
                      label="Active"
                    />
                  </div>
                </FormField>
              </FormGrid>
            </div>
          ))}

          {formData.fees.length === 0 && (
            <EmptyState
              icon={<BadgeDollarSign size={48} />}
              title="No fees configured yet"
              description="Click 'Add Fee' to configure club fees"
            />
          )}
        </div>
      </SectionCard>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton
          type="submit"
          disabled={isSaving}
          icon={<Save size={20} />}
        >
          {isSaving
            ? "Saving..."
            : mode === "create"
              ? "Create Club"
              : "Save Changes"}
        </PrimaryButton>
      </div>
    </form>
  );
}
