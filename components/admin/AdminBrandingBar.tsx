// components/admin/AdminBrandingBar.tsx
// Thin branding bar showing club or association colors for scoped admin users

"use client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useEffect, useState } from "react";

interface BrandingData {
  name: string;
  shortName?: string;
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
}

const CLUB_SCOPED_ROLES = [
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "team-selector",
  "volunteer",
];

const ASSOC_SCOPED_ROLES = [
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
];

export default function AdminBrandingBar() {
  const { user } = useAuth();
  const [branding, setBranding] = useState<BrandingData | null>(null);

  useEffect(() => {
    if (!user) return;

    const isClubRole = CLUB_SCOPED_ROLES.includes(user.role);
    const isAssocRole = ASSOC_SCOPED_ROLES.includes(user.role);

    if (isClubRole && (user.clubSlug || user.clubId)) {
      const clubRef = user.clubSlug || user.clubId;
      fetch(`/api/admin/clubs/${clubRef}`)
        .then((r) => r.json())
        .then((data) => {
          const club = data.club;
          if (club) {
            setBranding({
              name: club.name,
              shortName: club.shortName,
              primaryColor: club.colors?.primaryColor || "#06054e",
              secondaryColor: club.colors?.secondaryColor || "#FFD700",
              logo: club.logo,
            });
          }
        })
        .catch(() => {});
    } else if (isAssocRole && user.associationId) {
      fetch(`/api/admin/associations/${user.associationId}`)
        .then((r) => r.json())
        .then((data) => {
          const assoc = data.association || data;
          if (assoc) {
            setBranding({
              name: assoc.name || assoc.fullName,
              shortName: assoc.code || assoc.acronym,
              primaryColor: assoc.branding?.primaryColor || "#06054e",
              secondaryColor: assoc.branding?.secondaryColor || "#FFD700",
              logo: assoc.branding?.logo,
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Super-admins and users with no branding data: render nothing
  if (!branding) return null;

  return (
    <div
      className="w-full text-white py-3 px-6 flex items-center gap-4 shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
      }}
    >
      {branding.logo && (
        <img
          src={branding.logo}
          alt={branding.shortName || branding.name}
          className="h-8 w-8 object-contain rounded"
        />
      )}
      <div>
        <div className="font-black text-sm uppercase tracking-wide">
          {branding.name}
        </div>
        {branding.shortName && (
          <div className="text-xs opacity-80">{branding.shortName}</div>
        )}
      </div>
    </div>
  );
}
