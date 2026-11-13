// Shared option helpers for config-backed dropdowns (relationship types etc.).

export interface OptionItem { id: string; name: string; code?: string; isActive?: boolean }
export interface Option { value: string; label: string }

export const DEFAULT_RELATIONSHIPS: OptionItem[] = [
  ["rel-parent", "Parent"], ["rel-mother", "Mother"], ["rel-father", "Father"],
  ["rel-guardian", "Guardian"], ["rel-spouse", "Spouse / Partner"], ["rel-sibling", "Sibling"],
  ["rel-child", "Child"], ["rel-grandparent", "Grandparent"], ["rel-friend", "Friend"], ["rel-other", "Other"],
].map(([id, name]) => ({ id, name, isActive: true }));

const norm = (v: unknown) =>
  String(v ?? "").toLowerCase().replace(/^(gender|sal|rel|relationship)[-_]/, "").replace(/[-_\s/]+/g, "");

/** Active config rows, or the defaults when the config has none / cannot be read. */
export function activeOrDefault<T extends OptionItem>(rows: unknown, defaults: T[]): T[] {
  const list = Array.isArray(rows) ? (rows as T[]).filter((r) => r.isActive !== false) : [];
  return list.length ? list : defaults;
}

/** Options plus the option value matching what is stored (by id, code or name); unmatched values stay visible. */
export function buildOptions(items: OptionItem[], stored: unknown): { options: Option[]; value: string } {
  const options = items.map((i) => ({ value: i.id, label: i.name }));
  const raw = String(stored ?? "");
  if (!raw) return { options, value: "" };
  const hit = items.find((i) => i.id === raw) ?? items.find((i) => [i.id, i.code, i.name].some((x) => norm(x) === norm(raw)));
  if (hit) return { options, value: hit.id };
  const label = raw.replace(/^(gender|sal|rel|relationship)[-_]/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { options: [{ value: raw, label }, ...options], value: raw };
}
