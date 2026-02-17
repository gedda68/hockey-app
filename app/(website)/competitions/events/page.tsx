"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  ChevronRight,
  Globe,
  Lock,
  Building2,
} from "lucide-react";

type EventEntry = {
  name: string;
  startDate: string;
  endDate?: string;
  description?: string;
  location?: string;
  category?: string;
  scope?: "city" | "regional" | "state" | "national" | "international";
  organization?: {
    type: "association" | "club" | "team";
    id: string;
    name: string;
  };
  visibility?: "public" | "private";
  link?: string;
};

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
  break: { bg: "bg-slate-500/20", text: "text-slate-400", label: "Break" },
};

const SCOPE_STYLES: Record<string, { bg: string; text: string; icon: string }> =
  {
    city: { bg: "bg-cyan-500/20", text: "text-cyan-400", icon: "🏙️" },
    regional: { bg: "bg-teal-500/20", text: "text-teal-400", icon: "🗺️" },
    state: { bg: "bg-indigo-500/20", text: "text-indigo-400", icon: "📍" },
    national: { bg: "bg-red-500/20", text: "text-red-400", icon: "🇦🇺" },
    international: { bg: "bg-pink-500/20", text: "text-pink-400", icon: "🌏" },
  };

const ORG_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  association: {
    bg: "bg-violet-500/20",
    text: "text-violet-400",
    icon: Building2,
  },
  club: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: Building2 },
  team: { bg: "bg-amber-500/20", text: "text-amber-400", icon: Building2 },
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

const FILTER_ORGS = [
  { value: "all", label: "All Organizations" },
  { value: "association", label: "Associations" },
  { value: "club", label: "Clubs" },
  { value: "team", label: "Teams" },
];

const FILTER_VISIBILITY = [
  { value: "all", label: "All Events" },
  { value: "public", label: "Public Only" },
  { value: "private", label: "Private Only" },
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
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterScope, setFilterScope] = useState("all");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("public");
  const [showPast, setShowPast] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Simulate user membership (in real app, get from auth context)
  const [userMemberships] = useState({
    clubs: ["ipswich-hornets"],
    teams: ["souths-pl1"],
    associations: ["bha"],
  });

  useEffect(() => {
    fetch("/data/events.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { events?: EventEntry[] }) => {
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
    // Date filter
    const eventDate = new Date(e.startDate);
    const isPast = eventDate < today;
    if (!showPast && isPast) return false;

    // Category filter
    if (filterCategory !== "all" && e.category !== filterCategory) return false;

    // Scope filter
    if (filterScope !== "all" && e.scope !== filterScope) return false;

    // Organization type filter
    if (filterOrg !== "all" && e.organization?.type !== filterOrg) return false;

    // Visibility filter with membership check
    if (e.visibility === "private") {
      // Check if user has access to this private event
      const orgType = e.organization?.type;
      const orgId = e.organization?.id;

      let hasAccess = false;
      if (
        orgType === "association" &&
        userMemberships.associations.includes(orgId || "")
      ) {
        hasAccess = true;
      } else if (
        orgType === "club" &&
        userMemberships.clubs.includes(orgId || "")
      ) {
        hasAccess = true;
      } else if (
        orgType === "team" &&
        userMemberships.teams.includes(orgId || "")
      ) {
        hasAccess = true;
      }

      if (!hasAccess) return false;
    }

    // Visibility type filter
    if (filterVisibility === "public" && e.visibility === "private")
      return false;
    if (filterVisibility === "private" && e.visibility !== "private")
      return false;

    return true;
  });

  const upcomingCount = events.filter((e) => {
    const eventDate = new Date(e.startDate);
    return eventDate >= today;
  }).length;

  const privateCount = filteredEvents.filter(
    (e) => e.visibility === "private",
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 md:px-8 lg:px-12 pb-20">
      {/* Back button */}
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

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2">
          Events <span className="text-yellow-400">Calendar</span>
        </h1>
        <p className="text-slate-400 text-sm">
          {upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""} this
          season
          {privateCount > 0 && ` • ${privateCount} member-only`}
        </p>
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase transition-colors"
      >
        {showFilters ? "Hide" : "Show"} Filters
      </button>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4 mb-8 bg-white/5 rounded-2xl p-6 border border-white/10">
          {/* Category Filter */}
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

          {/* Scope Filter */}
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

          {/* Organization Filter */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2">
              Organization
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_ORGS.map((org) => (
                <button
                  key={org.value}
                  onClick={() => setFilterOrg(org.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    filterOrg === org.value
                      ? "bg-violet-400 text-[#06054e]"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {org.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Filter */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2">
              Visibility
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_VISIBILITY.map((vis) => (
                <button
                  key={vis.value}
                  onClick={() => setFilterVisibility(vis.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    filterVisibility === vis.value
                      ? "bg-green-400 text-[#06054e]"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {vis.label}
                </button>
              ))}
            </div>
          </div>

          {/* Show Past Toggle */}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-bold">{error}</p>
        </div>
      )}

      {/* No events */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
          <Calendar size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50 font-bold text-lg">No events found</p>
          <p className="text-white/30 text-sm mt-2">
            Try changing the filters or showing past events
          </p>
        </div>
      )}

      {/* Events List */}
      {!loading && !error && filteredEvents.length > 0 && (
        <div className="space-y-3">
          {filteredEvents.map((event, idx) => {
            const eventDate = new Date(event.startDate);
            const isPast = eventDate < today;
            const daysUntil = getDaysUntil(event.startDate);
            const catStyle = CATEGORY_STYLES[event.category || ""] || {
              bg: "bg-slate-500/20",
              text: "text-slate-400",
              label: event.category || "Event",
            };
            const scopeStyle = event.scope ? SCOPE_STYLES[event.scope] : null;
            const orgStyle = event.organization?.type
              ? ORG_STYLES[event.organization.type]
              : null;
            const isPrivate = event.visibility === "private";

            return (
              <div
                key={`${event.name}-${event.startDate}-${idx}`}
                className={`group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/30 rounded-2xl p-5 transition-all duration-200 ${
                  isPast ? "opacity-50" : ""
                } ${isPrivate ? "ring-2 ring-purple-500/30" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Date block */}
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

                  {/* Divider */}
                  <div className="w-px self-stretch bg-white/10 flex-shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <h3 className="font-black text-white text-base group-hover:text-yellow-400 transition-colors">
                        {event.name}
                      </h3>

                      {/* Visibility badge */}
                      {isPrivate && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-400 flex items-center gap-1">
                          <Lock size={10} />
                          Private
                        </span>
                      )}

                      {/* Category badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${catStyle.bg} ${catStyle.text}`}
                      >
                        {catStyle.label}
                      </span>

                      {/* Scope badge */}
                      {scopeStyle && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${scopeStyle.bg} ${scopeStyle.text}`}
                        >
                          {scopeStyle.icon} {event.scope}
                        </span>
                      )}

                      {/* Days until badge */}
                      {daysUntil && !isPast && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-400/20 text-yellow-400">
                          {daysUntil}
                        </span>
                      )}
                    </div>

                    {/* Organization */}
                    {event.organization && orgStyle && (
                      <div
                        className={`flex items-center gap-1 text-xs mb-1 ${orgStyle.text}`}
                      >
                        <orgStyle.icon size={11} />
                        <span className="font-bold">
                          {event.organization.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${orgStyle.bg}`}
                        >
                          {event.organization.type}
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

                    {event.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* External link */}
                  {event.link && (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 p-2 bg-yellow-400/20 hover:bg-yellow-400 rounded-lg transition-colors group/link"
                    >
                      <ChevronRight
                        size={16}
                        className="text-yellow-400 group-hover/link:text-[#06054e]"
                      />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
