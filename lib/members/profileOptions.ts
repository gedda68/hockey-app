// Pick-lists for the My Details form. Configured values (config collection) win; sensible defaults fill gaps.

export const DEFAULT_SALUTATIONS = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof"];
export const DEFAULT_GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
export const DEFAULT_RELATIONSHIPS = [
  "Mother", "Father", "Parent", "Guardian", "Step-parent", "Grandparent", "Partner", "Spouse",
  "Sibling", "Child", "Aunt/Uncle", "Friend", "Carer", "Other",
];

/** Configured names first (de-duplicated, case-insensitive); defaults only when nothing is configured. */
export function mergeOptions(configured: unknown[], defaults: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of configured) {
    const v = String(raw ?? "").trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out.length ? out : defaults;
}

/** Ensure a stored value that isn't in the list still shows (older/imported data). */
export function withCurrent(options: string[], current: string): string[] {
  const c = current.trim();
  if (!c || options.some((o) => o.toLowerCase() === c.toLowerCase())) return options;
  return [c, ...options];
}
