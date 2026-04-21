// app/(admin)/admin/associations/[associationId]/events/page.tsx
// Association-scoped events management page.
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import EventsAdminClient from "@/components/admin/events/EventsAdminClient";

interface AssociationMeta {
  name?: string;
  id?: string;
}

export default function AssociationEventsPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const [meta, setMeta] = useState<AssociationMeta>({});

  // Fetch association name for display
  useEffect(() => {
    if (!associationId) return;
    fetch(`/api/admin/associations/${associationId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setMeta({ name: data.name ?? data.shortName, id: associationId });
      })
      .catch(() => {/* silently ignore — name is optional */});
  }, [associationId]);

  const displayName = meta.name ?? associationId;
  const createQs = `scope=association&scopeId=${associationId}&scopeName=${encodeURIComponent(displayName)}&returnTo=/admin/associations/${associationId}/events`;

  return (
    <EventsAdminClient
      scopeTitle="Association Events"
      scopeSubtitle={`Events for ${displayName}`}
      apiParams={{ associationId }}
      editBasePath="/admin/events"
      createQueryString={createQs}
    />
  );
}
