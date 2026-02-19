// app/admin/associations/[associationId]/page.tsx
// Association detail/view page — full field display with edit + delete

import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  AlertCircle,
  Edit,
  Trash2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  DollarSign,
  Facebook,
  Instagram,
  Twitter,
  Shield,
  FileText,
  Settings2,
  Palette,
  Share2,
  Calendar,
  Clock,
  Hash,
  Tag,
} from "lucide-react";
import AssociationViewClient from "@/components/admin/associations/AssociationViewClient";

// ─── Level system ─────────────────────────────────────────────────────────────

const LEVEL_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "National",     color: "bg-purple-100 text-purple-700 border-purple-300" },
  2: { label: "Sub-national", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  3: { label: "State",        color: "bg-blue-100   text-blue-700   border-blue-300"   },
  4: { label: "Regional",     color: "bg-teal-100   text-teal-700   border-teal-300"   },
  5: { label: "City",         color: "bg-green-100  text-green-700  border-green-300"  },
};

function getLevelInfo(level: number) {
  return (
    LEVEL_MAP[level] || {
      label: `Level ${level}`,
      color: "bg-slate-100 text-slate-700 border-slate-300",
    }
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${className}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-black uppercase text-slate-400">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
      <h2 className="text-xl font-black text-[#06054e] mb-6 flex items-center gap-3">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AssociationDetailPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  try {
    const { associationId } = await params;
    const client = await clientPromise;
    const db = client.db();

    const association = await db.collection("associations").findOne({ associationId });

    if (!association) {
      return (
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <AlertCircle size={32} className="text-yellow-600 flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-black text-yellow-800 mb-2">Association Not Found</h2>
                  <p className="text-yellow-700 font-bold mb-4">
                    The association "{associationId}" doesn't exist or has been removed.
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

    // Fetch related data
    const [parent, children, clubs] = await Promise.all([
      association.parentAssociationId
        ? db.collection("associations").findOne({ associationId: association.parentAssociationId })
        : null,
      db.collection("associations").find({ parentAssociationId: associationId }).toArray(),
      db.collection("clubs").find({ parentAssociationId: associationId }).toArray(),
    ]);

    const [activeReg, pendingReg] = await Promise.all([
      db.collection("association-registrations").countDocuments({ associationId, status: "active" }),
      db.collection("association-registrations").countDocuments({ associationId, status: "pending" }),
    ]);

    const levelInfo = getLevelInfo(association.level);

    // Months helper
    const monthName = (n: number) =>
      n ? new Date(2000, n - 1).toLocaleString("default", { month: "long" }) : "—";

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
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

              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/associations/${associationId}/edit`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
                >
                  <Edit size={18} />
                  Edit
                </Link>
                {/* Client component handles delete + toast */}
                <AssociationViewClient
                  associationId={associationId}
                  associationName={association.name}
                  childrenCount={children.length}
                  clubsCount={clubs.length}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* Hero Header */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
            <div className="flex items-start gap-6">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
                style={{ backgroundColor: association.branding?.primaryColor || "#06054e" }}
              >
                {association.code}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-[#06054e]">{association.name}</h1>
                  <Badge className={levelInfo.color}>{levelInfo.label}</Badge>
                  <Badge
                    className={
                      association.status === "active"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : association.status === "suspended"
                        ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }
                  >
                    {association.status}
                  </Badge>
                </div>
                <p className="text-lg text-slate-600 font-bold mb-1">{association.fullName}</p>
                {association.acronym && (
                  <p className="text-sm font-bold text-slate-400">Acronym: {association.acronym}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-sm font-bold text-slate-500">
                    <Hash size={14} />
                    {association.associationId}
                  </span>
                  {parent && (
                    <Link
                      href={`/admin/associations/${parent.associationId}`}
                      className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline"
                    >
                      <Building2 size={14} />
                      {parent.code} – {parent.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Child Assocs", value: children.length, icon: <Building2 size={28} className="text-slate-300" /> },
              { label: "Clubs",        value: clubs.length,    icon: <Users size={28} className="text-slate-300" /> },
              { label: "Active Reg.",  value: activeReg,       icon: <Shield size={28} className="text-slate-300" />, valueClass: "text-green-600" },
              { label: "Pending Reg.", value: pendingReg,      icon: <FileText size={28} className="text-slate-300" />, valueClass: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">{s.label}</p>
                    <p className={`text-3xl font-black ${s.valueClass || "text-[#06054e]"}`}>
                      {s.value}
                    </p>
                  </div>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact */}
            <SectionCard title="Contact" icon={<Mail size={22} />}>
              <div className="space-y-4">
                {association.contact?.primaryEmail && (
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Primary Email</p>
                      <a href={`mailto:${association.contact.primaryEmail}`} className="font-bold text-blue-600 hover:underline">
                        {association.contact.primaryEmail}
                      </a>
                    </div>
                  </div>
                )}
                {association.contact?.secondaryEmail && (
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Secondary Email</p>
                      <a href={`mailto:${association.contact.secondaryEmail}`} className="font-bold text-blue-600 hover:underline">
                        {association.contact.secondaryEmail}
                      </a>
                    </div>
                  </div>
                )}
                {association.contact?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Phone</p>
                      <a href={`tel:${association.contact.phone}`} className="font-bold text-slate-800">
                        {association.contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                {association.contact?.mobile && (
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Mobile</p>
                      <a href={`tel:${association.contact.mobile}`} className="font-bold text-slate-800">
                        {association.contact.mobile}
                      </a>
                    </div>
                  </div>
                )}
                {association.contact?.website && (
                  <div className="flex items-start gap-3">
                    <Globe size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Website</p>
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

                {/* Social media */}
                {(association.socialMedia?.facebook ||
                  association.socialMedia?.instagram ||
                  association.socialMedia?.twitter) && (
                  <div className="pt-4 border-t-2 border-slate-100">
                    <p className="text-xs font-black uppercase text-slate-400 mb-3 flex items-center gap-2">
                      <Share2 size={14} /> Social Media
                    </p>
                    <div className="flex gap-3">
                      {association.socialMedia.facebook && (
                        <a href={association.socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="Facebook">
                          <Facebook size={18} />
                        </a>
                      )}
                      {association.socialMedia.instagram && (
                        <a href={association.socialMedia.instagram} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors" title="Instagram">
                          <Instagram size={18} />
                        </a>
                      )}
                      {association.socialMedia.twitter && (
                        <a href={association.socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-sky-100 text-sky-600 rounded-lg hover:bg-sky-200 transition-colors" title="Twitter/X">
                          <Twitter size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Address & Location */}
            <SectionCard title="Address & Location" icon={<MapPin size={22} />}>
              <div className="space-y-4">
                <div className="font-bold text-slate-800 leading-relaxed">
                  {association.address?.street && <div>{association.address.street}</div>}
                  <div>
                    {[association.address?.suburb, association.address?.city]
                      .filter(Boolean)
                      .join(", ")}{" "}
                    {association.address?.state} {association.address?.postcode}
                  </div>
                  {association.address?.country && <div>{association.address.country}</div>}
                </div>

                <div className="pt-4 border-t-2 border-slate-100 grid grid-cols-2 gap-4">
                  <InfoRow label="Region" value={association.region} />
                  <InfoRow label="State" value={association.state} />
                  <InfoRow label="Country" value={association.country} />
                  <InfoRow label="Timezone" value={association.timezone} />
                </div>
              </div>
            </SectionCard>

            {/* Branding */}
            <SectionCard title="Branding" icon={<Palette size={22} />}>
              <div className="space-y-4">
                {[
                  { label: "Primary", key: "primaryColor" },
                  { label: "Secondary", key: "secondaryColor" },
                ].map((c) => {
                  const hex = association.branding?.[c.key] || "#cccccc";
                  return (
                    <div key={c.key} className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl border-2 border-slate-200 flex-shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <div>
                        <p className="text-xs font-black uppercase text-slate-400">{c.label}</p>
                        <p className="font-mono font-bold text-slate-800">{hex}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Settings */}
            <SectionCard title="Registration Settings" icon={<Settings2 size={22} />}>
              <div className="space-y-3">
                {[
                  { key: "requiresApproval", label: "Requires Manual Approval" },
                  { key: "autoApproveReturningPlayers", label: "Auto-approve Returning Players" },
                  { key: "allowMultipleClubs", label: "Allow Multiple Club Memberships" },
                  { key: "requiresInsurance", label: "Mandatory Insurance" },
                  { key: "requiresMedicalInfo", label: "Collect Medical Information" },
                  { key: "requiresEmergencyContact", label: "Require Emergency Contact" },
                ].map((item) => {
                  const val = association.settings?.[item.key];
                  return (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-black ${
                          val ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {val ? "Yes" : "No"}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  Season:{" "}
                  <span className="text-[#06054e]">
                    {monthName(association.settings?.seasonStartMonth)} –{" "}
                    {monthName(association.settings?.seasonEndMonth)}
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Child Associations */}
          {children.length > 0 && (
            <SectionCard
              title={`Child Associations (${children.length})`}
              icon={<Building2 size={22} />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child: any) => {
                  const childLevel = getLevelInfo(child.level);
                  return (
                    <Link
                      key={child.associationId}
                      href={`/admin/associations/${child.associationId}`}
                      className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border-2 border-slate-200"
                    >
                      <div
                        className="w-12 h-12 rounded-lg text-white flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{ backgroundColor: child.branding?.primaryColor || "#06054e" }}
                      >
                        {child.code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">{child.name}</div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${childLevel.color}`}>
                          {childLevel.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Fees */}
          {association.fees && association.fees.length > 0 && (
            <SectionCard title={`Fees (${association.fees.length})`} icon={<DollarSign size={22} />}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-xs">Name</th>
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-xs">Amount</th>
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-xs">Category</th>
                      <th className="text-left py-3 px-4 font-black text-slate-600 uppercase text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {association.fees.map((fee: any) => (
                      <tr key={fee.feeId} className="border-b border-slate-100">
                        <td className="py-3 px-4 font-bold text-slate-900">{fee.name}</td>
                        <td className="py-3 px-4 font-black text-[#06054e] text-lg">
                          ${Number(fee.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600">{fee.category || "—"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              fee.isActive !== false ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
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
            </SectionCard>
          )}

          {/* Audit */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex flex-wrap gap-6 text-sm">
              {association.createdAt && (
                <div className="flex items-center gap-2 text-slate-500 font-bold">
                  <Clock size={16} />
                  Created:{" "}
                  <span className="text-slate-700">
                    {new Date(association.createdAt).toLocaleString()}
                  </span>
                </div>
              )}
              {association.updatedAt && (
                <div className="flex items-center gap-2 text-slate-500 font-bold">
                  <Clock size={16} />
                  Updated:{" "}
                  <span className="text-slate-700">
                    {new Date(association.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
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
                <h2 className="text-2xl font-black text-red-800 mb-2">Error Loading Association</h2>
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  try {
    const client = await clientPromise;
    const db = client.db();
    const association = await db.collection("associations").findOne({ associationId });
    return {
      title: association
        ? `${association.name} | Hockey Admin`
        : "Association | Hockey Admin",
    };
  } catch {
    return { title: "Association | Hockey Admin" };
  }
}
