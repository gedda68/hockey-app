// app/(admin)/admin/clubs/[id]/events/page.tsx
// Club-scoped events management page.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EventsAdminClient from "@/components/admin/events/EventsAdminClient";

interface ClubMeta {
  name?: string;
  slug?: string;
}

export default function ClubEventsPage() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<ClubMeta>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/clubs/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const club = data?.club as ClubMeta | undefined;
        if (club) setMeta({ name: club.name ?? club.slug, slug: club.slug });
      })
      .catch(() => {});
  }, [id]);

  const displayName = meta.name ?? id;
  const scopeRef = meta.slug ?? id;
  const createQs = `scope=club&scopeId=${scopeRef}&scopeName=${encodeURIComponent(
    displayName,
  )}&returnTo=/admin/clubs/${id}/events`;

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

