// app/(website)/clubs/[clubId]/teams/[teamId]/page.tsx
// Team detail page wrapper

import type { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import TeamDetailView from "./TeamDetailView";

interface PageProps {
  params: Promise<{
    clubId: string;
    teamId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamId } = await params;
  try {
    const client = await clientPromise;
    const team = await client
      .db("hockey-app")
      .collection("teams")
      .findOne({ teamId }, { projection: { displayName: 1, name: 1, season: 1 } });
    const label =
      (team?.displayName as string | undefined) ||
      (team?.name as string | undefined) ||
      "Team";
    const season = team?.season ? ` (${team.season})` : "";
    const title = `${label}${season} | Club team`;
    return { title, description: `Roster and details for ${label}.` };
  } catch {
    return { title: "Team" };
  }
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { clubId, teamId } = await params;

  return <TeamDetailView clubId={clubId} teamId={teamId} />;
}
