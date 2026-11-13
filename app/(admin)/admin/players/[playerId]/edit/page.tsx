// app/(admin)/admin/players/[playerId]/edit/page.tsx
// A player is a member: all player information lives on, and is edited through, the member record.
// This keeps /admin/players/<id>/edit (typed, bookmarked or linked) pointing at the single source of truth.

import { redirect } from "next/navigation";

export default async function PlayerEditRedirect({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  redirect(`/admin/members/${encodeURIComponent(playerId)}/edit`);
}
