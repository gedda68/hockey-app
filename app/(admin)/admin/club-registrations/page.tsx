"use client";

import RegistrationsTable from "@/components/admin/registrations/RegistrationsTable";

export default function ClubRegistrationsPage() {
  return (
    <RegistrationsTable
      title="Club Registrations"
      subtitle="Every member registered with your club, by season, with the full itemised cost (club + association fees)."
      endpoint="/api/admin/club-registrations"
    />
  );
}
