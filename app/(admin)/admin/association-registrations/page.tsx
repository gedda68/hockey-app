"use client";

import RegistrationsTable from "@/components/admin/registrations/RegistrationsTable";

export default function AssociationRegistrationsPage() {
  return (
    <RegistrationsTable
      title="Association Registrations"
      subtitle="Every member registered with your association (including through its clubs), by season, with the fee for this level."
      endpoint="/api/admin/association-registrations"
    />
  );
}
