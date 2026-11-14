// Pick-lists for the My Details form. Configured values (config collection) win; sensible defaults fill gaps.
// Stored member data keeps the config id (e.g. "sal-mr"); people always see the name ("Mr").

export interface PickOption {
  value: string;
  label: string;
}

export const DEFAULT_SALUTATIONS = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof"];
export const DEFAULT_GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
export const DEFAULT_RELATIONSHIPS = [
  "Mother", "Father", "Parent", "Guardian", "Step-parent", "Grandparent", "Partner", "Spouse",
  "Sibling", "Child", "Aunt/Uncle", "Friend", "Carer", "Other",
];

export const namesToOptions = (names: string[]): PickOption[] => names.map((n) => ({ value: n, label: n }));

/** Configured {id,name} rows first (de-duplicated by name); defaults only when nothing is configured. */
export function mergeOptions(
  configured: { id?: unknown; name?: unknown }[],
  defaults: string[],
): PickOption[] {
  const seen = new Set<string>();
  const out: PickOption[] = [];
  for (const row of configured) {
    const label = String(row?.name ?? "").trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push({ value: String(row?.id ?? "").trim() || label, label });
  }
  return out.length ? out : namesToOptions(defaults);
}

/**
 * Match a stored value (an id like "sal-mr" or a plain name like "Mr") to an option and return the
 * option list plus the value to select. A stored value that matches nothing is kept as its own option.
 */
export function resolveSelection(options: PickOption[], stored: string): { options: PickOption[]; value: string } {
  const c = stored.trim();
  if (!c) return { options, value: "" };
  const hit =
    options.find((o) => o.value === c) ??
    options.find((o) => o.label.toLowerCase() === c.toLowerCase()) ??
    options.find((o) => o.value.toLowerCase() === c.toLowerCase());
  if (hit) return { options, value: hit.value };
  return { options: [{ value: c, label: c }, ...options], value: c };
}
