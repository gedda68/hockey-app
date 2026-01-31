// app/admin/clubs/edit/[id]/page.tsx
import EditClubPageClient from "./EditClubPageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the params promise to get the actual id
  const { id } = await params;

  return <EditClubPageClient id={id} />;
}
