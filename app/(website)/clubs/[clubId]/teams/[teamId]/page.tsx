// app/(website)/clubs/[clubId]/teams/[teamId]/page.tsx
// Team detail page wrapper

import TeamDetailView from "./TeamDetailView";

interface PageProps {
  params: Promise<{
    clubId: string;
    teamId: string;
  }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { clubId, teamId } = await params;

  return <TeamDetailView clubId={clubId} teamId={teamId} />;
}
