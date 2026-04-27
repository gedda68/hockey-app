// app/admin/associations/[associationId]/page.tsx
// COMPLETE Association View - Shows ALL Fields

import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { getErrorMessage } from "@/lib/utils/errors";
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
  Settings,
  Palette,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart3,
  Trophy,
  Wrench,
  MousePointerClick,
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

    const association = await db
      .collection("associations")
      .findOne({ associationId });

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
                    The association "{associationId}" doesn't exist.
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
      parent = await db.collection("associations").findOne({
        associationId: association.parentAssociationId,
      });
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

    // Get level badge info - FIXED
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
        3: {
          label: "District",
          color: "bg-orange-100 text-orange-700 border-orange-300",
        },
      };
      return (
        levels[level as keyof typeof levels] || {
          label: `Level ${level}`,
          color: "bg-slate-100 text-slate-700 border-slate-300",
        }
      );
    };

    const levelInfo = getLevelInfo(association.level ?? 0);

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

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/admin/associations/${associationId}/umpire-payments`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#06054e] text-[#06054e] rounded-xl font-black hover:bg-slate-50 transition-all text-sm"
                >
                  <DollarSign size={18} />
                  Umpire honoraria
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/official-register`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-400 text-slate-800 rounded-xl font-black hover:bg-slate-50 transition-all text-sm"
                >
                  <FileText size={18} />
                  Official register
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/officiating-report`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-400 text-slate-800 rounded-xl font-black hover:bg-slate-50 transition-all text-sm"
                >
                  <BarChart3 size={18} />
                  Officiating report
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/competitions`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-emerald-700 text-emerald-900 rounded-xl font-black hover:bg-emerald-50 transition-all text-sm"
                >
                  <Trophy size={18} />
                  League setup
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/venues`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-violet-600 text-violet-900 rounded-xl font-black hover:bg-violet-50 transition-all text-sm"
                >
                  <MapPin size={18} />
                  Venues &amp; pitches
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/venue-calendar`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-cyan-600 text-cyan-900 rounded-xl font-black hover:bg-cyan-50 transition-all text-sm"
                >
                  <Calendar size={18} />
                  Pitch calendar blocks
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/division-teams`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-indigo-600 text-indigo-900 rounded-xl font-black hover:bg-indigo-50 transition-all text-sm"
                >
                  <Users size={18} />
                  Teams &amp; divisions
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/fixtures-console`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-teal-600 text-teal-900 rounded-xl font-black hover:bg-teal-50 transition-all text-sm"
                >
                  <Wrench size={18} />
                  Fixture operations
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/match-events`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-400 text-slate-800 rounded-xl font-black hover:bg-slate-50 transition-all text-sm"
                >
                  <Calendar size={18} />
                  Match events
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/communications`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-rose-500 text-rose-900 rounded-xl font-black hover:bg-rose-50 transition-all text-sm"
                >
                  <Mail size={18} />
                  Communications hub
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/partner-analytics`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-amber-600 text-amber-950 rounded-xl font-black hover:bg-amber-50 transition-all text-sm"
                >
                  <MousePointerClick size={18} />
                  Partner analytics
                </Link>
                <Link
                  href={`/admin/associations/${associationId}/financials`}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-emerald-800 text-emerald-950 rounded-xl font-black hover:bg-emerald-50 transition-all text-sm"
                >
                  <DollarSign size={18} />
                  Financials
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
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          {/* Header - WITH ALL IDENTITY FIELDS */}
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
                  {/* FIXED: Level Badge */}
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
                {/* NEW: Show Acronym */}
                {association.acronym && (
                  <p className="text-sm text-slate-500 font-bold mt-1">
                    Acronym: {association.acronym}
                  </p>
                )}
                <p className="text-sm text-slate-500 font-bold mt-1">
                  {association.region && `${association.region}, `}
                  {association.state}
                  {association.country && ` • ${association.country}`}
                </p>
                {/* NEW: Show Timezone */}
                {association.timezone && (
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Timezone: {association.timezone}
                  </p>
                )}
              </div>
            </div>

            {/* NEW: Show Association ID */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs font-black uppercase text-slate-500 mb-1">
                Association ID
              </div>
              <div className="font-mono font-bold text-slate-700">
                {association.associationId}
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
                    Fees
                  </p>
                  <p className="text-3xl font-black text-[#06054e] mt-1">
                    {association.fees?.length || 0}
                  </p>
                </div>
                <DollarSign size={32} className="text-slate-300" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase">
                    Positions
                  </p>
                  <p className="text-3xl font-black text-[#06054e] mt-1">
                    {association.positions?.length || 0}
                  </p>
                </div>
                <Shield size={32} className="text-slate-300" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Contact Info - COMPLETE */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Mail size={24} />
                Contact Information
              </h2>
              <div className="space-y-4">
                {/* Primary Email */}
                {association.contact?.primaryEmail && (
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Primary Email
                    </div>
                    <a
                      href={`mailto:${association.contact.primaryEmail}`}
                      className="flex items-center gap-2 font-bold text-[#06054e] hover:text-yellow-500 transition-colors"
                    >
                      <Mail size={16} />
                      {association.contact.primaryEmail}
                    </a>
                  </div>
                )}

                {/* NEW: Secondary Email */}
                {association.contact?.secondaryEmail && (
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Secondary Email
                    </div>
                    <a
                      href={`mailto:${association.contact.secondaryEmail}`}
                      className="flex items-center gap-2 font-bold text-slate-700 hover:text-[#06054e] transition-colors"
                    >
                      <Mail size={16} />
                      {association.contact.secondaryEmail}
                    </a>
                  </div>
                )}

                {/* Phone */}
                {association.contact?.phone && (
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Phone
                    </div>
                    <a
                      href={`tel:${association.contact.phone}`}
                      className="flex items-center gap-2 font-bold text-slate-700 hover:text-[#06054e] transition-colors"
                    >
                      <Phone size={16} />
                      {association.contact.phone}
                    </a>
                  </div>
                )}

                {/* NEW: Mobile */}
                {association.contact?.mobile && (
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Mobile
                    </div>
                    <a
                      href={`tel:${association.contact.mobile}`}
                      className="flex items-center gap-2 font-bold text-slate-700 hover:text-[#06054e] transition-colors"
                    >
                      <Phone size={16} />
                      {association.contact.mobile}
                    </a>
                  </div>
                )}

                {/* Website */}
                {association.contact?.website && (
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500 mb-1">
                      Website
                    </div>
                    <a
                      href={association.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Globe size={16} />
                      {association.contact.website}
                    </a>
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
                    <div className="flex gap-2">
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

            {/* Address & Hierarchy */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <MapPin size={24} />
                Address
              </h2>
              <div className="font-bold text-slate-700 text-lg leading-relaxed">
                {association.address?.street && (
                  <div>{association.address.street}</div>
                )}
                {association.address?.suburb && (
                  <div>
                    {association.address.suburb}
                    {association.address.city &&
                      ` (${association.address.city})`}
                  </div>
                )}
                {association.address?.state && (
                  <div>
                    {association.address.state} {association.address.postcode}
                  </div>
                )}
                {association.address?.country && (
                  <div>{association.address.country}</div>
                )}
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
                        {getLevelInfo(parent.level ?? 0).label}
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* NEW: Settings Section */}
          {association.settings && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Settings size={24} />
                Settings & Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  {association.settings.requiresApproval ? (
                    <CheckCircle size={20} className="text-green-600 mt-1" />
                  ) : (
                    <XCircle size={20} className="text-slate-400 mt-1" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      Requires Approval
                    </div>
                    <div className="text-sm text-slate-600">
                      {association.settings.requiresApproval ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {association.settings.autoApproveReturningPlayers ? (
                    <CheckCircle size={20} className="text-green-600 mt-1" />
                  ) : (
                    <XCircle size={20} className="text-slate-400 mt-1" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      Auto-Approve Returning
                    </div>
                    <div className="text-sm text-slate-600">
                      {association.settings.autoApproveReturningPlayers
                        ? "Yes"
                        : "No"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {association.settings.allowMultipleClubs ? (
                    <CheckCircle size={20} className="text-green-600 mt-1" />
                  ) : (
                    <XCircle size={20} className="text-slate-400 mt-1" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      Allow Multiple Clubs
                    </div>
                    <div className="text-sm text-slate-600">
                      {association.settings.allowMultipleClubs ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-blue-600 mt-1" />
                  <div>
                    <div className="font-bold text-slate-900">Season</div>
                    <div className="text-sm text-slate-600">
                      Month {association.settings.seasonStartMonth} -{" "}
                      {association.settings.seasonEndMonth}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {association.settings.requiresInsurance ? (
                    <CheckCircle size={20} className="text-green-600 mt-1" />
                  ) : (
                    <XCircle size={20} className="text-slate-400 mt-1" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      Requires Insurance
                    </div>
                    <div className="text-sm text-slate-600">
                      {association.settings.requiresInsurance ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {association.settings.requiresMedicalInfo ? (
                    <CheckCircle size={20} className="text-green-600 mt-1" />
                  ) : (
                    <XCircle size={20} className="text-slate-400 mt-1" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      Requires Medical Info
                    </div>
                    <div className="text-sm text-slate-600">
                      {association.settings.requiresMedicalInfo ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {association.settings.requiresEmergencyContact ? (
                    <CheckCircle size={20} className="text-green-600 mt-1" />
                  ) : (
                    <XCircle size={20} className="text-slate-400 mt-1" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      Requires Emergency Contact
                    </div>
                    <div className="text-sm text-slate-600">
                      {association.settings.requiresEmergencyContact
                        ? "Yes"
                        : "No"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NEW: Branding Section */}
          {association.branding && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Palette size={24} />
                Branding & Colors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs font-black uppercase text-slate-500 mb-2">
                    Primary Color
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-16 h-16 rounded-xl border-2 border-slate-200 shadow-inner"
                      style={{
                        backgroundColor: association.branding.primaryColor,
                      }}
                    />
                    <div className="font-mono font-bold text-slate-700 uppercase">
                      {association.branding.primaryColor}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black uppercase text-slate-500 mb-2">
                    Secondary Color
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-16 h-16 rounded-xl border-2 border-slate-200 shadow-inner"
                      style={{
                        backgroundColor: association.branding.secondaryColor,
                      }}
                    />
                    <div className="font-mono font-bold text-slate-700 uppercase">
                      {association.branding.secondaryColor}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black uppercase text-slate-500 mb-2">
                    Accent Color
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-16 h-16 rounded-xl border-2 border-slate-200 shadow-inner"
                      style={{
                        backgroundColor: association.branding.accentColor,
                      }}
                    />
                    <div className="font-mono font-bold text-slate-700 uppercase">
                      {association.branding.accentColor}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Children Associations */}
          {children.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Building2 size={24} />
                Child Associations ({children.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child: any) => {
                  const childLevelInfo = getLevelInfo(child.level ?? 0);
                  return (
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
                          {childLevelInfo.label}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clubs */}
          {clubs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
              <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-3">
                <Users size={24} />
                Clubs ({clubs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clubs.map((club: any) => (
                  <Link
                    key={club.id}
                    href={`/admin/clubs/${club.id}`}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border-2 border-slate-200"
                  >
                    <div className="w-10 h-10 rounded-lg text-black flex items-center justify-center font-black text-sm">
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={club.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        club.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-sm">
                        {club.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {club.suburb || club.region}
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
  } catch (error) {
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
                  {getErrorMessage(error) || "Failed to load association data"}
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
