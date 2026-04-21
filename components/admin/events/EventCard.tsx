// components/admin/events/EventCard.tsx
// Admin events list row card — date box, metadata columns, action buttons.

"use client";

import React from "react";
import {
  Calendar,
  MapPin,
  Building2,
  Eye,
  Edit,
  Trash2,
  Globe,
  Radio,
  Lock,
  Users,
} from "lucide-react";
import type { Event, EventCategory, EventStatus, CalendarPropagation } from "@/types/event";

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
}

// ── Badge colour maps ────────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<EventCategory, string> = {
  competition:    "bg-blue-100 text-blue-700 border-blue-200",
  finals:         "bg-yellow-100 text-yellow-700 border-yellow-200",
  representative: "bg-purple-100 text-purple-700 border-purple-200",
  clinic:         "bg-green-100 text-green-700 border-green-200",
  officials:      "bg-orange-100 text-orange-700 border-orange-200",
  social:         "bg-pink-100 text-pink-700 border-pink-200",
  training:       "bg-cyan-100 text-cyan-700 border-cyan-200",
  meeting:        "bg-slate-100 text-slate-600 border-slate-200",
  other:          "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_BADGE: Record<EventStatus, string> = {
  scheduled: "bg-green-100 text-green-700 border-green-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  postponed: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function parseDateParts(iso: string): { day: number; month: string; year: number } {
  // Parse from ISO string without relying on timezone shifts
  const d = new Date(iso);
  return {
    day:   d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    year:  d.getUTCFullYear(),
  };
}

function formatDateRange(startIso: string, endIso?: string): string {
  const s = new Date(startIso);
  const sStr = s.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  if (!endIso) return sStr;
  const e = new Date(endIso);
  if (s.toDateString() === e.toDateString()) return sStr;
  return `${sStr} – ${e.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

type Visibility = "public" | "members-only" | "private";

const VISIBILITY_BADGE: Record<
  Visibility,
  { cls: string; Icon: React.ElementType; label: string }
> = {
  "public":       { cls: "bg-green-50 border-green-200 text-green-700", Icon: Globe,  label: "Public" },
  "members-only": { cls: "bg-blue-50  border-blue-200  text-blue-700",  Icon: Users,  label: "Members" },
  "private":      { cls: "bg-red-50   border-red-200   text-red-700",   Icon: Lock,   label: "Private" },
};

function VisibilityBadge({ visibility }: { visibility?: string }) {
  const key = (visibility ?? "public") as Visibility;
  const cfg = VISIBILITY_BADGE[key] ?? VISIBILITY_BADGE["public"];
  const { Icon } = cfg;
  return (
    <span
      title={`Visibility: ${cfg.label}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${cfg.cls}`}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function PropagationIcon({ propagation }: { propagation: CalendarPropagation }) {
  if (propagation === "none") return null;
  const Icon = propagation === "global" ? Globe : Radio;
  const label = propagation.charAt(0).toUpperCase() + propagation.slice(1);
  return (
    <span
      title={`Propagates to: ${label}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold uppercase tracking-wide"
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EventCard({ event, onEdit, onDelete, onView }: EventCardProps) {
  const { day, month, year } = parseDateParts(event.startDate);
  const categoryClass = CATEGORY_BADGE[event.category] ?? CATEGORY_BADGE.other;
  const statusClass   = STATUS_BADGE[event.status]     ?? STATUS_BADGE.draft;
  const propagation   = event.calendarPropagation ?? "none";
  const location      = event.venue?.name ?? event.location ?? null;

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-150 flex items-stretch overflow-hidden">

      {/* ── DATE BOX ───────────────────────────────────────────────────── */}
      <div
        className="w-[4.5rem] shrink-0 flex flex-col items-center justify-center bg-[#06054e] py-3 px-2 select-none"
        aria-label={`${day} ${month} ${year}`}
      >
        <span className="text-2xl font-black leading-none text-white">{day}</span>
        <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-0.5">{month}</span>
        <span className="text-[10px] font-medium text-white/50 mt-0.5">{year}</span>
      </div>

      {/* ── DIVIDER ────────────────────────────────────────────────────── */}
      <div className="w-px bg-slate-200 self-stretch shrink-0" />

      {/* ── MIDDLE: event info ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1">

        {/* Row 1 — name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-black text-slate-900 truncate max-w-xs" title={event.name}>
            {event.name}
          </h3>

          {/* Category badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${categoryClass}`}>
            {event.category}
          </span>

          {/* Status badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${statusClass}`}>
            {event.status}
          </span>

          {/* Visibility badge */}
          <VisibilityBadge visibility={event.visibility} />

          {/* Propagation indicator */}
          {propagation !== "none" && <PropagationIcon propagation={propagation} />}
        </div>

        {/* Row 2 — short description */}
        {event.shortDescription && (
          <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
            {event.shortDescription}
          </p>
        )}

        {/* Row 3 — meta icons */}
        <div className="flex items-center gap-4 flex-wrap mt-0.5">
          {/* Date range */}
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar size={11} className="shrink-0" />
            <span>{formatDateRange(event.startDate, event.endDate)}</span>
          </span>

          {/* Location */}
          {location && (
            <span className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate max-w-[160px]">{location}</span>
            </span>
          )}

          {/* Organisation */}
          {event.organization?.name && (
            <span className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
              <Building2 size={11} className="shrink-0" />
              <span className="truncate max-w-[140px]">{event.organization.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── RIGHT: action buttons ──────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 pr-3 pl-2">
        {/* View */}
        <button
          type="button"
          onClick={() => onView(event)}
          title="View event"
          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
          aria-label={`View ${event.name}`}
        >
          <Eye size={16} />
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(event)}
          title="Edit event"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
          aria-label={`Edit ${event.name}`}
        >
          <Edit size={16} />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(event)}
          title="Delete event"
          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
          aria-label={`Delete ${event.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
