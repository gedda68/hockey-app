import Link from "next/link";
import {
  Home,
  Users,
  Shield,
  Calendar,
  Settings,
  UserRoundPlus,
} from "lucide-react";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";

type ClubShell = {
  name?: string;
  shortName?: string;
  established?: string;
  logo?: string;
  colors?: { primary?: string; secondary?: string };
};

export default function ClubSiteShell({
  club,
  routeSlug,
  children,
}: {
  club: ClubShell;
  /** Canonical segment for /clubs/[routeSlug]/… links */
  routeSlug: string;
  children: React.ReactNode;
}) {
  const primaryColor = club.colors?.primary || "#06054e";
  const secondaryColor = club.colors?.secondary || "#090836";
  const clubsDirectoryUrl = `${buildApexSiteOrigin()}/clubs`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header
        className="shadow-lg mt-12"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {club.logo && (
                <img
                  src={club.logo}
                  alt={club.name || ""}
                  className="w-16 h-16 object-contain bg-white rounded-lg p-2"
                />
              )}
              <div>
                <h1 className="text-3xl font-black text-white uppercase">
                  {club.name}
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  {club.shortName} • Est. {club.established || "N/A"}
                </p>
              </div>
            </div>

            <Link
              href={clubsDirectoryUrl}
              className="p-1 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              title="All clubs"
            >
              <Home className="text-white" size={24} />
            </Link>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <NavLink href={`/clubs/${routeSlug}`} icon={<Shield size={18} />}>
              Dashboard
            </NavLink>
            <NavLink
              href={`/clubs/${routeSlug}/members`}
              icon={<Users size={18} />}
            >
              Members
            </NavLink>
            <NavLink
              href={`/clubs/${routeSlug}/teams`}
              icon={<Shield size={18} />}
            >
              Teams
            </NavLink>
            <NavLink
              href={`/clubs/${routeSlug}/fixtures`}
              icon={<Calendar size={18} />}
            >
              Fixtures
            </NavLink>
            <NavLink
              href={`/clubs/${routeSlug}/register`}
              icon={<UserRoundPlus size={18} />}
            >
              Register
            </NavLink>
            <NavLink
              href={`/clubs/${routeSlug}/settings`}
              icon={<Settings size={18} />}
            >
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all whitespace-nowrap"
    >
      {icon}
      {children}
    </Link>
  );
}
