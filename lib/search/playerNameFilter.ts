// lib/search/playerNameFilter.ts
// Builds the MongoDB filter for public player-name search. Pure (no DB access) so it
// can be unit-tested. Matching is word-prefix on each typed token, so "jane smi"
// finds Jane Smith but a stray fragment in the middle of a name does not match.

import { escapeRegex } from "@/lib/utils/regex";

/** Extra tokens beyond this are ignored (first / middle / last is plenty). */
export const MAX_NAME_TOKENS = 3;

/** Each token must be at least this long, so one-letter probes can't enumerate members. */
export const MIN_TOKEN_LENGTH = 2;

const NAME_FIELDS = [
  "personalInfo.firstName",
  "personalInfo.lastName",
  "personalInfo.preferredName",
  "personalInfo.displayName",
] as const;

export function tokenizePlayerQuery(q: string): string[] {
  return q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, MAX_NAME_TOKENS);
}

/**
 * Returns a Mongo filter, or null when the query is too short to search.
 * Every token must prefix-match at least one name field (AND across tokens).
 */
export function buildPlayerNameFilter(q: string): Record<string, unknown> | null {
  const tokens = tokenizePlayerQuery(q);
  if (tokens.length === 0) return null;
  if (tokens.some((t) => t.length < MIN_TOKEN_LENGTH)) return null;

  return {
    $and: tokens.map((token) => {
      const re = new RegExp(`^${escapeRegex(token)}`, "i");
      return { $or: NAME_FIELDS.map((field) => ({ [field]: { $regex: re } })) };
    }),
  };
}
