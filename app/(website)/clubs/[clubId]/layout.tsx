// app/clubs/[clubId]/layout.tsx
// Shared layout for all club pages

import Link from "next/link";
import { Home, Users, Shield, Calendar, Settings } from "lucide-react";

async function getClub(clubId: string) {
  // Try slug first, then ID
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/api/clubs/${clubId}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const club = await getClub(clubId);

  if (!club) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-600">Club Not Found</h1>
          <p className="mt-4 text-slate-600">
            The club you're looking for doesn't exist.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = club.colors?.primary || "#06054e";
  const secondaryColor = club.colors?.secondary || "#090836";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Club Header */}
      <header
        className="shadow-lg"
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
                  alt={club.name}
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
              href="/"
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              title="Home"
            >
              <Home className="text-white" size={24} />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">
            <NavLink href={`/clubs/${clubId}`} icon={<Shield size={18} />}>
              Dashboard
            </NavLink>
            <NavLink
              href={`/clubs/${clubId}/members`}
              icon={<Users size={18} />}
            >
              Members
            </NavLink>
            <NavLink
              href={`/clubs/${clubId}/teams`}
              icon={<Shield size={18} />}
            >
              Teams
            </NavLink>
            <NavLink
              href={`/clubs/${clubId}/fixtures`}
              icon={<Calendar size={18} />}
            >
              Fixtures
            </NavLink>
            <NavLink
              href={`/clubs/${clubId}/settings`}
              icon={<Settings size={18} />}
            >
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page Content */}
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
