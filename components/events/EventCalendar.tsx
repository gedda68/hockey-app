// components/events/EventCalendar.tsx
"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Event } from "@/types/event";

interface EventCalendarProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onDateClick?: (date: Date) => void;
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
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    events.forEach((event) => {
      const dateKey = new Date(event.startDate).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Navigation
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

  // Get calendar days for month view
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

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-900">
            {viewMode === "month" &&
              `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === "week" &&
              `Week of ${currentDate.toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`}
            {viewMode === "day" &&
              currentDate.toLocaleDateString("en-AU", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("month")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              viewMode === "month"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              viewMode === "week"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              viewMode === "day"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {viewMode === "month" && (
          <div>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-black text-slate-500 uppercase py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {getMonthDays().map((date, idx) => {
                const dayEvents = getDayEvents(date);
                const isCurrentMonth = isSameMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={idx}
                    onClick={() => onDateClick?.(date)}
                    className={`min-h-[80px] p-2 rounded-lg border transition-all hover:shadow-md ${
                      isTodayDate
                        ? "border-blue-500 bg-blue-50"
                        : isCurrentMonth
                          ? "border-slate-200 bg-white hover:bg-slate-50"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <div
                      className={`text-sm font-bold mb-1 ${
                        isTodayDate ? "text-blue-600" : ""
                      }`}
                    >
                      {date.getDate()}
                    </div>

                    {/* Event Dots */}
                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event, eventIdx) => (
                          <div
                            key={eventIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded truncate ${
                              CATEGORY_COLORS[event.category] || "bg-gray-500"
                            }`}
                            title={event.name}
                          >
                            {event.name}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] font-bold text-slate-500 text-center">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="text-center py-12 text-slate-400">
            <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-bold">Week view coming soon</p>
          </div>
        )}

        {viewMode === "day" && (
          <div>
            <div className="space-y-3">
              {getDayEvents(currentDate).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No events on this day</p>
                </div>
              ) : (
                getDayEvents(currentDate).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-1 h-full ${CATEGORY_COLORS[event.category]} rounded-full`}
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 mb-1">
                          {event.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {event.startTime && `${event.startTime}`}
                          {event.location && ` • ${event.location}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {event.organization.name}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 ${CATEGORY_COLORS[event.category]} text-white rounded text-xs font-bold uppercase`}
                      >
                        {event.category}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 pb-6 pt-2 border-t border-slate-200">
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-3 h-3 ${color} rounded-full`} />
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
