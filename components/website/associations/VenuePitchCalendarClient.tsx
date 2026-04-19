"use client";

/**
 * Epic V3 — public pitch calendar: week (full detail) or month (summary counts).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  MonthCalendarCellSummary,
  PitchCalendarApiResponse,
  PitchMonthCalendarResponse,
  PitchWeekCalendarResponse,
  PublicCalendarEvent,
} from "@/lib/public/pitchWeekCalendar";

function utcMondayWeekStartYmd(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const start = Date.UTC(y, m, day + diff);
  return new Date(start).toISOString().slice(0, 10);
}

function utcMonthYm(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

function addDaysYmd(ymd: string, delta: number): string {
  const ms = Date.parse(`${ymd}T00:00:00.000Z`) + delta * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function addMonthsYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function eventKey(ev: PublicCalendarEvent, idx: number) {
  if (ev.kind === "match") return `m-${ev.fixtureId}-${idx}`;
  return `${ev.kind}-${ev.entryId}-${idx}`;
}

function EventBlock({ ev }: { ev: PublicCalendarEvent }) {
  if (ev.kind === "match") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        <div className="text-[11px] font-black text-[#06054e] leading-snug">{ev.summary}</div>
        {ev.competitionLabel ? (
          <div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">{ev.competitionLabel}</div>
        ) : null}
        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
          {fmtTime(ev.scheduledStart)}
          {ev.scheduledEnd ? `–${fmtTime(ev.scheduledEnd)}` : ""}
        </div>
      </div>
    );
  }
  if (ev.kind === "training") {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50/90 px-2 py-1.5">
        <div className="text-[11px] font-black text-teal-900 leading-snug">{ev.summary}</div>
        <div className="text-[10px] font-mono text-teal-800/80 mt-0.5">
          {fmtTime(ev.scheduledStart)}
          {ev.scheduledEnd ? `–${fmtTime(ev.scheduledEnd)}` : ""}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5">
      <div className="text-[11px] font-black italic text-slate-600">Private</div>
      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
        {fmtTime(ev.scheduledStart)}
        {ev.scheduledEnd ? `–${fmtTime(ev.scheduledEnd)}` : ""}
      </div>
    </div>
  );
}

function MonthSummaryCell({ s }: { s: MonthCalendarCellSummary }) {
  if (s.total === 0) {
    return <span className="text-slate-400 font-bold">—</span>;
  }
  const more = s.total > s.lines.length ? s.total - s.lines.length : 0;
  return (
    <div className="text-[10px] space-y-1 leading-snug">
      <div className="font-black text-slate-800">
        {s.matchCount} game{s.matchCount === 1 ? "" : "s"} · {s.trainingCount} training ·{" "}
        {s.privateCount} private / hire
      </div>
      {s.lines.map((line, i) => (
        <div key={i} className="truncate text-slate-600 font-semibold">
          {line}
        </div>
      ))}
      {more > 0 ? (
        <div className="text-slate-400 font-bold">+{more} more</div>
      ) : null}
    </div>
  );
}

function isMonthPayload(x: PitchCalendarApiResponse | null): x is PitchMonthCalendarResponse {
  return x?.view === "month";
}

function isWeekPayload(x: PitchCalendarApiResponse | null): x is PitchWeekCalendarResponse {
  return x?.view === "week";
}

export default function VenuePitchCalendarClient({
  associationId,
  associationName,
  portalQuery,
  initialVenueId = "",
}: {
  associationId: string;
  associationName: string;
  portalQuery?: string | null;
  initialVenueId?: string;
}) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => utcMondayWeekStartYmd());
  const [monthYm, setMonthYm] = useState(() => utcMonthYm());
  const [venueId, setVenueId] = useState(initialVenueId);
  const [data, setData] = useState<PitchCalendarApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (viewMode === "month") {
        q.set("month", monthYm);
      } else {
        q.set("weekStart", weekStart);
      }
      if (venueId.trim()) q.set("venueId", venueId.trim());
      if (portalQuery?.trim()) q.set("portal", portalQuery.trim());
      const res = await fetch(
        `/api/public/associations/${encodeURIComponent(associationId)}/pitch-week-calendar?${q.toString()}`,
        { credentials: "include" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Load failed");
      setData(j as PitchCalendarApiResponse);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [associationId, weekStart, monthYm, venueId, portalQuery, viewMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const venueOptions = useMemo(() => {
    if (!data?.columns?.length) return [];
    const m = new Map<string, string>();
    for (const c of data.columns) {
      if (!m.has(c.venueId)) m.set(c.venueId, c.venueName);
    }
    return [...m.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: "base" }),
    );
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-900">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold text-slate-600 leading-relaxed">
          <strong>Transparency:</strong> published league games show team names.{" "}
          <strong>Training</strong> shows the organising club or association only.{" "}
          <strong>Venue hire</strong> and other sensitive bookings appear only as{" "}
          <strong>Private</strong> here (no hirer, fees, or contract text).{" "}
          <strong>Month view</strong> shows counts per day and pitch; <strong>Week view</strong> has
          full detail for games and training.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#06054e]">Pitch calendar</h1>
          <p className="text-sm font-bold text-slate-600 mt-1">{associationName}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-xl border-2 border-slate-300 overflow-hidden">
            <button
              type="button"
              className={`px-3 py-2 text-xs font-black ${
                viewMode === "week" ? "bg-[#06054e] text-white" : "bg-white text-slate-700"
              }`}
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-xs font-black ${
                viewMode === "month" ? "bg-[#06054e] text-white" : "bg-white text-slate-700"
              }`}
              onClick={() => {
                setViewMode("month");
                setMonthYm(weekStart.slice(0, 7));
              }}
            >
              Month
            </button>
          </div>
          {viewMode === "week" ? (
            <>
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 px-3 py-2 text-xs font-black"
                onClick={() => setWeekStart((w) => addDaysYmd(w, -7))}
              >
                ← Prev week
              </button>
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 px-3 py-2 text-xs font-black"
                onClick={() => setWeekStart(utcMondayWeekStartYmd())}
              >
                This week
              </button>
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 px-3 py-2 text-xs font-black"
                onClick={() => setWeekStart((w) => addDaysYmd(w, 7))}
              >
                Next week →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 px-3 py-2 text-xs font-black"
                onClick={() => setMonthYm((m) => addMonthsYm(m, -1))}
              >
                ← Prev month
              </button>
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 px-3 py-2 text-xs font-black"
                onClick={() => setMonthYm(utcMonthYm())}
              >
                This month
              </button>
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 px-3 py-2 text-xs font-black"
                onClick={() => setMonthYm((m) => addMonthsYm(m, 1))}
              >
                Next month →
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap gap-4 items-center">
        {viewMode === "week" ? (
          <label className="text-sm font-bold text-slate-700">
            Week starts (UTC Monday)
            <input
              type="date"
              className="mt-1 block rounded-lg border-2 border-slate-200 px-2 py-2 font-mono text-sm font-bold"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
          </label>
        ) : (
          <label className="text-sm font-bold text-slate-700">
            Month (UTC)
            <input
              type="month"
              className="mt-1 block rounded-lg border-2 border-slate-200 px-2 py-2 font-mono text-sm font-bold"
              value={monthYm}
              onChange={(e) => setMonthYm(e.target.value)}
            />
          </label>
        )}
        <label className="text-sm font-bold text-slate-700">
          Venue filter
          <select
            className="mt-1 block rounded-lg border-2 border-slate-200 px-2 py-2 text-sm font-bold min-w-[200px]"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
          >
            <option value="">All venues</option>
            {venueOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-[#06054e] text-white px-4 py-2 text-sm font-black"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="text-sm font-bold text-slate-500">Loading…</div>
      ) : null}

      {data && data.columns.length === 0 ? (
        <p className="text-sm font-bold text-slate-600">
          No active pitches are configured for this association yet. Ask an admin to add venues in
          the control panel.
        </p>
      ) : null}

      {isWeekPayload(data) && data.columns.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 bg-slate-100 px-2 py-2 font-black uppercase text-slate-600 border-r border-slate-200">
                  Day (UTC)
                </th>
                {data.columns.map((c) => (
                  <th
                    key={c.columnKey}
                    className="px-2 py-2 font-black text-slate-700 min-w-[140px] align-bottom"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      {c.venueName}
                    </div>
                    <div className="text-xs">{c.pitchLabel}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((day) => (
                <tr key={day.dateKey} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                    <div>{day.dayLabel}</div>
                    <div className="font-mono text-[10px] text-slate-500">{day.dateKey}</div>
                  </td>
                  {data.columns.map((col) => {
                    const key = `${day.dateKey}::${col.columnKey}`;
                    const items = data.cells[key] ?? [];
                    return (
                      <td key={col.columnKey} className="align-top px-1 py-2 bg-white">
                        <div className="flex flex-col gap-1 min-h-[48px]">
                          {items.map((ev, idx) => (
                            <EventBlock key={eventKey(ev, idx)} ev={ev} />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isMonthPayload(data) && data.columns.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-bold text-slate-500 px-3 py-2 border-b border-slate-100">
            Month summary · {data.month} · UTC days
          </p>
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 bg-slate-100 px-2 py-2 font-black uppercase text-slate-600 border-r border-slate-200">
                  Day (UTC)
                </th>
                {data.columns.map((c) => (
                  <th
                    key={c.columnKey}
                    className="px-2 py-2 font-black text-slate-700 min-w-[120px] align-bottom"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      {c.venueName}
                    </div>
                    <div className="text-xs">{c.pitchLabel}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((day) => (
                <tr key={day.dateKey} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                    <div>{day.dayLabel}</div>
                    <div className="font-mono text-[10px] text-slate-500">{day.dateKey}</div>
                  </td>
                  {data.columns.map((col) => {
                    const key = `${day.dateKey}::${col.columnKey}`;
                    const s = data.summaries[key] ?? {
                      matchCount: 0,
                      trainingCount: 0,
                      privateCount: 0,
                      lines: [],
                      total: 0,
                    };
                    return (
                      <td key={col.columnKey} className="align-top px-1 py-2 bg-white max-w-[200px]">
                        <MonthSummaryCell s={s} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-[11px] font-bold text-slate-500">
        Times and day boundaries use <strong>UTC</strong>. Week view uses a Monday anchor; month
        view uses the full UTC calendar month.
      </p>

      <Link
        href={`/associations/${encodeURIComponent(associationId)}`}
        className="inline-flex text-sm font-black text-[#06054e] underline"
      >
        ← Back to association hub
      </Link>
    </div>
  );
}
