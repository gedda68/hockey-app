// app/admin/clubs/[clubId]/page.tsx
// Club overview — redirects to the club's edit/management page.

import { redirect } from "next/navigation";

export default async function ClubOverviewPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  redirect(`/admin/clubs/${clubId}/edit`);
}
