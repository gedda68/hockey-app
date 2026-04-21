// app/(admin)/admin/clubs/[id]/events/page.tsx
// Club-scoped events management page.
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import EventsAdminClient from "@/components/admin/events/EventsAdminClient";

interface ClubMeta {
  name?: string;
  slug?: string;
}

export default function ClubEventsPage() {
  const { id: clubId } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<ClubMeta>({});

  useEffect(() => {
    if (!clubId) return;
    fetch(`/api/admin/clubs/${clubId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setMeta({ name: data.name ?? data.shortName, slug: data.slug });
      })
      .catch(() => {});
  }, [clubId]);

  const displayName = meta.name ?? clubId;
  const scopeRef    = meta.slug ?? clubId;
  const createQs    = `scope=club&scopeId=${scopeRef}&scopeName=${encodeURIComponent(displayName)}&returnTo=/admin/clubs/${clubId}/events`;

  return (
    <EventsAdminClient
      scopeTitle="Club Events"
      scopeSubtitle={`Events for ${displayName}`}
      apiParams={{ clubId: scopeRef }}
      editBasePath="/admin/events"
      createQueryString={createQs}
    />
  );
}
