// app/(admin)/admin/associations/[associationId]/page.tsx
// Association detail/view page

import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import {
  Building2,
  Edit,
  MapPin,
  Mail,
  Phone,
  Globe,
  Users,
  DollarSign,
  ArrowLeft,
  AlertCircle,
  Facebook,
  Instagram,
  Twitter,
  Shield,
  FileText,
} from "lucide-react";

export default async function AssociationDetailPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  try {
    const { associationId } = await params;

    const client = await clientPromise;
    const db = client.db();

    // Fetch association
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

    // Fetch parent
    let parent = null;
    if (association.parentAssociationId) {
      parent = await db
        .collection("associations")
        .findOne({ associationId: association.parentAssociationId });
    }

    // Fetch children
    const children = await db
      .collection("associations")
      .find({ parentAssociationId: associationId })
      .toArray();

    // Fetch clubs
    const clubs = await db
      .collection("clubs")
      .find({ parentAssociationId: associationId })
      .toArray();

    // Get registration statistics
    const totalRegistrations = await db
      .collection("association-registrations")
      .countDocuments({ associationId });

    const activeRegistrations = await db
      .collection("association-registrations")
      .countDocuments({ associationId, status: "active" });

    const pendingRegistrations = await db
      .collection("association-registrations")
      .countDocuments({ associationId, status: "pending" });

    // Get level badge info
    const getLevelInfo = (level: number) => {
      const levels = {
        0: {
          label: "National",
          color: "bg-purple-100 text-purple-700 border-purple-300",
        },
        1: {
          label: "State",
          color: "bg-blue-100 text-blue-700 border-blue-300",
        },
        2: {
          label: "Regional",
          color: "bg-green-100 text-green-700 border-green-300",
        },
      };
      return (
        levels[level as keyof typeof levels] || {
          label: `Level ${level}`,
          color: "bg-slate-100 text-slate-700 border-slate-300",
        }
      );
    };

    const levelInfo = getLevelInfo(association.level);

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
                href={`/admin/associations/${associationId}/edit`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
              >
                <Edit size={20} />
                Edit Association
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-20 h-20 rounded-2xl text-white flex items-center justify-center text-4xl font-black"
                style={{
                  backgroundColor:
                    association.branding?.primaryColor || "#06054e",
                }}
              >
                {association.code}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-[#06054e]">
                    {association.name}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${levelInfo.color}`}
                  >
                    {levelInfo.label}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-bold border-2 capitalize ${
                      association.status === "active"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {association.status}
                  </span>
                </div>
                <p className="text-lg text-slate-600 font-bold">
                  {association.fullName}
                </p>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  {association.region}, {association.state}
                </p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase">
                    Children
                  </p>
                  <p className="text-3xl font-black text-[#06054e] mt-1">
                    {children.length}
                  </p>
                </div>
                <Building2 size={32} className="text-slate-300" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase">
                    Clubs
                  </p>
                  <p className="text-3xl font-black text-[#06054e] mt-1">
                    {clubs.length}
                  </p>
                </div>
                <Users size={32} className="text-slate-300" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase">
                    Active
                  </p>
                  <p className="text-3xl font-black text-green-600 mt-1">
                    {activeRegistrations}
                  </p>
                </div>
                <Shield size={32} className="text-slate-300" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase">
                    Pending
                  </p>
                  <p className="text-3xl font-black text-orange-600 mt-1">
                    {pendingRegistrations}
                  </p>
                </div>
                <FileText size={32} className="text-slate-300" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Contact Info */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Mail size={24} />
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail
                    size={20}
                    className="text-slate-400 mt-1 flex-shrink-0"
                  />
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Primary Email
                    </div>
                    <a
                      href={`mailto:${association.contact?.primaryEmail}`}
                      className="font-bold text-blue-600 hover:underline"
                    >
                      {association.contact?.primaryEmail}
                    </a>
                  </div>
                </div>

                {association.contact?.secondaryEmail && (
                  <div className="flex items-start gap-3">
                    <Mail
                      size={20}
                      className="text-slate-400 mt-1 flex-shrink-0"
                    />
                    <div>
                      <div className="text-xs font-black uppercase text-slate-500 mb-1">
                        Secondary Email
                      </div>
                      <a
                        href={`mailto:${association.contact.secondaryEmail}`}
                        className="font-bold text-blue-600 hover:underline"
                      >
                        {association.contact.secondaryEmail}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Phone
                    size={20}
                    className="text-slate-400 mt-1 flex-shrink-0"
                  />
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Phone
                    </div>
                    <a
                      href={`tel:${association.contact?.phone}`}
                      className="font-bold text-slate-700"
                    >
                      {association.contact?.phone}
                    </a>
                  </div>
                </div>

                {association.contact?.mobile && (
                  <div className="flex items-start gap-3">
                    <Phone
                      size={20}
                      className="text-slate-400 mt-1 flex-shrink-0"
                    />
                    <div>
                      <div className="text-xs font-black uppercase text-slate-500 mb-1">
                        Mobile
                      </div>
                      <a
                        href={`tel:${association.contact.mobile}`}
                        className="font-bold text-slate-700"
                      >
                        {association.contact.mobile}
                      </a>
                    </div>
                  </div>
                )}

                {association.contact?.website && (
                  <div className="flex items-start gap-3">
                    <Globe
                      size={20}
                      className="text-slate-400 mt-1 flex-shrink-0"
                    />
                    <div>
                      <div className="text-xs font-black uppercase text-slate-500 mb-1">
                        Website
                      </div>
                      <a
                        href={association.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 hover:underline"
                      >
                        {association.contact.website}
                      </a>
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {(association.socialMedia?.facebook ||
                  association.socialMedia?.instagram ||
                  association.socialMedia?.twitter) && (
                  <div className="pt-4 border-t-2 border-slate-100">
                    <div className="text-xs font-black uppercase text-slate-500 mb-3">
                      Social Media
                    </div>
                    <div className="flex gap-3">
                      {association.socialMedia.facebook && (
                        <a
                          href={association.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Facebook size={20} />
                        </a>
                      )}
                      {association.socialMedia.instagram && (
                        <a
                          href={association.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors"
                        >
                          <Instagram size={20} />
                        </a>
                      )}
                      {association.socialMedia.twitter && (
                        <a
                          href={association.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-sky-100 text-sky-600 rounded-lg hover:bg-sky-200 transition-colors"
                        >
                          <Twitter size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <MapPin size={24} />
                Address
              </h2>
              <div className="font-bold text-slate-700 text-lg leading-relaxed">
                <div>{association.address?.street}</div>
                <div>
                  {association.address?.suburb}, {association.address?.state}{" "}
                  {association.address?.postcode}
                </div>
                <div>{association.address?.country}</div>
              </div>

              {/* Hierarchy */}
              {parent && (
                <div className="mt-6 pt-6 border-t-2 border-slate-100">
                  <div className="text-xs font-black uppercase text-slate-500 mb-3">
                    Parent Association
                  </div>
                  <Link
                    href={`/admin/associations/${parent.associationId}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm">
                      {parent.code}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">
                        {parent.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Level {parent.level}
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Children Associations */}
          {children.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Building2 size={24} />
                Child Associations ({children.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child: any) => (
                  <Link
                    key={child.associationId}
                    href={`/admin/associations/${child.associationId}`}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border-2 border-slate-200"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#06054e] text-white flex items-center justify-center font-black">
                      {child.code}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">
                        {child.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Level {child.level}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fees */}
          {association.fees && association.fees.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <DollarSign size={24} />
                Fees ({association.fees.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-sm">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-sm">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-sm">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {association.fees.map((fee: any) => (
                      <tr key={fee.feeId} className="border-b border-slate-100">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {fee.name}
                        </td>
                        <td className="py-3 px-4 font-black text-[#06054e] text-lg">
                          ${fee.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600">
                          {fee.category || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              fee.isActive !== false
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {fee.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Error loading association:", error);

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
    );
  }
}

// Metadata
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
        ? `${association.name} | Hockey Admin`
        : "Association | Hockey Admin",
      description: association
        ? `View details for ${association.name}`
        : "Association details",
    };
  } catch {
    return {
      title: "Association | Hockey Admin",
      description: "Association details",
    };
  }
}
