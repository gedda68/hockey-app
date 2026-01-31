// app/(website)/clubs/[clubId]/teams/new/page.tsx
// Create team page

import CreateTeamForm from "./CreateTeamForm";
import clientPromise from "@/lib/mongodb";

interface PageProps {
  params: Promise<{
    clubId: string;
  }>;
}

export default async function CreateTeamPage({ params }: PageProps) {
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

  return <CreateTeamForm clubId={club.id} clubName={club.name} />;
}
