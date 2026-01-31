// app/(website)/clubs/[clubId]/teams/page.tsx
// Teams list page

import TeamsList from "./TeamsList";

interface PageProps {
  params: Promise<{
    clubId: string;
  }>;
}

export default async function TeamsListPage({ params }: PageProps) {
  const { clubId } = await params;

  return <TeamsList clubId={clubId} />;
}
