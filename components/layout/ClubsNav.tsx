"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "../../components/ui/Button";

interface ClubsNavClientProps {
  clubs: any[]; // Use any to handle both old and new schemas
}

// Generate slug from club name as fallback
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ClubsNav({ clubs }: ClubsNavClientProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // DEBUG: Log clubs data on mount
  useEffect(() => {
    console.log("🔍 ClubsNav - Total clubs:", clubs.length);
    if (clubs.length > 0) {
      const firstClub = clubs[0];
      console.log("📊 Sample club fields:", Object.keys(firstClub));
      console.log("📊 Sample club data:", firstClub);
    }
  }, [clubs]);

  const handleImageError = (clubId: string) => {
    setImageErrors((prev) => new Set(prev).add(clubId));
  };

  if (clubs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Site Logo/Brand - Left Side */}

        {/* Desktop View */}
        <div className="hidden md:flex items-center gap-1 py-2 overflow-x-auto">
          {/* Club Links */}
          {clubs.map((club) => {
            // Handle both old and new field names
            const clubName = club.name || club.title;
            const clubShortName = club.shortName || club.abbreviation;
            const clubId = club.id || club._id?.toString() || club.slug;

            if (!clubName) {
              console.warn("⚠️ Skipping club without name/title:", club);
              return null;
            }

            // Use slug from database, fallback to generated
            const slug = club.slug || generateSlug(clubName);

            // Check for icon field (multiple possible fields)
            const iconUrl = club.iconSrc || club.icon || club.logo;
            const showIcon = iconUrl && !imageErrors.has(clubId);

            // Handle colors (old and new format)
            const primaryColor =
              club.colors?.primary || club.color || "#06054e";

            return (
              <Link
                key={clubId}
                href={`/clubs/${slug}`}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all group min-w-[64px]"
                title={clubName}
              >
                {/* Icon/Logo or Fallback */}
                <div className="w-10 h-10 mb-1 flex items-center justify-center">
                  {showIcon && typeof iconUrl === "string" ? (
                    <Image
                      src={iconUrl}
                      alt={clubName}
                      width={40}
                      height={40}
                      className="object-contain transition-transform group-hover:scale-110"
                      onError={() => handleImageError(clubId)}
                      unoptimized={iconUrl.startsWith("/")}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 flex items-center justify-center text-white text-xs font-black rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {clubShortName?.substring(0, 3) ||
                        clubName?.substring(0, 3) ||
                        "???"}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight text-center leading-tight">
                  {clubShortName || clubName?.split(" ")[0] || "Club"}
                </span>
              </Link>
            );
          })}

          {/* View All Link */}
          <Link
            href="/clubs"
            className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all min-w-[64px] ml-2 border-l border-slate-200"
          >
            <div className="w-10 h-10 mb-1 flex items-center justify-center bg-[#06054e] rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
                <circle cx="5" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
              </svg>
            </div>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight">
              All Clubs
            </span>
          </Link>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {/* Site Logo - Mobile */}
          <Link
            href="/"
            className="flex items-center gap-2 py-2 border-b border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#06054e]/10 flex items-center justify-center text-[#06054e]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-[#06054e] uppercase tracking-tight leading-tight">
                Brisbane Hockey League
              </div>
            </div>
          </Link>

          {/* Expanded Clubs List */}
          {isExpanded && (
            <div className="pb-3 grid grid-cols-4 gap-2">
              {clubs.map((club) => {
                const clubName = club.name || club.title;
                const clubShortName = club.shortName || club.abbreviation;
                const clubId = club.id || club._id?.toString() || club.slug;

                if (!clubName) return null;

                const slug = club.slug || generateSlug(clubName);
                const iconUrl = club.iconSrc || club.icon || club.logo;
                const showIcon = iconUrl && !imageErrors.has(clubId);
                const primaryColor =
                  club.colors?.primary || club.color || "#06054e";

                return (
                  <Link
                    key={clubId}
                    href={`/clubs/${slug}`}
                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all"
                    onClick={() => setIsExpanded(false)}
                  >
                    <div className="w-10 h-10 mb-1 flex items-center justify-center">
                      {showIcon && typeof iconUrl === "string" ? (
                        <Image
                          src={iconUrl}
                          alt={clubName}
                          width={40}
                          height={40}
                          className="object-contain"
                          onError={() => handleImageError(clubId)}
                          unoptimized={iconUrl.startsWith("/")}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 flex items-center justify-center text-white text-xs font-black rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {clubShortName?.substring(0, 3) ||
                            clubName?.substring(0, 3) ||
                            "???"}
                        </div>
                      )}
                    </div>
                    <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tight text-center leading-tight">
                      {clubShortName || clubName?.split(" ")[0] || "Club"}
                    </span>
                  </Link>
                );
              })}

              <Link
                href="/clubs"
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all"
                onClick={() => setIsExpanded(false)}
              >
                <div className="w-10 h-10 mb-1 flex items-center justify-center bg-[#06054e] rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </div>
                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tight">
                  All
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
