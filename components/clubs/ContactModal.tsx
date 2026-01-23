// components/clubs/ContactModal.tsx
// Contact modal with header, compact size, rounded table

"use client";

import { Club } from "@/app/admin/types/clubs";
import Image from "next/image";

interface ContactModalProps {
  club: Club;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({
  club,
  isOpen,
  onClose,
}: ContactModalProps) {
  if (!isOpen) return null;

  // Generate Google Maps URL from address
  const getGoogleMapsUrl = () => {
    const parts = [
      club.address.street,
      club.address.suburb,
      club.address.state,
      club.address.postcode,
      club.address.country || "Australia",
    ].filter(Boolean);

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      parts.join(", ")
    )}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Club Colors */}
        <div
          className="py-6 px-6 rounded-t-3xl"
          style={{
            background: `linear-gradient(135deg, ${club.colors.primary} 0%, ${club.colors.secondary} 100%)`,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Logo */}
            {club.logo && (
              <div className="w-16 h-16 rounded-full bg-white p-2 shadow-lg">
                <Image
                  src={club.logo}
                  alt={club.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Title */}
            <div className="text-white">
              <h2 className="text-2xl font-black uppercase">Contact</h2>
              <p className="text-lg font-bold text-white/90">{club.name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[65vh] overflow-y-auto">
          {/* TOP SECTION - Contact/Location on Left, Map on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* LEFT COLUMN - Contact & Location */}
            <div className="space-y-3">
              {/* Contact Information */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span>📞</span>
                  Contact Information
                </h3>

                <div className="space-y-2">
                  {club.contact.email && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        Email
                      </p>
                      <a
                        href={`mailto:${club.contact.email}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {club.contact.email}
                      </a>
                    </div>
                  )}

                  {club.contact.phone && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        Phone
                      </p>
                      <a
                        href={`tel:${club.contact.phone}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {club.contact.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Address */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span>📍</span>
                  Location
                </h3>

                <div className="space-y-2">
                  {club.homeGround && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        Home Ground
                      </p>
                      <p className="text-xs font-medium text-slate-900">
                        {club.homeGround}
                      </p>
                    </div>
                  )}

                  {(club.address.street || club.address.suburb) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        Address
                      </p>
                      <div className="text-xs text-slate-700 space-y-0.5">
                        {club.address.street && <p>{club.address.street}</p>}
                        {club.address.suburb && (
                          <p>
                            {club.address.suburb}, {club.address.state}{" "}
                            {club.address.postcode}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Google Maps Button */}
                  {(club.address.street || club.address.suburb) && (
                    <a
                      href={getGoogleMapsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full mt-2 px-3 py-2 bg-indigo-600 text-white text-center rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🗺️ Open in Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Google Maps */}
            <div
              className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
              style={{ height: "fit-content" }}
            >
              {club.address.street || club.address.suburb ? (
                <iframe
                  width="100%"
                  height="100%"
                  style={{ minHeight: "280px", display: "block" }}
                  frameBorder="0"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    [
                      club.address.street,
                      club.address.suburb,
                      club.address.state,
                      club.address.postcode,
                      "Australia",
                    ]
                      .filter(Boolean)
                      .join(", ")
                  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full min-h-[280px] bg-slate-200 flex items-center justify-center">
                  <p className="text-slate-500 text-sm">No address available</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM SECTION - Committee Table */}
          {club.committee && club.committee.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
                <span>👥</span>
                Committee Members ({club.committee.length})
              </h3>

              {/* Committee Table with Rounded Corners */}
              <div className="overflow-hidden rounded-lg border border-slate-300">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        background: `linear-gradient(135deg, ${club.colors.primary} 0%, ${club.colors.secondary} 100%)`,
                      }}
                    >
                      <th className="text-left py-3 px-4 font-black text-white text-xs uppercase">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-black text-white text-xs uppercase">
                        Position
                      </th>
                      <th className="text-left py-3 px-4 font-black text-white text-xs uppercase">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-black text-white text-xs uppercase">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {club.committee.map((member, index) => (
                      <tr
                        key={member.id}
                        className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 text-sm">
                            {member.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {member.position}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-xs text-slate-600 hover:text-indigo-600 break-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {member.email}
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {member.phone ? (
                            <a
                              href={`tel:${member.phone}`}
                              className="text-xs text-slate-600 hover:text-indigo-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {member.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-slate-200 text-slate-900 rounded-lg font-bold hover:bg-slate-300 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
