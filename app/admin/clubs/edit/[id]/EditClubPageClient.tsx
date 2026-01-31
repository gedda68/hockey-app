"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  Edit2,
  Facebook,
  FileText,
  Globe,
  Info,
  Instagram,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";

/* ---------------------------------------------
   Constants / Helpers
--------------------------------------------- */

const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Committee Member",
  "Coach Coordinator",
  "Registrar",
  "Junior Coordinator",
  "Senior Coordinator",
  "Volunteer Coordinator",
];

const FEE_CATEGORIES = [
  "Senior Men",
  "Junior Boys",
  "Social Membership",
  "Masters Membership",
  "Volunteer",
  "Non Playing",
  "Levies",
  "Other",
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_LOGO = "/logos/clubs/_default.png";

function safeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const createEmptyFee = (): Fee => ({
  id: crypto.randomUUID(),
  category: "",
  name: "",
  amount: "",
  validFrom: `${CURRENT_YEAR}-01-01`,
  validTo: `${CURRENT_YEAR}-12-31`,
});

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

interface ClubData {
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
    twitter: string; // keep field in data for backwards compat; UI won’t render it
  };

  committee: CommitteeMember[];
  committeePositions: string[];

  established: string;
  homeGround: string;

  description: string; // RichTextEditor HTML
  about: string;

  active: boolean;

  association?: Association | null;
  fees: Fee[];
}

/* ---------------------------------------------
   Small UI Components
--------------------------------------------- */

function SectionCard({
  title,
  icon,
  children,
  right,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase text-[#06054e] flex items-center gap-3">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
    />
  );
}

/**
 * Fixes the “requested resource isn't a valid image” noise.
 * We DO NOT use next/image here. We use <img> with fallback.
 */
function LogoImg({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_LOGO);

  useEffect(() => {
    setImgSrc(src || DEFAULT_LOGO);
  }, [src]);

  return (
    <img
      src={imgSrc || DEFAULT_LOGO}
      alt={alt}
      className={
        className ??
        "w-16 h-16 rounded-2xl bg-white border border-slate-200 object-contain"
      }
      onError={() => setImgSrc(DEFAULT_LOGO)}
    />
  );
}

/* ---------------------------------------------
   Association Typeahead
--------------------------------------------- */

function AssociationTypeahead({
  value,
  options,
  query,
  setQuery,
  show,
  setShow,
  onSelect,
}: {
  value: Association | null | undefined;
  options: Association[];
  query: string;
  setQuery: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  onSelect: (a: Association) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((a) => a.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <SectionCard
      title="Association"
      icon={<Search className="text-yellow-500" />}
    >
      <TextInput
        value={query}
        onChange={(v) => {
          setQuery(v);
          setShow(true);
        }}
        placeholder="Search associations..."
      />

      {show && query && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow max-h-64 overflow-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-slate-500 font-bold">No matches</div>
          )}
          {filtered.map((association) => (
            <button
              key={association.id}
              type="button"
              onClick={() => {
                onSelect(association);
                setQuery(association.name);
                setShow(false);
              }}
              className="block w-full text-left px-4 py-3 hover:bg-slate-100 font-bold text-slate-700"
            >
              {association.name}
            </button>
          ))}
        </div>
      )}

      {value && (
        <p className="mt-3 text-sm font-bold text-slate-600">
          Selected: <span className="text-[#06054e]">{value.name}</span>
        </p>
      )}
    </SectionCard>
  );
}

/* ---------------------------------------------
   Fee category typeahead (per row)
--------------------------------------------- */

function FeeCategoryTypeahead({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options as string[];
    return (options as string[]).filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Category (type to search)"
        className="w-full p-4 rounded-xl border border-slate-200 font-bold bg-white"
      />
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow max-h-48 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 font-bold">No matches</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="block w-full text-left px-4 py-3 hover:bg-slate-100 font-bold text-slate-700"
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------
   Fees editor
--------------------------------------------- */

function FeesEditor({
  fees,
  onAdd,
  onUpdate,
  onRemove,
}: {
  fees: Fee[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Fee, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SectionCard
      title="Fees"
      icon={<BadgeDollarSign className="text-yellow-500" />}
      right={
        <button
          type="button"
          onClick={onAdd}
          className="px-6 py-3 bg-[#06054e] text-white font-black rounded-2xl hover:opacity-90"
        >
          + Add Fee
        </button>
      }
    >
      {fees.length === 0 && (
        <p className="text-slate-500 font-bold">No fees configured yet.</p>
      )}

      <div className="space-y-6">
        {fees.map((fee) => (
          <div
            key={fee.id}
            className="p-6 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeeCategoryTypeahead
                value={fee.category}
                onChange={(v) => onUpdate(fee.id, "category", v)}
                options={FEE_CATEGORIES}
              />
              <input
                type="text"
                value={fee.name}
                onChange={(e) => onUpdate(fee.id, "name", e.target.value)}
                placeholder="Fee name"
                className="w-full p-4 rounded-xl border border-slate-200 font-bold bg-white"
              />
              <input
                type="date"
                value={fee.validFrom}
                onChange={(e) => onUpdate(fee.id, "validFrom", e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 font-bold bg-white"
              />
              <input
                type="date"
                value={fee.validTo}
                onChange={(e) => onUpdate(fee.id, "validTo", e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 font-bold bg-white"
              />
              <input
                type="input"
                value={fee.amount}
                onChange={(e) => onUpdate(fee.id, "amount", e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 font-bold bg-white"
              />
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => onRemove(fee.id)}
                className="text-red-600 font-black hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------
   Main Page
--------------------------------------------- */

export default function EditClubPageClient({ id }: { id: string }) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [club, setClub] = useState<ClubData | null>(null);

  const [showPositionManager, setShowPositionManager] = useState(false);
  const [newPosition, setNewPosition] = useState("");

  const [associations, setAssociations] = useState<Association[]>([]);
  const [assocQuery, setAssocQuery] = useState("");
  const [showAssocList, setShowAssocList] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Change fetchClub() to fetchClubById() to match the definition below
    fetchClubById();

    fetchAssociations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchClubById = async () => {
    try {
      const res = await fetch(`/api/admin/clubs/${id}`);
      if (!res.ok) throw new Error("Club not found");
      const foundClub = await res.json();

      // Normalize data to prevent empty field issues
      setClub({
        ...foundClub,
        association: foundClub.association || null,
        fees: Array.isArray(foundClub.fees) ? foundClub.fees : [], // FIX: Strict array check
        committeePositions: foundClub.committeePositions || DEFAULT_POSITIONS,
        committee: foundClub.committee || [],
        colors: foundClub.colors || {
          primary: "#06054e",
          secondary: "#090836",
          accent: "#ffd700",
        },
        address: foundClub.address || {
          street: "",
          suburb: "",
          state: "",
          postcode: "",
          country: "Australia",
        },
        contact: {
          ...foundClub.contact,
          phone: foundClub.contact?.phone || "",
        },
        socialMedia: foundClub.socialMedia || {
          facebook: "",
          instagram: "",
          twitter: "",
        },
      });
      if (foundClub.association) setAssocQuery(foundClub.association.name);
    } catch (e) {
      router.push("/admin/clubs");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssociations = async () => {
    try {
      const res = await fetch("/api/admin/associations");
      setAssociations(await res.json());
    } catch (err) {
      console.error("Failed to load associations", err);
    }
  };

  // Fees handlers
  const addFee = () => {
    if (!club) return;
    setClub({ ...club, fees: [...club.fees, createEmptyFee()] });
  };

  const updateFee = (feeId: string, field: keyof Fee, value: string) => {
    if (!club) return;
    setClub({
      ...club,
      fees: club.fees.map((f) =>
        f.id === feeId ? { ...f, [field]: value } : f
      ),
    });
  };

  const removeFee = (feeId: string) => {
    if (!club) return;
    setClub({ ...club, fees: club.fees.filter((f) => f.id !== feeId) });
  };

  // Committee handlers
  const addCommitteeMember = () => {
    if (!club) return;
    const newMember: CommitteeMember = {
      id: safeId("member"),
      name: "",
      position: club.committeePositions[0] || "Committee Member",
      email: "",
      phone: "",
    };
    setClub({ ...club, committee: [...club.committee, newMember] });
  };

  const updateCommitteeMember = (
    memberId: string,
    field: keyof CommitteeMember,
    value: string
  ) => {
    if (!club) return;
    setClub({
      ...club,
      committee: club.committee.map((m) =>
        m.id === memberId ? { ...m, [field]: value } : m
      ),
    });
  };

  const removeCommitteeMember = (memberId: string) => {
    if (!club) return;
    if (!confirm("Remove this committee member?")) return;
    setClub({
      ...club,
      committee: club.committee.filter((m) => m.id !== memberId),
    });
  };

  // Position management
  const addPosition = () => {
    if (!club) return;
    const p = newPosition.trim();
    if (!p) return;
    if (club.committeePositions.includes(p))
      return alert("This position already exists");
    setClub({ ...club, committeePositions: [...club.committeePositions, p] });
    setNewPosition("");
  };

  const removePosition = (position: string) => {
    if (!club) return;
    const inUse = club.committee.some((m) => m.position === position);
    if (inUse)
      return alert(`Cannot delete "${position}" - it's currently assigned`);
    if (!confirm(`Remove position "${position}"?`)) return;
    setClub({
      ...club,
      committeePositions: club.committeePositions.filter((p) => p !== position),
    });
  };

  const resetToDefaultPositions = () => {
    if (!club) return;
    if (!confirm("Reset to default positions?")) return;
    setClub({ ...club, committeePositions: [...DEFAULT_POSITIONS] });
  };

  // Save
  const handleSave = async () => {
    if (!club) return;

    setIsSaving(true);
    try {
      // This URL must match the folder structure: /api/admin/clubs/[id]
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(club),
      });

      if (res.status === 405) {
        throw new Error(
          "Method Not Allowed: Check if PUT is exported in route.ts"
        );
      }

      if (!res.ok) throw new Error("Failed to save");

      alert("Club updated successfully!");
      router.push("/admin/clubs");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error saving club");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]" />
          <p className="mt-4 text-slate-600 font-bold">Loading club...</p>
        </div>
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LogoImg
              src={club.logo || `/logos/clubs/${club.shortName}.png`}
              alt={club.name}
            />
            <div>
              <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
                <Building2 className="text-yellow-500" />
                Edit Club
              </h1>
              <p className="text-slate-600 mt-1 font-bold">{club.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin/clubs")}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700"
          >
            <ArrowLeft size={20} />
            Back to Clubs
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6"
        >
          {/* Basic Information */}
          <SectionCard
            title="Basic Information"
            icon={<Info className="text-yellow-500" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Club Name *</Label>
                <TextInput
                  required
                  value={club.name}
                  onChange={(v) => setClub({ ...club, name: v })}
                />
              </div>

              <div>
                <Label>Short Name *</Label>
                <TextInput
                  required
                  value={club.shortName}
                  onChange={(v) => setClub({ ...club, shortName: v })}
                  placeholder="e.g., CHC"
                />
              </div>

              <div>
                <Label>Established</Label>
                <TextInput
                  value={club.established}
                  onChange={(v) => setClub({ ...club, established: v })}
                  placeholder="e.g., 1944"
                />
              </div>

              <div>
                <Label>Home Ground</Label>
                <TextInput
                  value={club.homeGround}
                  onChange={(v) => setClub({ ...club, homeGround: v })}
                  placeholder="e.g., Perry Park"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={club.active}
                  onChange={(e) =>
                    setClub({ ...club, active: e.target.checked })
                  }
                  className="w-6 h-6 rounded border-slate-300"
                />
                <label htmlFor="active" className="font-bold text-slate-700">
                  Active Club
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Association */}
          <AssociationTypeahead
            value={club.association}
            options={associations}
            query={assocQuery}
            setQuery={setAssocQuery}
            show={showAssocList}
            setShow={setShowAssocList}
            onSelect={(a) => setClub({ ...club, association: a })}
          />

          {/* Fees */}
          <FeesEditor
            fees={club.fees}
            onAdd={addFee}
            onUpdate={updateFee}
            onRemove={removeFee}
          />

          {/* Rich description */}
          <SectionCard
            title="Description"
            icon={<FileText className="text-yellow-500" />}
          >
            <RichTextEditor
              value={club.description}
              onChange={(html) => setClub({ ...club, description: html })}
            />
          </SectionCard>

          {/* About */}
          <SectionCard
            title="About"
            icon={<Info className="text-yellow-500" />}
          >
            <textarea
              value={club.about}
              onChange={(e) => setClub({ ...club, about: e.target.value })}
              className="w-full min-h-[140px] p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
              placeholder="Additional notes / club overview..."
            />
          </SectionCard>

          {/* Colors */}
          <SectionCard
            title="Club Colors"
            icon={<Palette className="text-yellow-500" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Primary Color *</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={club.colors.primary}
                    onChange={(e) =>
                      setClub({
                        ...club,
                        colors: { ...club.colors, primary: e.target.value },
                      })
                    }
                    className="w-20 h-14 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={club.colors.primary}
                    onChange={(e) =>
                      setClub({
                        ...club,
                        colors: { ...club.colors, primary: e.target.value },
                      })
                    }
                    className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-mono"
                    placeholder="#06054e"
                  />
                </div>
              </div>

              <div>
                <Label>Secondary Color *</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={club.colors.secondary}
                    onChange={(e) =>
                      setClub({
                        ...club,
                        colors: { ...club.colors, secondary: e.target.value },
                      })
                    }
                    className="w-20 h-14 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={club.colors.secondary}
                    onChange={(e) =>
                      setClub({
                        ...club,
                        colors: { ...club.colors, secondary: e.target.value },
                      })
                    }
                    className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-mono"
                    placeholder="#090836"
                  />
                </div>
              </div>

              <div>
                <Label>Accent Color</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={club.colors.accent || "#ffd700"}
                    onChange={(e) =>
                      setClub({
                        ...club,
                        colors: { ...club.colors, accent: e.target.value },
                      })
                    }
                    className="w-20 h-14 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={club.colors.accent}
                    onChange={(e) =>
                      setClub({
                        ...club,
                        colors: { ...club.colors, accent: e.target.value },
                      })
                    }
                    className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-mono"
                    placeholder="#ffd700"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Address */}
          <SectionCard
            title="Address"
            icon={<MapPin className="text-yellow-500" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label>Street</Label>
                <TextInput
                  value={club.address.street}
                  onChange={(v) =>
                    setClub({
                      ...club,
                      address: { ...club.address, street: v },
                    })
                  }
                />
              </div>
              <div>
                <Label>Suburb</Label>
                <TextInput
                  value={club.address.suburb}
                  onChange={(v) =>
                    setClub({
                      ...club,
                      address: { ...club.address, suburb: v },
                    })
                  }
                />
              </div>
              <div>
                <Label>State</Label>
                <TextInput
                  value={club.address.state}
                  onChange={(v) =>
                    setClub({ ...club, address: { ...club.address, state: v } })
                  }
                />
              </div>
              <div>
                <Label>Postcode</Label>
                <TextInput
                  value={club.address.postcode}
                  onChange={(v) =>
                    setClub({
                      ...club,
                      address: { ...club.address, postcode: v },
                    })
                  }
                />
              </div>
              <div>
                <Label>Country</Label>
                <TextInput
                  value={club.address.country}
                  onChange={(v) =>
                    setClub({
                      ...club,
                      address: { ...club.address, country: v },
                    })
                  }
                />
              </div>
            </div>
          </SectionCard>

          {/* Contact (includes Phone) */}
          <SectionCard
            title="Contact"
            icon={<Phone className="text-yellow-500" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="text-slate-500" />
                <input
                  type="email"
                  value={club.contact.email}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      contact: { ...club.contact, email: e.target.value },
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="email@example.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-slate-500" />
                <input
                  type="tel"
                  value={club.contact.phone}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      contact: { ...club.contact, phone: e.target.value },
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="0400 000 000"
                />
              </div>

              <div className="flex items-center gap-3">
                <Globe className="text-slate-500" />
                <input
                  type="text"
                  value={club.contact.website}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      contact: { ...club.contact, website: e.target.value },
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="https://..."
                />
              </div>
            </div>
          </SectionCard>

          {/* Social Media (Twitter/X removed from UI) */}
          <SectionCard
            title="Social Media"
            icon={<Globe className="text-yellow-500" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Facebook className="text-slate-500" />
                <input
                  type="text"
                  value={club.socialMedia.facebook}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      socialMedia: {
                        ...club.socialMedia,
                        facebook: e.target.value,
                      },
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="Facebook URL"
                />
              </div>

              <div className="flex items-center gap-3">
                <Instagram className="text-slate-500" />
                <input
                  type="text"
                  value={club.socialMedia.instagram}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      socialMedia: {
                        ...club.socialMedia,
                        instagram: e.target.value,
                      },
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
                  placeholder="Instagram URL"
                />
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 font-bold">
              Twitter/X is not supported in this UI (existing data is
              preserved).
            </p>
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
                  Manage Custom Positions for {club.shortName}
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
                    Current Positions ({club.committeePositions.length}):
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {club.committeePositions.map((position) => {
                      const inUse = club.committee.some(
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
                              inUse
                                ? "Cannot delete - in use"
                                : "Delete position"
                            }
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
                onClick={addCommitteeMember}
                className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
              >
                <Plus size={20} />
                Add Member
              </button>
            }
          >
            <div className="space-y-4">
              {club.committee.map((member, index) => (
                <div
                  key={member.id}
                  className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-black text-slate-700">
                      Member {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeCommitteeMember(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "name",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                        placeholder="Full name"
                      />
                    </div>

                    <div>
                      <Label>Position</Label>
                      <select
                        value={member.position}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "position",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                      >
                        {club.committeePositions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Email</Label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "email",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <input
                        type="tel"
                        value={member.phone}
                        onChange={(e) =>
                          updateCommitteeMember(
                            member.id,
                            "phone",
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                        placeholder="0400 000 000"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {club.committee.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-bold">No committee members added yet</p>
                  <p className="text-sm mt-2">
                    Click "Add Member" to get started
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/clubs")}
              className="px-8 py-4 bg-slate-200 hover:bg-slate-300 rounded-2xl font-black uppercase transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase flex items-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <Save size={20} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
