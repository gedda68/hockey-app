// app/admin/clubs/[id]/edit/page.tsx
// Edit club page - Complete with ClubForm integration

import { notFound } from "next/navigation";
import ClubForm from "@/components/admin/clubs/ClubForm";

async function getClub(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/clubs/${id}`, {
      cache: "no-store",
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

async function getAssociations() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/associations`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch associations:", res.status);
      return [];
    }

    const data = await res.json();
    return data.associations || [];
  } catch (error) {
    console.error("Error fetching associations:", error);
    return [];
  }
}

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 15+ requires awaiting params
  const { id } = await params;

  const [club, associations] = await Promise.all([
    getClub(id),
    getAssociations(),
  ]);

  if (!club) {
    notFound();
  }

  return (
    <ClubForm clubId={id} initialData={club} associations={associations} />
  );
}
