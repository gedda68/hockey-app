// components/admin/events/EventsAdminClient.tsx
// Shared admin events list + calendar UI — used by all scope-specific pages.

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  List,
  Plus,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Event } from "@/types/event";
import EventCalendar from "@/components/events/EventCalendar";
import EventCard from "@/components/admin/events/EventCard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventsAdminClientProps {
  /** Label shown in the page header */
  scopeTitle: string;
  /** Subtitle/description e.g. "Queensland Hockey Association events" */
  scopeSubtitle?: string;
  /** API query params appended to /api/admin/events */
  apiParams?: Record<string, string>;
  /** Base route for editing an event, e.g. "/admin/events" — [id]/edit appended */
  editBasePath?: string;
  /** Pre-filled query string for the create route */
  createQueryString?: string;
}

type ViewMode = "list" | "calendar";

// ── Filter option lists ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "competition", label: "Competition" },
  { value: "finals", label: "Finals" },
  { value: "representative", label: "Representative" },
  { value: "clinic", label: "Clinic" },
  { value: "officials", label: "Officials" },
  { value: "social", label: "Social" },
  { value: "training", label: "Training" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
  { value: "completed", label: "Completed" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventsAdminClient({
  scopeTitle,
  scopeSubtitle,
  apiParams = {},
  editBasePath = "/admin/events",
  createQueryString = "",
}: EventsAdminClientProps) {
  const router = useRouter();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Fetch events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(apiParams);
        const res = await fetch(`/api/admin/events?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message ?? `Server error: ${res.status}`);
        }
        const data: Event[] = await res.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Client-side filtering ───────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return events.filter((ev) => {
      // Search
      if (
        q &&
        !ev.name.toLowerCase().includes(q) &&
        !ev.shortDescription?.toLowerCase().includes(q) &&
        !ev.location?.toLowerCase().includes(q) &&
        !ev.venue?.name?.toLowerCase().includes(q)
      ) {
        return false;
      }

      // Category
      if (category && ev.category !== category) return false;

      // Status
      if (status && ev.status !== status) return false;

      // Date from
      if (fromTs !== null && new Date(ev.startDate).getTime() < fromTs)
        return false;

      // Date to
      const evEnd = ev.endDate ?? ev.startDate;
      if (toTs !== null && new Date(evEnd).getTime() > toTs) return false;

      return true;
    });
  }, [events, search, category, status, dateFrom, dateTo]);

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const handleEdit = useCallback(
    (event: Event) => {
      router.push(`${editBasePath}/${event.id}/edit`);
    },
    [router, editBasePath]
  );

  const handleView = useCallback(
    (event: Event) => {
      router.push(`${editBasePath}/${event.id}/edit`);
    },
    [router, editBasePath]
  );

  const handleCreate = useCallback(
    (date?: Date) => {
      const qs = new URLSearchParams(
        createQueryString ? Object.fromEntries(new URLSearchParams(createQueryString)) : {}
      );
      if (date) {
        qs.set("startDate", date.toISOString().split("T")[0]);
      }
      router.push(`/admin/events/create${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
    [router, createQueryString]
  );

  // ── Delete flow ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (event: Event) => {
    const confirmed = window.confirm(
      `Delete "${event.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error: ${res.status}`);
      }
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.success(`"${event.name}" deleted successfully.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete event."
      );
    }
  }, []);

  // ── Create URL ──────────────────────────────────────────────────────────────
  const createUrl = `/admin/events/create${createQueryString ? `?${createQueryString}` : ""}`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 gap-5">
      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1
            className="text-2xl font-black uppercase tracking-tight"
            style={{ color: "#06054e" }}
          >
            {scopeTitle}
          </h1>
          {scopeSubtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{scopeSubtitle}</p>
          )}
        </div>

        {/* New Event button */}
        <a
          href={createUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#06054e] font-black uppercase text-sm tracking-wide transition-colors duration-150 shadow shrink-0"
        >
          <Plus size={16} />
          New Event
        </a>
      </div>

      {/* ── VIEW TOGGLE PILLS ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 w-fit">
        {(["list", "calendar"] as ViewMode[]).map((mode) => {
          const isActive = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-colors duration-150 ${
                isActive
                  ? "bg-[#06054e] text-white shadow"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              }`}
              aria-pressed={isActive}
            >
              {mode === "list" ? <List size={14} /> : <Calendar size={14} />}
              {mode === "list" ? "List" : "Calendar"}
            </button>
          );
        })}
      </div>

      {/* ── FILTER ROW (list mode only) ───────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] transition"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] transition"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] transition"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter from date"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] transition"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Filter to date"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] transition"
          />
        </div>
      )}

      {/* ── LOADING ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "#06054e" }}
          />
        </div>
      )}

      {/* ── ERROR ─────────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* LIST VIEW */}
          {viewMode === "list" && (
            <>
              {filteredEvents.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                  <div
                    className="p-5 rounded-2xl"
                    style={{ backgroundColor: "#06054e" + "15" }}
                  >
                    <Calendar size={36} style={{ color: "#06054e" }} />
                  </div>
                  <div>
                    <p
                      className="text-base font-black uppercase"
                      style={{ color: "#06054e" }}
                    >
                      No Events Found
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {events.length === 0
                        ? "Get started by creating your first event."
                        : "Try adjusting your filters."}
                    </p>
                  </div>
                  {events.length === 0 && (
                    <a
                      href={createUrl}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#06054e] font-black uppercase text-sm tracking-wide transition-colors duration-150"
                    >
                      <Plus size={15} />
                      New Event
                    </a>
                  )}
                </div>
              ) : (
                /* Event list */
                <div className="flex flex-col gap-3">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onView={handleView}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* CALENDAR VIEW */}
          {viewMode === "calendar" && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <EventCalendar
                events={filteredEvents}
                onEventClick={handleView}
                onCreateEvent={handleCreate}
                onEditEvent={handleEdit}
                onDeleteEvent={handleDelete}
                currentUser={null}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
