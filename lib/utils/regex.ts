/**
 * Escapes special regex characters in a user-supplied string so it can be
 * safely embedded in a MongoDB $regex query without enabling ReDoS attacks.
 *
 * @example
 *   { name: { $regex: escapeRegex(search), $options: "i" } }
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
