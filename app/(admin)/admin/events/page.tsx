// app/(admin)/admin/events/page.tsx
// Global admin events dashboard — all events visible to the current user's scope.
"use client";

import EventsAdminClient from "@/components/admin/events/EventsAdminClient";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AdminEventsPage() {
  const { user } = useAuth();

  // Build API params and create-route pre-fills based on the user's scope
  const apiParams: Record<string, string> = {};
  let createQueryString = "";

  if (user?.role === "association-admin" || user?.role === "assoc-committee") {
    if (user.associationId) {
      apiParams.associationId = user.associationId;
      createQueryString = `scope=association&scopeId=${user.associationId}`;
    }
  } else if (
    user?.role === "club-admin" ||
    user?.role === "club-committee" ||
    user?.role === "registrar"
  ) {
    const clubRef = user.clubId ?? user.clubSlug ?? "";
    if (clubRef) {
      apiParams.clubId = clubRef;
      createQueryString = `scope=club&scopeId=${clubRef}&scopeName=${encodeURIComponent(user.clubName ?? "")}`;
    }
  }
  // super-admin and media-marketing see everything (no filter)

  return (
    <EventsAdminClient
      scopeTitle="Events"
      scopeSubtitle="Manage all events across your organisation"
      apiParams={apiParams}
      editBasePath="/admin/events"
      createQueryString={createQueryString}
    />
  );
}
