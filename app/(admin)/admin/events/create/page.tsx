// app/(admin)/admin/events/create/page.tsx
// Create-new-event page — reads scope context from query params.
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import EventCreateEditForm from "@/components/admin/events/EventCreateEditForm";

function CreateEventContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const defaultScope   = (sp.get("scope") ?? undefined) as "association" | "club" | "team" | undefined;
  const defaultScopeId = sp.get("scopeId") ?? undefined;
  const defaultScopeName = sp.get("scopeName") ?? undefined;

  // After saving, go back to whichever events list is appropriate
  const handleSaved = (eventId: string) => {
    // If we came from a scoped page (assoc/club), go back there
    const referrer = sp.get("returnTo");
    if (referrer) {
      router.push(referrer);
    } else {
      router.push(`/admin/events`);
    }
    void eventId;
  };

  return (
    <EventCreateEditForm
      defaultScope={defaultScope}
      defaultScopeId={defaultScopeId}
      defaultScopeName={defaultScopeName}
      onSaved={handleSaved}
      onCancel={() => router.back()}
    />
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateEventContent />
    </Suspense>
  );
}
