// components/clubs/ClubsGrid.tsx
// Client component that handles modals and club card interactions

"use client";

import { useState } from "react";
import Image from "next/image";
import AboutModal from "./AboutModal";
import ContactModal from "./ContactModal";
import { Club } from "../../app/admin/types/clubs";

interface ClubsGridProps {
  clubs: Club[];
}

export default function ClubsGrid({ clubs }: ClubsGridProps) {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const handleAboutClick = (club: Club) => {
    setSelectedClub(club);
    setShowAboutModal(true);
  };

  const handleContactClick = (club: Club) => {
    setSelectedClub(club);
    setShowContactModal(true);
  };

  return (
    <>
      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <div
            key={club.id}
            className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            {/* Club Icon/Logo */}
            <div className="h-20 mb-4 flex items-center justify-center">
              {club.logo ? (
                <Image
                  src={club.logo}
                  alt={club.name}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black"
                  style={{ backgroundColor: club.colors.primary }}
                >
                  {club.shortName?.substring(0, 3) || club.name.substring(0, 3)}
                </div>
              )}
            </div>

            {/* Club Name */}
            <h2 className="text-xl font-black uppercase text-slate-900 mb-2 text-center">
              {club.name} {club.shortName && `(${club.shortName})`}
            </h2>

            {/* Description */}
            {club.description && (
              <div
                className="text-sm text-slate-600 text-center mb-4 line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html:
                    club.description.substring(0, 150) +
                    (club.description.length > 150 ? "..." : ""),
                }}
              />
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* About Button */}
              <button
                onClick={() => handleAboutClick(club)}
                className="block w-full text-center px-4 py-2 rounded-full text-sm font-black border-2 transition-all hover:opacity-90"
                style={{
                  borderColor: club.colors.primary,
                  backgroundColor: club.colors.secondary,
                  color: "white",
                }}
              >
                About
              </button>

              {/* Contact Button */}
              <button
                onClick={() => handleContactClick(club)}
                className="block w-full text-center px-4 py-2 rounded-full text-sm font-black border-2 transition-all"
                style={{
                  borderColor: club.colors.primary,
                  backgroundColor: club.colors.secondary,
                  color: "white",
                }}
              >
                Contact
              </button>

              {/* Website Button */}
              {club.contact.website && (
                <a
                  href={club.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2 rounded-full text-sm font-black text-white transition-all hover:opacity-90"
                  style={{
                    backgroundColor: club.colors.primary,
                  }}
                >
                  Visit Website
                </a>
              )}
            </div>

            {/* Social Media */}
            {(club.socialMedia?.facebook ||
              club.socialMedia?.instagram ||
              club.socialMedia?.twitter) && (
              <div className="flex justify-center gap-3 mt-4">
                {club.socialMedia.facebook && (
                  <a
                    href={club.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                    style={{ backgroundColor: club.colors.primary }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9.101 24v-11.063h-3.642v-4.212h3.642v-3.103c0-3.607 2.199-5.617 5.448-5.617 1.556 0 3.181.278 3.181.278v3.503h-1.795c-1.787 0-2.344 1.109-2.344 2.247v2.692h3.948l-.631 4.212h-3.317v11.063h-4.842z" />
                    </svg>
                  </a>
                )}

                {club.socialMedia.instagram && (
                  <a
                    href={club.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                    style={{ backgroundColor: club.colors.primary }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}

                {club.socialMedia.twitter && (
                  <a
                    href={club.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                    style={{ backgroundColor: club.colors.primary }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {selectedClub && (
        <>
          <AboutModal
            club={selectedClub}
            isOpen={showAboutModal}
            onClose={() => setShowAboutModal(false)}
          />
          <ContactModal
            club={selectedClub}
            isOpen={showContactModal}
            onClose={() => setShowContactModal(false)}
          />
        </>
      )}
    </>
  );
}
