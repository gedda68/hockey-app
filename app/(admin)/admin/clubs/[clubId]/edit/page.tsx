// app/admin/clubs/[id]/edit/page.tsx

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ClubForm from "@/components/admin/clubs/ClubForm";

async function getClub(id: string, cookie: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/clubs/${id}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : {},
    });

    if (!res.ok) {
      console.error(`Failed to fetch club ${id}:`, res.status);
      return null;
    }

    const data = await res.json();
    return data.club || null;
  } catch (error) {
    console.error("Error fetching club:", error);
    return null;
  }
}

/** Parent-association dropdown — uses club-scoped API so club admins are not blocked by association.view */
async function getAssociationOptionsForClub(clubRef: string, cookie: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/admin/clubs/${encodeURIComponent(clubRef)}/association-options`,
      {
        cache: "no-store",
        headers: cookie ? { cookie } : {},
      },
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.associations || [];
  } catch {
    return [];
  }
}

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  // Forward the incoming request's session cookie to internal API calls
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";

  const [club, associations] = await Promise.all([
    getClub(clubId, cookie),
    getAssociationOptionsForClub(clubId, cookie),
  ]);

  if (!club) {
    notFound();
  }

  return (
    <ClubForm clubId={clubId} initialData={club} associations={associations} />
  );
}
