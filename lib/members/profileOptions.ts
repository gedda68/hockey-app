// Pick-lists for the My Details form. Configured values (config collection) win; sensible defaults fill gaps.
// Stored member data keeps the config id (e.g. "sal-mr"); people always see the name ("Mr").

export interface PickOption {
  value: string;
  label: string;
  /** Other ids a stored value may use for this option (e.g. a Mongo _id, or "sal-mr"). */
  aliases?: string[];
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
  configured: { id?: unknown; name?: unknown; aliases?: unknown[] }[],
  defaults: string[],
): PickOption[] {
  const seen = new Set<string>();
  const out: PickOption[] = [];
  for (const row of configured) {
    const label = String(row?.name ?? "").trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    const value = String(row?.id ?? "").trim() || label;
    const aliases = (row?.aliases ?? []).map((a) => String(a ?? "").trim()).filter((a) => a && a !== value);
    out.push({ value, label, ...(aliases.length ? { aliases } : {}) });
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
    options.find((o) => o.aliases?.some((a) => a === c || a.toLowerCase() === c.toLowerCase())) ??
    options.find((o) => o.label.toLowerCase() === c.toLowerCase()) ??
    options.find((o) => o.value.toLowerCase() === c.toLowerCase());
  if (hit) return { options, value: hit.value };
  // Unknown id like "sal-mr" / "gender-male": show a readable name instead of the raw id.
  const nice = /^(sal|gender)[-_]/i.test(c) ? c.replace(/^(sal|gender)[-_]/i, "").replace(/[-_]+/g, " ") : c;
  const label = nice.replace(/\b\w/g, (m) => m.toUpperCase());
  return { options: [{ value: c, label }, ...options], value: c };
}

/** Defaults that carry the ids this system has always used, so old stored ids resolve even with no config rows. */
export const DEFAULT_SALUTATION_ROWS = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof"].map((name) => ({
  id: `sal-${name.toLowerCase()}`, name,
}));
export const DEFAULT_GENDER_ROWS = [
  { id: "gender-male", name: "Male" }, { id: "gender-female", name: "Female" },
  { id: "gender-non-binary", name: "Non-binary" }, { id: "gender-other", name: "Other" },
  { id: "gender-undisclosed", name: "Prefer not to say" },
];
