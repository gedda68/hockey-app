// lib/members/school.ts
// School and district: an optional data point collected at registration for statistics (where our young players go to school).
// Stored as personalInfo.school. Pure.

export interface School { attends: boolean; name?: string; district?: string }

const tidy = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** What the form sent, made safe. `null` means nothing was said (leave what's stored alone); attends=false means "not at school". */
export function cleanSchool(raw: unknown): School | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.attends !== "boolean") return null;
  if (!r.attends) return { attends: false };
  const name = tidy(r.name, 120), district = tidy(r.district, 80);
  return { attends: true, ...(name ? { name } : {}), ...(district ? { district } : {}) };
}

/** Same school or district typed differently ("Kelvin Grove State College", "kelvin grove state college ") groups together. */
export const groupKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
