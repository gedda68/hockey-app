import { randomUUID } from "crypto";

export type AdminTelemetryEvent =
  // ── Existing competition / fixture events ─────────────────────────────────
  | "admin.competitions.get"
  | "admin.competitions.create"
  | "admin.season_competitions.patch"
  | "admin.fixtures.generate"
  | "admin.communication_hub.patch"
  // ── Role-request lifecycle ─────────────────────────────────────────────────
  | "admin.role_request.submit"          // member submits a request
  | "admin.role_request.approve"         // admin approves
  | "admin.role_request.reject"          // admin rejects
  | "admin.role_request.record_payment"  // payment recorded against a request
  | "admin.role_request.withdraw"        // requester or admin withdraws
  // ── Member mutations ───────────────────────────────────────────────────────
  | "admin.member.create"
  | "admin.member.update"
  | "admin.member.deactivate"
  // ── Roster mutations ───────────────────────────────────────────────────────
  | "admin.roster.update"
  | "admin.roster.add_player"
  | "admin.roster.update_player"
  | "admin.roster.remove_player";

export type TelemetryFields = Record<string, string | number | boolean | null | undefined>;

function safeStr(v: unknown, max = 200): string {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Generate a per-request trace ID (UUID v4).
 * Call once at the top of a route handler; pass `traceId` to every
 * logAdminTelemetry / logAdminError call within that request.
 */
export function generateTraceId(): string {
  return randomUUID();
}

/**
 * Structured logs (JSON line) for admin mutations / heavy ops.
 *
 * Unlike `publicTelemetry`, these logs intentionally include `userId` + role/scope
 * so we can correlate operational changes during support/triage.
 *
 * Always include `traceId` from `generateTraceId()` so all lines for a single
 * request can be correlated in log aggregators.
 */
export function logAdminTelemetry(event: AdminTelemetryEvent, fields: TelemetryFields) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.info(JSON.stringify(payload));
}

/**
 * Structured error log — same JSON envelope as logAdminTelemetry but with
 * `level: "error"`.  Replaces bare `console.error("💥 …", error)` calls in
 * mutation handlers so every error is machine-readable and carries a traceId.
 *
 * @param event  Logical event name, e.g. "admin.member.create.error"
 * @param traceId  From generateTraceId() at the top of the enclosing handler
 * @param error  The caught value (Error or unknown)
 * @param extra  Any extra fields to include (userId, memberId, etc.)
 */
export function logAdminError(
  event: string,
  traceId: string,
  error: unknown,
  extra?: TelemetryFields,
) {
  const payload = {
    ts:      new Date().toISOString(),
    level:   "error" as const,
    event,
    traceId,
    error:   error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack
      ? { stack: error.stack.split("\n").slice(0, 4).join(" | ") }
      : {}),
    ...extra,
  };
  console.error(JSON.stringify(payload));
}

export function adminTelemetryFromRequestLike(input: {
  hostHeader?: string | null;
  pathname?: string | null;
  method?: string | null;
}) {
  return {
    host:   safeStr(input.hostHeader, 200),
    path:   safeStr(input.pathname, 300),
    method: safeStr(input.method, 16),
  };
}

