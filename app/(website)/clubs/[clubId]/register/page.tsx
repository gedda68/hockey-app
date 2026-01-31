// app/(website)/clubs/[clubId]/register/page.tsx
// Club registration page

import ClubRegistrationForm from "@/components/clubs/ClubRegistrationForm";
import clientPromise from "@/lib/mongodb";

interface PageProps {
  params: Promise<{
    clubId: string;
  }>;
}

export default async function ClubRegisterPage({ params }: PageProps) {
  const { clubId } = await params;

  // Fetch club details
  const client = await clientPromise;
  const db = client.db();

  const club = await db.collection("clubs").findOne({
    $or: [{ id: clubId }, { slug: clubId }],
  });

  if (!club) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6">
          <p className="text-red-800 font-bold">Club not found</p>
        </div>
      </div>
    );
  }

  // Fetch available roles
  const roles = await db
    .collection("club-roles")
    .find({ isActive: true })
    .toArray();

  // TODO: Get current user/member ID from session
  const memberId = "temp-member-id"; // Replace with actual auth

  // TODO: Fetch member's current registrations
  const currentRegistrations = {
    hasPrimaryClub: false,
    primaryClub: undefined,
    secondaryClubs: [],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ClubRegistrationForm
        club={{
          id: club.id,
          name: club.name,
          slug: club.slug,
        }}
        memberId={memberId}
        roles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
        }))}
        currentRegistrations={currentRegistrations}
      />
    </div>
  );
}
