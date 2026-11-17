// lib/records/validate.ts
// Cleaning what the forms send for training sessions, injuries and incident reports. Pure.

export type Cleaned<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isIso = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed as readonly string[]).includes(String(v)) ? (String(v) as T) : null;

// ── Training ──────────────────────────────────────────────────────────────────

export const ATTENDANCE = ["present", "absent", "excused", "late"] as const;
export type AttendanceStatus = (typeof ATTENDANCE)[number];
export const TRAINING_STATUS = ["scheduled", "completed", "cancelled"] as const;

export interface TrainingInput { title: string; teamId: string | null; startAt: string; endAt: string | null; location: string; focus: string; status: (typeof TRAINING_STATUS)[number] }

export function cleanTraining(body: unknown, partial = false): Cleaned<Partial<TrainingInput>> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const out: Partial<TrainingInput> = {};
  if (b.title !== undefined || !partial) {
    const title = str(b.title, 120);
    if (!title) return { ok: false, error: "Give the session a title" };
    out.title = title;
  }
  if (b.startAt !== undefined || !partial) {
    if (!isIso(b.startAt)) return { ok: false, error: "Choose a start date and time" };
    out.startAt = new Date(String(b.startAt)).toISOString();
  }
  if (b.endAt !== undefined) {
    if (b.endAt === null || b.endAt === "") out.endAt = null;
    else if (!isIso(b.endAt)) return { ok: false, error: "The end time isn't a valid date" };
    else out.endAt = new Date(String(b.endAt)).toISOString();
    if (out.endAt && out.startAt && out.endAt < out.startAt) return { ok: false, error: "The session ends before it starts" };
  }
  if (b.teamId !== undefined) out.teamId = str(b.teamId, 80) || null;
  if (b.location !== undefined) out.location = str(b.location, 160);
  if (b.focus !== undefined) out.focus = str(b.focus, 1000);
  if (b.status !== undefined) {
    const s = pick(b.status, TRAINING_STATUS);
    if (!s) return { ok: false, error: "Unknown status" };
    out.status = s;
  }
  return { ok: true, value: out };
}

/** Attendance rows: known statuses only, one row per person, only people in `allowed` (the team) when given. */
export function cleanAttendance(rows: unknown, allowed?: Set<string>): { memberId: string; status: AttendanceStatus; note?: string }[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: { memberId: string; status: AttendanceStatus; note?: string }[] = [];
  for (const r of rows) {
    const memberId = str((r as any)?.memberId, 80);
    const status = pick((r as any)?.status, ATTENDANCE);
    if (!memberId || !status || seen.has(memberId) || (allowed && !allowed.has(memberId))) continue;
    seen.add(memberId);
    const note = str((r as any)?.note, 200);
    out.push({ memberId, status, ...(note ? { note } : {}) });
  }
  return out;
}

// ── Injuries ──────────────────────────────────────────────────────────────────

export const INJURY_SEVERITY = ["minor", "moderate", "serious"] as const;
export const INJURY_STATUS = ["active", "recovering", "cleared"] as const;
export type InjuryStatus = (typeof INJURY_STATUS)[number];

export interface InjuryInput { memberId: string; occurredAt: string; bodyPart: string; description: string; severity: (typeof INJURY_SEVERITY)[number]; teamId: string | null; expectedReturn: string | null }

export function cleanInjury(body: unknown): Cleaned<InjuryInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const memberId = str(b.memberId, 80);
  if (!memberId) return { ok: false, error: "Choose who was injured" };
  if (!isIso(b.occurredAt)) return { ok: false, error: "Choose when it happened" };
  if (Date.parse(String(b.occurredAt)) > Date.now() + 86400000) return { ok: false, error: "That date is in the future" };
  const bodyPart = str(b.bodyPart, 80);
  if (!bodyPart) return { ok: false, error: "Say which part of the body" };
  const severity = pick(b.severity, INJURY_SEVERITY) ?? "minor";
  let expectedReturn: string | null = null;
  if (b.expectedReturn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.expectedReturn))) return { ok: false, error: "Use a date like 2026-03-14 for the expected return" };
    expectedReturn = String(b.expectedReturn);
  }
  return { ok: true, value: { memberId, occurredAt: new Date(String(b.occurredAt)).toISOString(), bodyPart, description: str(b.description, 2000), severity, teamId: str(b.teamId, 80) || null, expectedReturn } };
}

/** An update to an injury: a new status and/or return date, with a note for the history. */
export function cleanInjuryUpdate(body: unknown): Cleaned<{ status?: InjuryStatus; expectedReturn?: string | null; note?: string }> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const out: { status?: InjuryStatus; expectedReturn?: string | null; note?: string } = {};
  if (b.status !== undefined) {
    const s = pick(b.status, INJURY_STATUS);
    if (!s) return { ok: false, error: "Unknown status" };
    out.status = s;
  }
  if (b.expectedReturn !== undefined) {
    if (!b.expectedReturn) out.expectedReturn = null;
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.expectedReturn))) return { ok: false, error: "Use a date like 2026-03-14 for the expected return" };
    else out.expectedReturn = String(b.expectedReturn);
  }
  const note = str(b.note, 500);
  if (note) out.note = note;
  if (out.status === undefined && out.expectedReturn === undefined && !out.note) return { ok: false, error: "Nothing to update" };
  return { ok: true, value: out };
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export const INCIDENT_CATEGORY = ["injury", "conduct", "child-safety", "property", "other"] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORY)[number];
export const INCIDENT_SEVERITY = ["low", "medium", "high"] as const;
export const INCIDENT_STATUS = ["reported", "under-review", "escalated", "closed"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

/** Conduct and child-safety reports are confidential: only people with read access to incidents see them, never the wider club. */
export const isConfidentialCategory = (c: IncidentCategory) => c === "conduct" || c === "child-safety";

export interface IncidentInput {
  occurredAt: string; location: string; category: IncidentCategory; severity: (typeof INCIDENT_SEVERITY)[number];
  description: string; peopleInvolved: { memberId?: string; name: string; role?: string }[]; actionTaken: string; confidential: boolean;
}

export function cleanIncident(body: unknown): Cleaned<IncidentInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!isIso(b.occurredAt)) return { ok: false, error: "Choose when it happened" };
  if (Date.parse(String(b.occurredAt)) > Date.now() + 86400000) return { ok: false, error: "That date is in the future" };
  const category = pick(b.category, INCIDENT_CATEGORY);
  if (!category) return { ok: false, error: "Choose a category" };
  const description = str(b.description, 4000);
  if (!description) return { ok: false, error: "Describe what happened" };
  const people = (Array.isArray(b.peopleInvolved) ? b.peopleInvolved : []).slice(0, 20).flatMap((p: any) => {
    const name = str(p?.name, 120);
    if (!name) return [];
    const memberId = str(p?.memberId, 80);
    const role = str(p?.role, 60);
    return [{ ...(memberId ? { memberId } : {}), name, ...(role ? { role } : {}) }];
  });
  return {
    ok: true,
    value: {
      occurredAt: new Date(String(b.occurredAt)).toISOString(),
      location: str(b.location, 160),
      category,
      severity: pick(b.severity, INCIDENT_SEVERITY) ?? "low",
      description,
      peopleInvolved: people,
      actionTaken: str(b.actionTaken, 2000),
      // A reporter can ask for confidentiality on any report; some categories always are.
      confidential: isConfidentialCategory(category) || b.confidential === true,
    },
  };
}

export function cleanIncidentUpdate(body: unknown): Cleaned<{ status?: IncidentStatus; note?: string }> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const out: { status?: IncidentStatus; note?: string } = {};
  if (b.status !== undefined) {
    const s = pick(b.status, INCIDENT_STATUS);
    if (!s) return { ok: false, error: "Unknown status" };
    out.status = s;
  }
  const note = str(b.note, 2000);
  if (note) out.note = note;
  if (!out.status && !out.note) return { ok: false, error: "Nothing to update" };
  return { ok: true, value: out };
}
