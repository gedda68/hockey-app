// app/admin/clubs/[id]/page.tsx
// Club overview — redirects to the club's edit/management page.

import { redirect } from "next/navigation";

export default async function ClubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/clubs/${id}/edit`);
}
