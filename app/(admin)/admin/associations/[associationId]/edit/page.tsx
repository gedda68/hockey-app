// app/admin/associations/[associationId]/edit/page.tsx
//
// Async server component — error handling follows Next.js App Router conventions:
//   • notFound()  → rendered by associations/[associationId]/not-found.tsx
//   • thrown error → rendered by associations/error.tsx
// No try/catch JSX pattern (React anti-pattern under concurrent rendering
// — see X3 in the platform roadmap).

import { notFound } from "next/navigation";
import AssociationForm from "@/components/admin/associations/AssociationForm";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ── Date normalisation ────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EditAssociationPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;

  const client = await clientPromise;
  const db = client.db();

  // Fetch the association to edit.
  // Any DB error propagates to associations/error.tsx automatically.
  const association = await db
    .collection("associations")
    .findOne({ associationId });

  // If not found, trigger the nearest not-found.tsx (no JSX in catch needed).
  if (!association) {
    notFound();
  }

  // Fetch potential parent associations.
  // Exclude self and descendants to prevent circular references.
  const parentAssociations = await db
    .collection("associations")
    .find({
      status:      "active",
      associationId: { $ne: associationId },
      hierarchy:   { $nin: [associationId] },
    })
    .sort({ level: 1, name: 1 })
    .toArray();

  // ── Serialise MongoDB data before passing to Client Component ─────────────
  // Removes _id, converts Dates to ISO strings, provides safe defaults.
  const serializedAssociation = {
    // Core Identity
    associationId: association.associationId,
    code:          association.code,
    name:          association.name,
    fullName:      association.fullName,
    acronym:       association.acronym || "",

    // Hierarchy
    parentAssociationId: association.parentAssociationId || "",
    level:               association.level ?? 0,
    hierarchy:           association.hierarchy || [],

    // Location
    region:   association.region   || "",
    state:    association.state    || "QLD",
    country:  association.country  || "Australia",
    timezone: association.timezone || "Australia/Brisbane",

    // Address
    address: association.address
      ? {
          street:   association.address.street   || "",
          suburb:   association.address.suburb   || "",
          city:     association.address.city     || "",
          state:    association.address.state    || "QLD",
          postcode: association.address.postcode || "",
          country:  association.address.country  || "Australia",
        }
      : {
          street: "", suburb: "", city: "",
          state: "QLD", postcode: "", country: "Australia",
        },

    // Contact
    contact: association.contact
      ? {
          primaryEmail:   association.contact.primaryEmail   || "",
          secondaryEmail: association.contact.secondaryEmail || "",
          phone:          association.contact.phone          || "",
          mobile:         association.contact.mobile         || "",
          website:        association.contact.website        || "",
        }
      : {
          primaryEmail: "", secondaryEmail: "",
          phone: "", mobile: "", website: "",
        },

    // Social Media
    socialMedia: association.socialMedia
      ? {
          facebook:  association.socialMedia.facebook  || "",
          instagram: association.socialMedia.instagram || "",
          twitter:   association.socialMedia.twitter   || "",
        }
      : { facebook: "", instagram: "", twitter: "" },

    // Positions / Fees
    positions: association.positions || [],
    fees:      association.fees      || [],

    // Settings
    settings: association.settings
      ? {
          requiresApproval:            association.settings.requiresApproval            ?? false,
          autoApproveReturningPlayers: association.settings.autoApproveReturningPlayers ?? true,
          allowMultipleClubs:          association.settings.allowMultipleClubs          ?? true,
          seasonStartMonth:            association.settings.seasonStartMonth            || 1,
          seasonEndMonth:              association.settings.seasonEndMonth              || 12,
          requiresInsurance:           association.settings.requiresInsurance           ?? true,
          requiresMedicalInfo:         association.settings.requiresMedicalInfo         ?? true,
          requiresEmergencyContact:    association.settings.requiresEmergencyContact    ?? true,
        }
      : {
          requiresApproval: false, autoApproveReturningPlayers: true,
          allowMultipleClubs: true, seasonStartMonth: 1, seasonEndMonth: 12,
          requiresInsurance: true, requiresMedicalInfo: true,
          requiresEmergencyContact: true,
        },

    // Branding
    branding: association.branding
      ? {
          primaryColor:   association.branding.primaryColor   || "#06054e",
          secondaryColor: association.branding.secondaryColor || "#FFD700",
          accentColor:    association.branding.accentColor    || "#ffd700",
          logoUrl: String(
            (association.branding as { logoUrl?: string }).logoUrl ||
            (association.branding as { logo?: string }).logo || "",
          ).trim(),
          bannerUrl: String(
            (association.branding as { bannerUrl?: string }).bannerUrl || "",
          ).trim(),
          adminHeaderBannerUrl: String(
            (association.branding as { adminHeaderBannerUrl?: string })
              .adminHeaderBannerUrl || "",
          ).trim(),
          publicHeaderBannerUrl: String(
            (association.branding as { publicHeaderBannerUrl?: string })
              .publicHeaderBannerUrl || "",
          ).trim(),
        }
      : {
          primaryColor: "#06054e", secondaryColor: "#FFD700",
          accentColor: "#ffd700",
          logoUrl: "", bannerUrl: "",
          adminHeaderBannerUrl: "", publicHeaderBannerUrl: "",
        },

    // Status / Timestamps
    status:    association.status || "active",
    createdAt: toIsoString(association.createdAt),
    updatedAt: toIsoString(association.updatedAt),
  };

  const serializedParents = parentAssociations.map((a) => ({
    associationId: a.associationId,
    code:  a.code,
    name:  a.name,
    level: a.level ?? 0,
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
}

// ── Metadata ──────────────────────────────────────────────────────────────────

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
