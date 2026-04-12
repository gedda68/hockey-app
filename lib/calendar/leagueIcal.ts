/**
 * J2 — Build iCalendar (.ics) document for league fixtures.
 */

export type IcalFixtureEvent = {
  uid: string;
  /** ISO 8601 */
  start: string;
  end?: string | null;
  summary: string;
  description?: string;
  location?: string | null;
};

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** UTC date-time for DTSTART/DTEND (basic) */
export function toIcalUtcDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.getUTCFullYear().toString().padStart(4, "0") +
    (d.getUTCMonth() + 1).toString().padStart(2, "0") +
    d.getUTCDate().toString().padStart(2, "0") +
    "T" +
    d.getUTCHours().toString().padStart(2, "0") +
    d.getUTCMinutes().toString().padStart(2, "0") +
    d.getUTCSeconds().toString().padStart(2, "0") +
    "Z"
  );
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 0) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  return parts.join("\r\n");
}

function buildEvent(e: IcalFixtureEvent, domain: string): string {
  const dtStart = toIcalUtcDateTime(e.start);
  if (!dtStart) return "";
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${escapeText(e.uid)}@${domain}`,
    `DTSTAMP:${toIcalUtcDateTime(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
  ];
  if (e.end) {
    const dtEnd = toIcalUtcDateTime(e.end);
    if (dtEnd) lines.push(`DTEND:${dtEnd}`);
  } else {
    const end = new Date(e.start);
    end.setUTCHours(end.getUTCHours() + 2);
    lines.push(`DTEND:${toIcalUtcDateTime(end.toISOString())}`);
  }
  lines.push(`SUMMARY:${escapeText(e.summary)}`);
  if (e.description)
    lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  if (e.location?.trim())
    lines.push(`LOCATION:${escapeText(e.location.trim())}`);
  lines.push("END:VEVENT");
  return lines.map((l) => foldLine(l)).join("\r\n");
}

export function buildLeagueIcsCalendar(input: {
  calendarName: string;
  domain: string;
  events: IcalFixtureEvent[];
}): string {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hockey App//League fixtures//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(input.calendarName)}`,
  ];
  const events = input.events
    .map((e) => buildEvent(e, input.domain))
    .filter(Boolean)
    .join("\r\n");
  const tail = ["END:VCALENDAR"];
  return [...head, events, ...tail].filter(Boolean).join("\r\n") + "\r\n";
}
