// app/(website)/competitions/events/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  ChevronRight,
  List,
  CalendarDays,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Event } from "@/types/event";
import { User, getEventPermissions } from "@/lib/permissions/event-permissions";
import EventModal from "@/components/events/EventModal";
import EventCalendar from "@/components/events/EventCalendar";

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  competition: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    label: "Competition",
  },
  finals: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Finals" },
  representative: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    label: "Representative",
  },
  clinic: { bg: "bg-green-500/20", text: "text-green-400", label: "Clinic" },
  officials: {
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    label: "Officials",
  },
  social: { bg: "bg-pink-500/20", text: "text-pink-400", label: "Social" },
  training: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Training" },
  meeting: { bg: "bg-slate-500/20", text: "text-slate-400", label: "Meeting" },
  other: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Other" },
};

const SCOPE_STYLES: Record<string, { bg: string; text: string; icon: string }> =
  {
    city: { bg: "bg-cyan-500/20", text: "text-cyan-400", icon: "🏙️" },
    regional: { bg: "bg-teal-500/20", text: "text-teal-400", icon: "🗺️" },
    state: { bg: "bg-indigo-500/20", text: "text-indigo-400", icon: "📍" },
    national: { bg: "bg-red-500/20", text: "text-red-400", icon: "🇦🇺" },
    international: { bg: "bg-pink-500/20", text: "text-pink-400", icon: "🌏" },
  };

const FILTER_CATEGORIES = [
  { value: "all", label: "All Events" },
  { value: "competition", label: "Competition" },
  { value: "finals", label: "Finals" },
  { value: "representative", label: "Representative" },
  { value: "clinic", label: "Clinic" },
  { value: "officials", label: "Officials" },
];

const FILTER_SCOPES = [
  { value: "all", label: "All Scopes" },
  { value: "city", label: "City" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

function formatDateRange(startDate: string, endDate?: string) {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  if (!endDate || endDate === startDate)
    return start.toLocaleDateString("en-AU", opts);
  const end = new Date(endDate);
  return `${start.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-AU", opts)}`;
}

function getDaysUntil(startDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const diff = Math.ceil(
    (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return null;
  return `In ${diff} days`;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterScope, setFilterScope] = useState("all");
  const [showPast, setShowPast] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock current user - replace with actual auth
  const [currentUser] = useState<User>({
    id: "user123",
    role: "club_admin",
    clubs: ["ipswich-hornets", "bha"],
  });

  useEffect(() => {
    fetch("/api/events?upcoming=true")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { events?: Event[] }) => {
        const evts = Array.isArray(data.events) ? data.events : [];
        evts.sort((a, b) => a.startDate.localeCompare(b.startDate));
        setEvents(evts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading events:", err);
        setError("Could not load events. Please try again later.");
        setLoading(false);
      });
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEvents = events.filter((e) => {
    const eventDate = new Date(e.startDate);
    const isPast = eventDate < today;
    if (!showPast && isPast) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterScope !== "all" && e.scope !== filterScope) return false;
    return true;
  });

  const upcomingCount = events.filter(
    (e) => new Date(e.startDate) >= today,
  ).length;

  const openEventModal = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeEventModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 300);
  };

  const handleCreateEvent = (date?: Date) => {
    console.log("Create event for date:", date);
    // TODO: Open create event form/modal
    alert(`Create event${date ? ` on ${date.toLocaleDateString()}` : ""}`);
  };

  const handleEditEvent = (event: Event) => {
    console.log("Edit event:", event.name);
    // TODO: Open edit event form/modal
    alert(`Edit event: ${event.name}`);
  };

  const handleDeleteEvent = async (event: Event) => {
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEvents(events.filter((e) => e.id !== event.id));
        alert(`Event "${event.name}" deleted successfully`);
      } else {
        alert("Failed to delete event");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting event");
    }
  };

  const canCreate =
    currentUser &&
    currentUser.role !== "public" &&
    currentUser.role !== "member";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 md:px-8 lg:px-12 pb-20">
      <div className="pt-6 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">
            ←
          </span>
          Back
        </button>
      </div>

      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2">
            Events <span className="text-yellow-400">Calendar</span>
          </h1>
          <p className="text-slate-400 text-sm">
            {upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""} this
            season
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleCreateEvent()}
            className="px-6 py-3 bg-yellow-400 text-[#06054e] rounded-xl font-black hover:bg-yellow-300 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Event
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            viewMode === "list"
              ? "bg-yellow-400 text-[#06054e]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <List size={18} />
          List View
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            viewMode === "calendar"
              ? "bg-yellow-400 text-[#06054e]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <CalendarDays size={18} />
          Calendar View
        </button>
      </div>

      {viewMode === "list" && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase transition-colors"
        >
          {showFilters ? "Hide" : "Show"} Filters
        </button>
      )}

      {showFilters && viewMode === "list" && (
        <div className="space-y-4 mb-8 bg-white/5 rounded-2xl p-6 border border-white/10">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    filterCategory === cat.value
                      ? "bg-yellow-400 text-[#06054e]"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2">
              Scope
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_SCOPES.map((scope) => (
                <button
                  key={scope.value}
                  onClick={() => setFilterScope(scope.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    filterScope === scope.value
                      ? "bg-cyan-400 text-[#06054e]"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs font-black uppercase text-slate-400">
              Show Past Events
            </span>
            <button
              onClick={() => setShowPast(!showPast)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${
                showPast
                  ? "bg-slate-500 text-white"
                  : "bg-white/10 text-white/40 hover:bg-white/20"
              }`}
            >
              {showPast ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && viewMode === "calendar" && (
        <EventCalendar
          events={filteredEvents}
          onEventClick={openEventModal}
          onCreateEvent={handleCreateEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          currentUser={currentUser}
        />
      )}

      {!loading && !error && viewMode === "list" && (
        <>
          {filteredEvents.length === 0 && (
            <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
              <Calendar size={48} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/50 font-bold text-lg">No events found</p>
              <p className="text-white/30 text-sm mt-2">
                Try changing the filters or showing past events
              </p>
            </div>
          )}

          {filteredEvents.length > 0 && (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const eventDate = new Date(event.startDate);
                const isPast = eventDate < today;
                const daysUntil = getDaysUntil(event.startDate);
                const catStyle =
                  CATEGORY_STYLES[event.category] || CATEGORY_STYLES.other;
                const scopeStyle = event.scope
                  ? SCOPE_STYLES[event.scope]
                  : null;
                const permissions = getEventPermissions(currentUser, event);

                return (
                  <div
                    key={event.id}
                    className={`group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/30 rounded-2xl p-5 transition-all duration-200 ${
                      isPast ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 text-center bg-white/5 rounded-xl py-2">
                        <div className="text-2xl font-black text-white leading-none">
                          {eventDate.getDate()}
                        </div>
                        <div className="text-xs font-bold text-yellow-400 uppercase">
                          {eventDate.toLocaleDateString("en-AU", {
                            month: "short",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {eventDate.getFullYear()}
                        </div>
                      </div>

                      <div className="w-px self-stretch bg-white/10 flex-shrink-0" />

                      <button
                        onClick={() => openEventModal(event)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex flex-wrap items-start gap-2 mb-2">
                          <h3 className="font-black text-white text-base group-hover:text-yellow-400 transition-colors">
                            {event.name}
                          </h3>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${catStyle.bg} ${catStyle.text}`}
                          >
                            {catStyle.label}
                          </span>

                          {scopeStyle && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${scopeStyle.bg} ${scopeStyle.text}`}
                            >
                              {scopeStyle.icon} {event.scope}
                            </span>
                          )}

                          {daysUntil && !isPast && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-400/20 text-yellow-400">
                              {daysUntil}
                            </span>
                          )}
                        </div>

                        {event.organization && (
                          <div className="flex items-center gap-1 text-xs mb-1 text-slate-300">
                            <span className="font-bold">
                              {event.organization.name}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                          <Calendar size={11} />
                          <span>
                            {formatDateRange(event.startDate, event.endDate)}
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                            <MapPin size={11} />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.shortDescription && (
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {event.shortDescription}
                          </p>
                        )}
                      </button>

                      <div className="flex gap-2">
                        {permissions.canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                            className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {permissions.canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${event.name}"?`)) {
                                handleDeleteEvent(event);
                              }
                            }}
                            className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="flex-shrink-0 p-2 bg-yellow-400/20 hover:bg-yellow-400 rounded-lg transition-colors group/link">
                          <ChevronRight
                            size={16}
                            className="text-yellow-400 group-hover/link:text-[#06054e]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeEventModal}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        currentUser={currentUser}
      />
    </div>
  );
}
