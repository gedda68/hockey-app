// app/(admin)/admin/events/[id]/edit/page.tsx
// Edit an existing event — fetches the event by UUID then renders the form.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import EventCreateEditForm from "@/components/admin/events/EventCreateEditForm";
import type { Event } from "@/types/event";

export default function EditEventPage() {
  const router   = useRouter();
  const { id }   = useParams<{ id: string }>();
  const [event, setEvent]     = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/events/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Event) => {
        setEvent(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
        toast.error("Failed to load event");
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500 font-bold">{error ?? "Event not found"}</p>
        <button onClick={() => router.back()}
          className="px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <EventCreateEditForm
      event={event}
      onSaved={() => router.push("/admin/events")}
      onCancel={() => router.back()}
    />
  );
}
