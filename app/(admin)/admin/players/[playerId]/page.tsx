// app/(admin)/admin/players/[playerId]/page.tsx
// A player is a member, so the profile lives at /admin/members/[id]. This keeps
// /admin/players/<id> (typed, bookmarked, or linked) from 404ing.

import { redirect } from "next/navigation";

export default async function PlayerProfileRedirect({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  redirect(`/admin/members/${encodeURIComponent(playerId)}`);
}
