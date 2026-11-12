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
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { clubId } = await params;
  return { title: `Coaches | ${clubId}` };
}

export default async function ClubCoachesPage({ params, searchParams }: PageProps) {
  const { clubId } = await params;
  const { page, q } = await searchParams;
  const db = (await clientPromise).db(process.env.DB_NAME?.trim() || "hockey-app");
  const club = await resolveClub(db, clubId);
  if (!club) notFound();

  return <ClubPeopleList clubId={clubId} kind="coach" page={Number(page) || 1} query={q ?? ""} people={await getClubActiveCoaches(db, club)} />;
}
