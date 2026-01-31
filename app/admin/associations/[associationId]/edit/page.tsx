// app/(admin)/admin/associations/[associationId]/edit/page.tsx
// Fixed: Removed conflicting notFound function

import AssociationForm from "@/components/admin/AssociationForm";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

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
      level: association.level,
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

      // Branding
      branding: association.branding
        ? {
            primaryColor: association.branding.primaryColor || "#06054e",
            secondaryColor: association.branding.secondaryColor || "#FFD700",
          }
        : {
            primaryColor: "#06054e",
            secondaryColor: "#FFD700",
          },

      // Status
      status: association.status || "active",

      // Timestamps (convert to ISO strings)
      createdAt: association.createdAt?.toISOString(),
      updatedAt: association.updatedAt?.toISOString(),
    };

    // Serialize parent associations (only needed fields)
    const serializedParents = parentAssociations.map((a) => ({
      associationId: a.associationId,
      code: a.code,
      name: a.name,
      level: a.level,
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
