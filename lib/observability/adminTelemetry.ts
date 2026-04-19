export type AdminTelemetryEvent =
  | "admin.competitions.get"
  | "admin.competitions.create"
  | "admin.season_competitions.patch"
  | "admin.fixtures.generate";

type TelemetryFields = Record<string, string | number | boolean | null | undefined>;

function safeStr(v: unknown, max = 200): string {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Structured logs (JSON line) for admin mutations / heavy ops.
 *
 * Unlike `publicTelemetry`, these logs intentionally include `userId` + role/scope
 * so we can correlate operational changes during support/triage.
 */
export function logAdminTelemetry(event: AdminTelemetryEvent, fields: TelemetryFields) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.info(JSON.stringify(payload));
}

export function adminTelemetryFromRequestLike(input: {
  hostHeader?: string | null;
  pathname?: string | null;
  method?: string | null;
}) {
  return {
    host: safeStr(input.hostHeader, 200),
    path: safeStr(input.pathname, 300),
    method: safeStr(input.method, 16),
  };
}

