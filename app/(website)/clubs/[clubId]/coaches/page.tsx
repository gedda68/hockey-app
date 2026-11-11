// app/(website)/clubs/[clubId]/coaches/page.tsx
// Active coaches at the club and the teams they coach, each team a pill linking to that team's page. Opened from the
// dashboard's Coaches card.

import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { getClubActiveCoaches, resolveClub } from "@/lib/clubs/clubPortalData";
import ClubPeopleList from "@/components/clubs/ClubPeopleList";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { clubId } = await params;
  return { title: `Coaches | ${clubId}` };
}

export default async function ClubCoachesPage({ params }: PageProps) {
  const { clubId } = await params;
  const db = (await clientPromise).db(process.env.DB_NAME?.trim() || "hockey-app");
  const club = await resolveClub(db, clubId);
  if (!club) notFound();

  return <ClubPeopleList clubId={clubId} kind="coach" people={await getClubActiveCoaches(db, club)} />;
}
