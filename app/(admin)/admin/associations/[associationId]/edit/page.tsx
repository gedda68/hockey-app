// app/admin/associations/[associationId]/edit/page.tsx
// FIXED: Added accentColor to branding serialization

import AssociationForm from "@/components/admin/associations/AssociationForm";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

/** Mongo may return Date, ISO string, epoch ms, or extended JSON `{ $date }`. */
function toIsoString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value.trim() : d.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === "object" && value !== null && "$date" in value) {
    const inner = (value as { $date: string | number }).$date;
    const d = new Date(inner);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

export default async function EditAssociationPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  try {
    const { associationId } = await params;

    const client = await clientPromise;
    const db = client.db();

    // Fetch the association to edit
    const association = await db
      .collection("associations")
      .findOne({ associationId });

    // If not found, show 404
    if (!association) {
      return (
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <AlertCircle
                  size={32}
                  className="text-yellow-600 flex-shrink-0"
                />
                <div>
                  <h2 className="text-2xl font-black text-yellow-800 mb-2">
                    Association Not Found
                  </h2>
                  <p className="text-yellow-700 font-bold mb-4">
                    The association "{associationId}" doesn't exist or has been
                    removed.
                  </p>
                  <Link
                    href="/admin/associations"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all"
                  >
                    <ArrowLeft size={20} />
                    Back to Associations
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fetch potential parent associations
    // Exclude: self, descendants (to prevent circular references)
    const parentAssociations = await db
      .collection("associations")
      .find({
        status: "active",
        associationId: { $ne: associationId }, // Not self
        hierarchy: { $nin: [associationId] }, // Not a descendant
      })
      .sort({ level: 1, name: 1 })
      .toArray();

    // ✅ CRITICAL: Serialize MongoDB data before passing to Client Component
    // Remove _id, convert dates to strings
    const serializedAssociation = {
      // Core Identity
      associationId: association.associationId,
      code: association.code,
      name: association.name,
      fullName: association.fullName,
      acronym: association.acronym || "",

      // Hierarchy
      parentAssociationId: association.parentAssociationId || "",
      level: association.level ?? 0, // ✅ ENSURE LEVEL IS PASSED
      hierarchy: association.hierarchy || [],

      // Location
      region: association.region || "",
      state: association.state || "QLD",
      country: association.country || "Australia",
      timezone: association.timezone || "Australia/Brisbane",

      // Address
      address: association.address
        ? {
            street: association.address.street || "",
            suburb: association.address.suburb || "",
            city: association.address.city || "",
            state: association.address.state || "QLD",
            postcode: association.address.postcode || "",
            country: association.address.country || "Australia",
          }
        : {
            street: "",
            suburb: "",
            city: "",
            state: "QLD",
            postcode: "",
            country: "Australia",
          },

      // Contact
      contact: association.contact
        ? {
            primaryEmail: association.contact.primaryEmail || "",
            secondaryEmail: association.contact.secondaryEmail || "",
            phone: association.contact.phone || "",
            mobile: association.contact.mobile || "",
            website: association.contact.website || "",
          }
        : {
            primaryEmail: "",
            secondaryEmail: "",
            phone: "",
            mobile: "",
            website: "",
          },

      // Social Media
      socialMedia: association.socialMedia
        ? {
            facebook: association.socialMedia.facebook || "",
            instagram: association.socialMedia.instagram || "",
            twitter: association.socialMedia.twitter || "",
          }
        : {
            facebook: "",
            instagram: "",
            twitter: "",
          },

      // Positions (if any)
      positions: association.positions || [],

      // Fees (if any)
      fees: association.fees || [],

      // Settings
      settings: association.settings
        ? {
            requiresApproval: association.settings.requiresApproval ?? false,
            autoApproveReturningPlayers:
              association.settings.autoApproveReturningPlayers ?? true,
            allowMultipleClubs: association.settings.allowMultipleClubs ?? true,
            seasonStartMonth: association.settings.seasonStartMonth || 1,
            seasonEndMonth: association.settings.seasonEndMonth || 12,
            requiresInsurance: association.settings.requiresInsurance ?? true,
            requiresMedicalInfo:
              association.settings.requiresMedicalInfo ?? true,
            requiresEmergencyContact:
              association.settings.requiresEmergencyContact ?? true,
          }
        : {
            requiresApproval: false,
            autoApproveReturningPlayers: true,
            allowMultipleClubs: true,
            seasonStartMonth: 1,
            seasonEndMonth: 12,
            requiresInsurance: true,
            requiresMedicalInfo: true,
            requiresEmergencyContact: true,
          },

      // Branding (colours + public portal logo / banner)
      branding: association.branding
        ? {
            primaryColor: association.branding.primaryColor || "#06054e",
            secondaryColor: association.branding.secondaryColor || "#FFD700",
            accentColor: association.branding.accentColor || "#ffd700",
            logoUrl: String(
              (association.branding as { logoUrl?: string }).logoUrl ||
                (association.branding as { logo?: string }).logo ||
                "",
            ).trim(),
            bannerUrl: String(
              (association.branding as { bannerUrl?: string }).bannerUrl ||
                "",
            ).trim(),
          }
        : {
            primaryColor: "#06054e",
            secondaryColor: "#FFD700",
            accentColor: "#ffd700",
            logoUrl: "",
            bannerUrl: "",
          },

      // Status
      status: association.status || "active",

      // Timestamps (convert to ISO strings)
      createdAt: toIsoString(association.createdAt),
      updatedAt: toIsoString(association.updatedAt),
    };

    // Serialize parent associations (only needed fields)
    const serializedParents = parentAssociations.map((a) => ({
      associationId: a.associationId,
      code: a.code,
      name: a.name,
      level: a.level ?? 0, // ✅ ENSURE LEVEL IS PASSED
    }));

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Back Button */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/admin/associations"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold transition-colors"
              >
                <ArrowLeft size={20} />
                Back to Associations
              </Link>

              <Link
                href={`/admin/associations/${associationId}`}
                className="text-sm text-slate-600 hover:text-[#06054e] font-bold transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <AssociationForm
            associationId={associationId}
            initialData={serializedAssociation}
            parentAssociations={serializedParents}
          />
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Error loading edit association page:", error);

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <AlertCircle size={32} className="text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-black text-red-800 mb-2">
                  Error Loading Association
                </h2>
                <p className="text-red-700 font-bold mb-4">
                  {error.message || "Failed to load association data"}
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/admin/associations"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    <ArrowLeft size={20} />
                    Back to Associations
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// Optional: Add metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;

  try {
    const client = await clientPromise;
    const db = client.db();

    const association = await db
      .collection("associations")
      .findOne({ associationId });

    return {
      title: association
        ? `Edit ${association.name} | Hockey Admin`
        : "Edit Association | Hockey Admin",
      description: association
        ? `Edit details for ${association.name}`
        : "Edit association details",
    };
  } catch {
    return {
      title: "Edit Association | Hockey Admin",
      description: "Edit association details",
    };
  }
}
