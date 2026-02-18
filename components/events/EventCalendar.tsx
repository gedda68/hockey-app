"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
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

  const goToToday = () => setCurrentDate(new Date());

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

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Go to Sunday

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
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

  const weekDays = viewMode === "week" ? getWeekDays() : [];
  const weekHasEvents = weekDays.some((date) => getDayEvents(date).length > 0);

  return (
    <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-black">
            {viewMode === "month" &&
              `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === "week" &&
              (() => {
                const start = weekDays[0];
                const end = weekDays[6];
                return `${start.toLocaleDateString("en-AU", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}`;
              })()}
          </h2>

          <div className="flex items-center gap-3">
            {canCreate && onCreateEvent && (
              <button
                onClick={() => onCreateEvent()}
                className="px-4 py-2 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus size={20} />
                New Event
              </button>
            )}
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-all"
            >
              Today
            </button>
            <div className="flex bg-white/20 rounded-xl overflow-hidden">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-white/30 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-white/30 border-l border-white/20 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("month")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              viewMode === "month"
                ? "bg-white text-blue-600 shadow-lg"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              viewMode === "week"
                ? "bg-white text-blue-600 shadow-lg"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* MONTH VIEW */}
        {viewMode === "month" && (
          <div>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-3 mb-3">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center font-black text-sm text-slate-600 uppercase tracking-wider py-3 bg-slate-100 rounded-xl"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-3">
              {getMonthDays().map((date, idx) => {
                const dayEvents = getDayEvents(date);
                const isCurrentMonth = isSameMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    className={`min-h-[140px] p-3 rounded-2xl border-2 transition-all relative group ${
                      isTodayDate
                        ? "border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-200"
                        : isCurrentMonth
                          ? "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                          : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`text-xl font-black ${
                          isTodayDate
                            ? "text-blue-600"
                            : isCurrentMonth
                              ? "text-slate-900"
                              : "text-slate-300"
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      {/* Quick Add Button */}
                      {canCreate && onCreateEvent && isCurrentMonth && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateEvent(date);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                          title="Add event"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>

                    {/* Events */}
                    {dayEvents.length > 0 && (
                      <div className="space-y-1.5">
                        {dayEvents.slice(0, 3).map((event) => {
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
                                className={`w-full text-left text-xs font-bold px-2 py-1.5 rounded-lg truncate transition-all shadow-sm hover:shadow-md ${
                                  CATEGORY_COLORS[event.category] ||
                                  "bg-gray-500"
                                } text-white`}
                                title={event.name}
                              >
                                {event.startTime && (
                                  <span className="opacity-90 mr-1 text-[10px]">
                                    {event.startTime}
                                  </span>
                                )}
                                {event.name}
                              </button>

                              {/* Quick Actions */}
                              {(permissions.canEdit ||
                                permissions.canDelete) && (
                                <div className="absolute -top-1 -right-1 opacity-0 group-hover/event:opacity-100 flex gap-0.5 transition-opacity z-10">
                                  {permissions.canEdit && onEditEvent && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditEvent(event);
                                      }}
                                      className="p-1 bg-white hover:bg-blue-100 rounded-md shadow-lg border border-slate-200"
                                      title="Edit"
                                    >
                                      <Edit
                                        size={14}
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
                                      className="p-1 bg-white hover:bg-red-100 rounded-md shadow-lg border border-slate-200"
                                      title="Delete"
                                    >
                                      <Trash2
                                        size={14}
                                        className="text-red-600"
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <button
                            onClick={() => onDateClick?.(date)}
                            className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 text-center py-1 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            +{dayEvents.length - 3} more
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

        {/* WEEK VIEW */}
        {viewMode === "week" && (
          <div>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-3 mb-3">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center font-black text-sm text-slate-600 uppercase tracking-wider py-3 bg-slate-100 rounded-xl"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Week Days Grid */}
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((date, idx) => {
                const dayEvents = getDayEvents(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    className={`min-h-[200px] p-3 rounded-2xl border-2 transition-all relative group ${
                      isTodayDate
                        ? "border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div
                          className={`text-2xl font-black ${
                            isTodayDate ? "text-blue-600" : "text-slate-900"
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="text-xs font-bold text-slate-500 uppercase">
                          {date.toLocaleDateString("en-AU", { month: "short" })}
                        </div>
                      </div>

                      {/* Quick Add Button */}
                      {canCreate && onCreateEvent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateEvent(date);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                          title="Add event"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>

                    {/* Events */}
                    {dayEvents.length > 0 && (
                      <div className="space-y-1.5">
                        {dayEvents.map((event) => {
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
                                className={`w-full text-left text-xs font-bold px-2 py-1.5 rounded-lg truncate transition-all shadow-sm hover:shadow-md ${
                                  CATEGORY_COLORS[event.category] ||
                                  "bg-gray-500"
                                } text-white`}
                                title={event.name}
                              >
                                {event.startTime && (
                                  <span className="opacity-90 mr-1 text-[10px]">
                                    {event.startTime}
                                  </span>
                                )}
                                {event.name}
                              </button>

                              {/* Quick Actions */}
                              {(permissions.canEdit ||
                                permissions.canDelete) && (
                                <div className="absolute -top-1 -right-1 opacity-0 group-hover/event:opacity-100 flex gap-0.5 transition-opacity z-10">
                                  {permissions.canEdit && onEditEvent && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditEvent(event);
                                      }}
                                      className="p-1 bg-white hover:bg-blue-100 rounded-md shadow-lg border border-slate-200"
                                      title="Edit"
                                    >
                                      <Edit
                                        size={14}
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
                                      className="p-1 bg-white hover:bg-red-100 rounded-md shadow-lg border border-slate-200"
                                      title="Delete"
                                    >
                                      <Trash2
                                        size={14}
                                        className="text-red-600"
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* No events message for week */}
            {!weekHasEvents && (
              <div className="mt-8 text-center py-16 bg-slate-50 rounded-2xl border-2 border-slate-200">
                <CalendarIcon
                  size={64}
                  className="text-slate-300 mx-auto mb-4"
                />
                <p className="text-slate-600 font-black text-2xl mb-2">
                  No events this week
                </p>
                <p className="text-slate-500 text-sm mb-6">
                  {weekDays[0].toLocaleDateString("en-AU", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {weekDays[6].toLocaleDateString("en-AU", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {canCreate && onCreateEvent && (
                  <button
                    onClick={() => onCreateEvent()}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg inline-flex items-center gap-3"
                  >
                    <Plus size={24} />
                    Create Event This Week
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 pb-6 border-t-2 border-slate-100 pt-4 bg-slate-50">
        <div className="text-xs font-black uppercase text-slate-500 mb-3">
          Event Categories
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORY_COLORS).map(([category, colorClass]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-4 h-4 ${colorClass} rounded-md shadow-sm`} />
              <span className="text-sm font-bold text-slate-700 capitalize">
                {category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
