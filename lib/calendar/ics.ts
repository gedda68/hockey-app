// lib/calendar/ics.ts
// An iCalendar (.ics) feed that Google, Apple and Outlook calendars can subscribe to. Pure: no database in here.

export type CalStatus = "CONFIRMED" | "TENTATIVE" | "CANCELLED";
export interface CalItem {
  /** Stays the same every time the feed is read, so a change updates the entry instead of adding another. */
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  url?: string;
  status?: CalStatus;
  /** Remind this many minutes before (shown by apps that honour reminders on subscribed calendars). */
  alarmMinutes?: number;
}

/** Text values: backslash, semicolon, comma and line breaks are escaped, as the format requires. */
export const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 bytes are split, each continuation starting with a space. Never splits a multi-byte character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "", bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ""; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const STATUS_WORD: Record<CalStatus, string> = { CONFIRMED: "", TENTATIVE: "Postponed: ", CANCELLED: "Cancelled: " };

export function buildCalendar(o: { name: string; items: CalItem[]; now: Date; description?: string; domain?: string }): string {
  const domain = o.domain ?? "hockey-app";
  const L: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hockey Management System//Calendar feed//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(o.name)}`, "X-WR-TIMEZONE:Australia/Brisbane", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
  ];
  if (o.description) L.push(`X-WR-CALDESC:${escapeText(o.description)}`);
  for (const it of o.items) {
    if (Number.isNaN(it.start.getTime())) continue;
    const end = Number.isNaN(it.end.getTime()) || it.end <= it.start ? new Date(it.start.getTime() + 3600_000) : it.end;
    const status = it.status ?? "CONFIRMED";
    L.push("BEGIN:VEVENT", `UID:${it.uid.replace(/[^A-Za-z0-9:._-]/g, "-")}@${domain}`, `DTSTAMP:${utcStamp(o.now)}`, `DTSTART:${utcStamp(it.start)}`, `DTEND:${utcStamp(end)}`,
      `SUMMARY:${escapeText(`${STATUS_WORD[status]}${it.title}`)}`, `STATUS:${status}`);
    if (it.location) L.push(`LOCATION:${escapeText(it.location)}`);
    if (it.description) L.push(`DESCRIPTION:${escapeText(it.description)}`);
    if (it.url) L.push(`URL:${it.url}`);
    if (it.alarmMinutes && status !== "CANCELLED") L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(it.title)}`, `TRIGGER:-PT${Math.round(it.alarmMinutes)}M`, "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(foldLine).join("\r\n") + "\r\n";
}

/** A shift's clock times on its day in Brisbane (UTC+10, no daylight saving). */
export function brisbaneTime(day: string, hhmm: string): Date {
  return new Date(`${day}T${/^\d{2}:\d{2}$/.test(hhmm) ? hhmm : "00:00"}:00+10:00`);
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
/** The token from a URL segment, which may end in ".ics". */
export const tokenFromSegment = (seg: string): string | null => { const t = seg.replace(/\.ics$/i, ""); return TOKEN_RE.test(t) ? t : null; };
