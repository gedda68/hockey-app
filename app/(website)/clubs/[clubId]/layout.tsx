// Shared layout for all club pages - with padding for fixed main header

import Link from "next/link";
import ClubSiteShell from "@/components/clubs/ClubSiteShell";

async function getClub(clubId: string) {
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/api/clubs/${clubId}`,
    {
      cache: "no-store",
    },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center pt-[180px]">
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-600">Club Not Found</h1>
          <p className="mt-4 text-slate-600">
            The club you&apos;re looking for doesn&apos;t exist.
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

  const routeSlug = club.slug || clubId;

  return (
    <ClubSiteShell club={club} routeSlug={routeSlug}>
      {children}
    </ClubSiteShell>
  );
}
