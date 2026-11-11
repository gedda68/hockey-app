// app/(website)/clubs/[clubId]/teams/manage/page.tsx
// Team management (create / filter / edit) — requires club access.

import TeamsList from "../TeamsList";

export default async function ManageTeamsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return <TeamsList clubId={clubId} />;
}
