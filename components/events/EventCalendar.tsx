// components/events/EventCalendar.tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from "lucide-react";
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

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
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
  competition: "bg-blue-500 text-white",
  finals: "bg-yellow-500 text-white",
  representative: "bg-purple-500 text-white",
  clinic: "bg-green-500 text-white",
  officials: "bg-orange-500 text-white",
  social: "bg-pink-500 text-white",
  training: "bg-cyan-500 text-white",
  meeting: "bg-slate-500 text-white",
  other: "bg-gray-500 text-white",
};

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

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    events.forEach((event) => {
      const dateKey = new Date(event.startDate).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      days.push(new Date(d));
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getDayEvents = (date: Date) => {
    return eventsByDate[date.toDateString()] || [];
  };

  const canCreate =
    currentUser &&
    currentUser.role !== "public" &&
    currentUser.role !== "member";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-900">
            {viewMode === "month" &&
              `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === "week" &&
              `Week of ${currentDate.toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}`}
            {viewMode === "day" &&
              currentDate.toLocaleDateString("en-AU", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
          </h2>

          <div className="flex items-center gap-2">
            {canCreate && onCreateEvent && (
              <button
                onClick={() => onCreateEvent()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                New Event
              </button>
            )}
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <div className="flex border border-slate-300 rounded-lg overflow-hidden">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-slate-100 border-l border-slate-300 transition-colors"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${
                viewMode === mode
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {viewMode === "month" && (
          <div>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_SHORT.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-black text-slate-600 uppercase py-3 bg-slate-50 rounded-lg"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days - PROPER GRID */}
            <div className="grid grid-cols-7 gap-1">
              {getMonthDays().map((date, idx) => {
                const dayEvents = getDayEvents(date);
                const isCurrentMonth = isSameMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] p-2 rounded-lg border-2 transition-all relative group ${
                      isTodayDate
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : isCurrentMonth
                          ? "border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm"
                          : "border-slate-100 bg-slate-50/50"
                    }`}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`text-sm font-black ${
                          isTodayDate
                            ? "text-blue-600 text-lg"
                            : isCurrentMonth
                              ? "text-slate-900"
                              : "text-slate-400"
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      {/* Quick Add Button - appears on hover */}
                      {canCreate && onCreateEvent && isCurrentMonth && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateEvent(date);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                          title="Add event"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {/* Event Pills */}
                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => {
                          const permissions = getEventPermissions(
                            currentUser || null,
                            event,
                          );

                          return (
                            <div
                              key={event.id}
                              className="group/event relative"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick(event);
                                }}
                                className={`w-full text-left text-[10px] font-bold px-2 py-1 rounded truncate hover:shadow-md transition-all ${
                                  CATEGORY_COLORS[event.category] ||
                                  "bg-gray-500 text-white"
                                }`}
                                title={event.name}
                              >
                                {event.startTime && (
                                  <span className="opacity-90 mr-1">
                                    {event.startTime}
                                  </span>
                                )}
                                {event.name}
                              </button>

                              {/* Quick Actions on Hover */}
                              {(permissions.canEdit ||
                                permissions.canDelete) && (
                                <div className="absolute top-0 right-0 opacity-0 group-hover/event:opacity-100 flex gap-0.5 bg-white rounded shadow-md p-0.5 transition-opacity">
                                  {permissions.canEdit && onEditEvent && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditEvent(event);
                                      }}
                                      className="p-0.5 hover:bg-blue-100 rounded"
                                      title="Edit"
                                    >
                                      <Edit
                                        size={12}
                                        className="text-blue-600"
                                      />
                                    </button>
                                  )}
                                  {permissions.canDelete && onDeleteEvent && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (
                                          confirm(`Delete "${event.name}"?`)
                                        ) {
                                          onDeleteEvent(event);
                                        }
                                      }}
                                      className="p-0.5 hover:bg-red-100 rounded"
                                      title="Delete"
                                    >
                                      <Trash2
                                        size={12}
                                        className="text-red-600"
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <button
                            onClick={() => onDateClick?.(date)}
                            className="w-full text-[9px] font-bold text-slate-600 hover:text-blue-600 text-center py-0.5 hover:bg-blue-50 rounded transition-colors"
                          >
                            +{dayEvents.length - 2} more
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

        {viewMode === "day" && (
          <div className="space-y-2">
            {getDayEvents(currentDate).length === 0 ? (
              <div className="text-center py-16">
                <div className="text-slate-400 font-bold text-lg mb-4">
                  No events on this day
                </div>
                {canCreate && onCreateEvent && (
                  <button
                    onClick={() => onCreateEvent(currentDate)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Create Event
                  </button>
                )}
              </div>
            ) : (
              getDayEvents(currentDate).map((event) => {
                const permissions = getEventPermissions(
                  currentUser || null,
                  event,
                );

                return (
                  <div
                    key={event.id}
                    className="group p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => onEventClick(event)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-1 ${CATEGORY_COLORS[event.category]} rounded text-xs font-bold uppercase`}
                          >
                            {event.category}
                          </span>
                          {event.startTime && (
                            <span className="text-sm font-bold text-slate-600">
                              {event.startTime}
                            </span>
                          )}
                        </div>
                        <div className="font-black text-lg text-slate-900 mb-1">
                          {event.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {event.location && `${event.location} • `}
                          {event.organization.name}
                        </div>
                      </button>

                      {/* Action Buttons */}
                      {(permissions.canEdit || permissions.canDelete) && (
                        <div className="flex gap-2">
                          {permissions.canEdit && onEditEvent && (
                            <button
                              onClick={() => onEditEvent(event)}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {permissions.canDelete && onDeleteEvent && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${event.name}"?`)) {
                                  onDeleteEvent(event);
                                }
                              }}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Color Legend */}
      <div className="px-6 pb-6 pt-2 border-t border-slate-200 bg-slate-50">
        <div className="text-xs font-black uppercase text-slate-500 mb-2">
          Categories
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORY_COLORS).map(([category, colorClass]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-4 h-4 ${colorClass} rounded`} />
              <span className="text-xs font-bold text-slate-600 capitalize">
                {category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
