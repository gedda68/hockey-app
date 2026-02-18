"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { Event } from "@/types/event";
import { User, getEventPermissions } from "@/lib/permissions/event-permissions";

interface EventCalendarProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onDateClick?: (date: Date) => void;
  onCreateEvent?: (date?: Date) => void;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (event: Event) => void;
  currentUser?: User | null;
}

type ViewMode = "month" | "week" | "day";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CATEGORY_COLORS: Record<string, string> = {
  competition: "bg-blue-500",
  finals: "bg-yellow-500",
  representative: "bg-purple-500",
  clinic: "bg-green-500",
  officials: "bg-orange-500",
  social: "bg-pink-500",
  training: "bg-cyan-500",
  meeting: "bg-slate-500",
  other: "bg-gray-500",
};

const CATEGORY_BORDER: Record<string, string> = {
  competition: "border-blue-500",
  finals: "border-yellow-500",
  representative: "border-purple-500",
  clinic: "border-green-500",
  officials: "border-orange-500",
  social: "border-pink-500",
  training: "border-cyan-500",
  meeting: "border-slate-500",
  other: "border-gray-400",
};

const CATEGORY_TEXT: Record<string, string> = {
  competition: "text-blue-700",
  finals: "text-yellow-700",
  representative: "text-purple-700",
  clinic: "text-green-700",
  officials: "text-orange-700",
  social: "text-pink-700",
  training: "text-cyan-700",
  meeting: "text-slate-700",
  other: "text-gray-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single event row used in week/day views */
function EventRow({
  event,
  currentUser,
  onEventClick,
  onEditEvent,
  onDeleteEvent,
}: {
  event: Event;
  currentUser?: User | null;
  onEventClick: (event: Event) => void;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (event: Event) => void;
}) {
  const permissions = getEventPermissions(currentUser || null, event);
  const borderColor = CATEGORY_BORDER[event.category] || "border-gray-400";
  const textColor = CATEGORY_TEXT[event.category] || "text-gray-700";
  const badgeColor = CATEGORY_COLORS[event.category] || "bg-gray-500";

  return (
    <div
      className={`group/row flex items-start gap-2 bg-white border-l-4 ${borderColor} rounded-r-xl p-3 shadow-sm hover:shadow-md transition-all`}
    >
      {/* Click area → detail modal */}
      <button
        onClick={() => onEventClick(event)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {event.startTime && (
            <span className="text-xs font-black text-slate-500 tabular-nums">
              {event.startTime}
              {event.endTime && ` – ${event.endTime}`}
            </span>
          )}
          <span
            className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md text-white ${badgeColor}`}
          >
            {event.category}
          </span>
        </div>
        <p className={`text-sm font-black truncate ${textColor}`}>
          {event.name}
        </p>
        {event.location && (
          <p className="text-xs text-slate-400 truncate mt-0.5">
            📍 {event.location}
          </p>
        )}
      </button>

      {/* Edit / Delete — appear on hover */}
      {(permissions.canEdit || permissions.canDelete) && (
        <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
          {permissions.canEdit && onEditEvent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditEvent(event);
              }}
              className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
              title="Edit event"
            >
              <Edit size={14} className="text-blue-600" />
            </button>
          )}
          {permissions.canDelete && onDeleteEvent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${event.name}"?`)) {
                  onDeleteEvent(event);
                }
              }}
              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
              title="Delete event"
            >
              <Trash2 size={14} className="text-red-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Empty state for a day with optional add-event button */
function NoEvents({
  label,
  canCreate,
  onCreateEvent,
  date,
  compact = false,
}: {
  label?: string;
  canCreate: boolean;
  onCreateEvent?: (date?: Date) => void;
  date?: Date;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <CalendarDays size={24} className="text-slate-300" />
        <p className="text-xs font-bold text-slate-400">No events</p>
        {canCreate && onCreateEvent && date && (
          <button
            onClick={() => onCreateEvent(date)}
            className="text-xs font-bold text-blue-500 hover:text-blue-700 underline"
          >
            + Add event
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      <CalendarDays size={40} className="text-slate-300" />
      <div className="text-center">
        <p className="text-slate-500 font-black text-lg">
          {label || "No events"}
        </p>
        <p className="text-slate-400 text-sm">
          Nothing scheduled for this period
        </p>
      </div>
      {canCreate && onCreateEvent && (
        <button
          onClick={() => onCreateEvent(date)}
          className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md inline-flex items-center gap-2"
        >
          <Plus size={18} />
          {date
            ? `Add event on ${date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
            : "Add Event"}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventCalendar({
  events,
  onEventClick,
  onDateClick,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  currentUser,
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const canCreate =
    !!currentUser &&
    currentUser.role !== "public" &&
    currentUser.role !== "member";

  // Group events by their local date string
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    events.forEach((event) => {
      const key = new Date(event.startDate).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    // Sort each day's events by startTime
    Object.values(grouped).forEach((dayEvents) =>
      dayEvents.sort((a, b) =>
        (a.startTime || "00:00").localeCompare(b.startTime || "00:00"),
      ),
    );
    return grouped;
  }, [events]);

  const getDayEvents = (date: Date) =>
    eventsByDate[date.toDateString()] || [];

  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();

  const isSameMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToToday = () => setCurrentDate(new Date());

  const navigatePrevious = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  /** Click a month-day cell → switch to day view for that date */
  const handleMonthDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
    onDateClick?.(date);
  };

  // ── Date calculations ────────────────────────────────────────────────────────
  const getMonthDays = (): Date[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - firstDay.getDay());
    const end = new Date(lastDay);
    end.setDate(end.getDate() + (6 - lastDay.getDay()));
    const days: Date[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const getWeekDays = (): Date[] => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = viewMode === "week" ? getWeekDays() : [];

  // ── Header label ─────────────────────────────────────────────────────────────
  const headerLabel = (() => {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString("en-AU", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    // day view
    return currentDate.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-2xl font-black">{headerLabel}</h2>

          <div className="flex items-center gap-3">
            {canCreate && onCreateEvent && (
              <button
                onClick={() => onCreateEvent(viewMode === "day" ? currentDate : undefined)}
                className="px-4 py-2 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus size={18} />
                New Event
              </button>
            )}
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-all text-sm"
            >
              Today
            </button>
            <div className="flex bg-white/20 rounded-xl overflow-hidden">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-white/30 transition-all"
                aria-label="Previous"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-white/30 border-l border-white/20 transition-all"
                aria-label="Next"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* View selector */}
        <div className="flex gap-2">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold capitalize transition-all ${
                viewMode === mode
                  ? "bg-white text-blue-600 shadow-lg"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar Body ── */}
      <div className="p-6">
        {/* ══════════════ MONTH VIEW ══════════════ */}
        {viewMode === "month" && (
          <div>
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="text-center font-black text-xs text-slate-500 uppercase tracking-wider py-2 bg-slate-100 rounded-lg"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-2">
              {getMonthDays().map((date, idx) => {
                const dayEvents = getDayEvents(date);
                const inMonth = isSameMonth(date);
                const todayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    onClick={() => handleMonthDayClick(date)}
                    className={`min-h-[120px] p-2 rounded-xl border-2 transition-all cursor-pointer relative group ${
                      todayDate
                        ? "border-blue-500 bg-blue-50 shadow ring-2 ring-blue-200"
                        : inMonth
                          ? "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                          : "border-slate-100 bg-slate-50 opacity-50"
                    }`}
                  >
                    {/* Date number + quick-add */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-lg font-black leading-none ${
                          todayDate
                            ? "text-blue-600"
                            : inMonth
                              ? "text-slate-900"
                              : "text-slate-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {canCreate && onCreateEvent && inMonth && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateEvent(date);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow"
                          title="Add event"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {/* Event pills */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className={`text-[10px] font-bold px-1.5 py-1 rounded-md text-white truncate shadow-sm hover:shadow-md transition-all cursor-pointer ${
                            CATEGORY_COLORS[event.category] || "bg-gray-500"
                          }`}
                          title={event.name}
                        >
                          {event.startTime && (
                            <span className="opacity-80 mr-1">{event.startTime}</span>
                          )}
                          {event.name}
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <div className="text-[10px] font-bold text-blue-600 text-center">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>

                    {/* "Click for day view" tooltip hint on hover */}
                    {inMonth && dayEvents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          View day
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ WEEK VIEW ══════════════ */}
        {viewMode === "week" && (
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-7 gap-3 mb-3">
              {weekDays.map((date, i) => {
                const todayDate = isToday(date);
                return (
                  <div
                    key={i}
                    className={`text-center py-2 rounded-xl font-bold text-sm ${
                      todayDate
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider opacity-75">
                      {DAYS[date.getDay()]}
                    </div>
                    <div className="text-xl font-black leading-tight">
                      {date.getDate()}
                    </div>
                    <div className="text-[10px] opacity-60">
                      {date.toLocaleDateString("en-AU", { month: "short" })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((date, i) => {
                const dayEvents = getDayEvents(date);
                const todayDate = isToday(date);

                return (
                  <div
                    key={i}
                    className={`min-h-[200px] rounded-2xl border-2 p-2 transition-all ${
                      todayDate
                        ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                        : "border-slate-200 bg-slate-50 hover:border-blue-200"
                    }`}
                  >
                    {dayEvents.length === 0 ? (
                      <NoEvents
                        compact
                        canCreate={canCreate}
                        onCreateEvent={onCreateEvent}
                        date={date}
                      />
                    ) : (
                      <div className="space-y-2">
                        {dayEvents.map((event) => (
                          <EventRow
                            key={event.id}
                            event={event}
                            currentUser={currentUser}
                            onEventClick={onEventClick}
                            onEditEvent={onEditEvent}
                            onDeleteEvent={onDeleteEvent}
                          />
                        ))}

                        {/* Add event button at bottom of column */}
                        {canCreate && onCreateEvent && (
                          <button
                            onClick={() => onCreateEvent(date)}
                            className="w-full mt-1 py-2 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center gap-1"
                          >
                            <Plus size={12} />
                            Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ DAY VIEW ══════════════ */}
        {viewMode === "day" && (
          <div>
            <div className="space-y-3">
              {(() => {
                const dayEvents = getDayEvents(currentDate);

                if (dayEvents.length === 0) {
                  return (
                    <NoEvents
                      label={`No events on ${currentDate.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}`}
                      canCreate={canCreate}
                      onCreateEvent={onCreateEvent}
                      date={currentDate}
                    />
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-wider">
                        {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                      </p>
                      {canCreate && onCreateEvent && (
                        <button
                          onClick={() => onCreateEvent(currentDate)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md text-sm"
                        >
                          <Plus size={16} />
                          Add event
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          currentUser={currentUser}
                          onEventClick={onEventClick}
                          onEditEvent={onEditEvent}
                          onDeleteEvent={onDeleteEvent}
                        />
                      ))}
                    </div>

                    {/* Dashed "add another event" */}
                    {canCreate && onCreateEvent && (
                      <button
                        onClick={() => onCreateEvent(currentDate)}
                        className="w-full mt-4 py-4 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl text-sm font-bold text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Add another event on{" "}
                        {currentDate.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Category Legend ── */}
      <div className="px-6 pb-6 border-t-2 border-slate-100 pt-4 bg-slate-50">
        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider">
          Event Categories
        </p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${color} shadow-sm`} />
              <span className="text-xs font-bold text-slate-600 capitalize">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
