export type PublicTelemetryEvent =
  | "tenant.resolve.no_slug"
  | "tenant.resolve.not_found"
  | "tenant.redirect"
  | "access.deny";

type TelemetryFields = Record<string, string | number | boolean | null | undefined>;

function safeHost(host: string | null | undefined): string {
  return String(host ?? "").slice(0, 200);
}

function safePath(pathname: string | null | undefined): string {
  const p = String(pathname ?? "");
  return p.length > 300 ? p.slice(0, 300) : p;
}

/**
 * Lightweight structured logs (JSON) for production + dev.
 * Intentionally avoids user identifiers, cookies, or query strings.
 */
export function logPublicTelemetry(
  event: PublicTelemetryEvent,
  fields: TelemetryFields,
) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  // Keep it simple: JSON line logs (works with most log shippers)
  console.warn(JSON.stringify(payload));
}

export function telemetryFromRequestLike(input: {
  hostHeader?: string | null;
  pathname?: string | null;
}) {
  return {
    host: safeHost(input.hostHeader),
    path: safePath(input.pathname),
  };
}

