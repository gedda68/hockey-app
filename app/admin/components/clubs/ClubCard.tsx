// app/admin/components/clubs/ClubCard.tsx
// Updated to show description and about fields

"use client";

import { Club } from "../../types/clubs";
import Image from "next/image";

interface ClubCardProps {
  club: Club;
  onEdit: (club: Club) => void;
  onDelete: (id: string) => void;
}

export default function ClubCard({ club, onEdit, onDelete }: ClubCardProps) {
  // Strip HTML tags from about field for preview
  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").substring(0, 150);
  };

  {
    clubs.map((club) => {
      if (!club.colors || !club.colors.primary) {
        console.warn(
          `Club ID ${club.id} (${club.name}) is missing color data!`
        );
      }
      return <ClubCard key={club.id} club={club} />;
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-slate-200 hover:shadow-xl transition-all">
      {/* Header with gradient */}
      <div
        className="h-32 relative"
        style={{
          background: `linear-gradient(135deg, ${club.colors.primary} 0%, ${club.colors.secondary} 100%)`,
        }}
      >
        {/* Logo */}
        {club.logo && (
          <div className="absolute bottom-0 left-6 transform translate-y-1/2">
            <div className="w-24 h-24 rounded-full bg-white p-2 shadow-lg border-4 border-white">
              <Image
                src={club.logo}
                alt={club.name}
                width={88}
                height={88}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          {club.active ? (
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-black uppercase shadow-md">
              ✓ Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-black uppercase shadow-md">
              ✗ Inactive
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 pb-6 px-6">
        {/* Club Name */}
        <div className="mb-4">
          <h3 className="text-xl font-black text-slate-900 mb-1">
            {club.name}
          </h3>
          {club.shortName && (
            <p className="text-sm font-bold text-slate-500">{club.shortName}</p>
          )}
        </div>

        {/* Description */}
        {club.description && (
          <div className="mb-4">
            <div
              className="text-sm text-slate-600 line-clamp-3"
              dangerouslySetInnerHTML={{
                __html:
                  club.description.substring(0, 200) +
                  (club.description.length > 200 ? "..." : ""),
              }}
            />
          </div>
        )}

        {/* About Preview */}
        {club.about && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-1">About:</p>
            <p className="text-sm text-slate-600 line-clamp-2">
              {stripHtml(club.about)}
              {club.about.length > 150 && "..."}
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          {/* Established */}
          {club.established && (
            <div>
              <p className="text-xs font-bold text-slate-500">Established</p>
              <p className="text-slate-900">{club.established}</p>
            </div>
          )}

          {/* Home Ground */}
          {club.homeGround && (
            <div>
              <p className="text-xs font-bold text-slate-500">Home Ground</p>
              <p className="text-slate-900">{club.homeGround}</p>
            </div>
          )}

          {/* Email */}
          {club.contact.email && (
            <div>
              <p className="text-xs font-bold text-slate-500">Email</p>
              <p className="text-slate-900 truncate">{club.contact.email}</p>
            </div>
          )}

          {/* Phone */}
          {club.contact.phone && (
            <div>
              <p className="text-xs font-bold text-slate-500">Phone</p>
              <p className="text-slate-900">{club.contact.phone}</p>
            </div>
          )}

          {/* Committee Count */}
          {club.committee && club.committee.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500">Committee</p>
              <p className="text-slate-900">{club.committee.length} members</p>
            </div>
          )}

          {/* Colors */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Colors</p>
            <div className="flex gap-1">
              <div
                className="w-6 h-6 rounded border border-slate-300"
                style={{ backgroundColor: club.colors.primary }}
                title="Primary"
              />
              <div
                className="w-6 h-6 rounded border border-slate-300"
                style={{ backgroundColor: club.colors.secondary }}
                title="Secondary"
              />
              {club.colors.accent && (
                <div
                  className="w-6 h-6 rounded border border-slate-300"
                  style={{ backgroundColor: club.colors.accent }}
                  title="Accent"
                />
              )}
            </div>
          </div>
        </div>

        {/* Social Media */}
        {(club.socialMedia?.facebook ||
          club.socialMedia?.instagram ||
          club.socialMedia?.twitter) && (
          <div className="mb-4 flex gap-2">
            {club.socialMedia.facebook && (
              <a
                href={club.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700"
                title="Facebook"
              >
                📘 FB
              </a>
            )}
            {club.socialMedia.instagram && (
              <a
                href={club.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-pink-600 text-white rounded-full text-xs font-bold hover:bg-pink-700"
                title="Instagram"
              >
                📷 IG
              </a>
            )}
            {club.socialMedia.twitter && (
              <a
                href={club.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-sky-600 text-white rounded-full text-xs font-bold hover:bg-sky-700"
                title="Twitter"
              >
                🐦 TW
              </a>
            )}
          </div>
        )}

        {/* Website Link */}
        {club.contact.website && (
          <div className="mb-4">
            <a
              href={club.contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              🌐 Visit Website →
            </a>
          </div>
        )}

        {/* Address */}
        {(club.address.street || club.address.suburb) && (
          <div className="mb-4 text-sm">
            <p className="text-xs font-bold text-slate-500 mb-1">Address</p>
            <p className="text-slate-700">
              {club.address.street && (
                <>
                  {club.address.street}
                  <br />
                </>
              )}
              {club.address.suburb && <>{club.address.suburb}, </>}
              {club.address.state} {club.address.postcode}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={() => onEdit(club)}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg font-bold uppercase shadow-md hover:bg-blue-700 transition-all text-sm"
            style={{ minHeight: "40px" }}
          >
            ✏️ EDIT
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${club.name}?`)) {
                onDelete(club.id);
              }
            }}
            className="px-4 py-3 bg-red-600 text-white rounded-lg font-bold uppercase shadow-md hover:bg-red-700 transition-all text-sm"
            style={{ minHeight: "40px" }}
          >
            🗑️ DELETE
          </button>
        </div>
      </div>
    </div>
  );
}
