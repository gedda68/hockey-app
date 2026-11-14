// A member's status is normally a string ("active"), but some records (e.g. imported staff members) hold an
// object such as { current: "active", ... } at `status`. Read it defensively so login never crashes on it.

const KEYS = ["current", "value", "status", "state", "name", "label", "code"];

function pick(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of KEYS) if (typeof o[k] === "string" && (o[k] as string).trim()) return (o[k] as string).trim();
    if (typeof o.active === "boolean") return o.active ? "active" : "inactive";
  }
  return "";
}

/** Lower-case status string for a member, or "" when none can be determined. */
export function memberStatusString(member: Record<string, any> | null | undefined): string {
  return (pick(member?.status) || pick(member?.membership?.status)).toLowerCase();
}
