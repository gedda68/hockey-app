import type { Filter } from "mongodb";

/** Members linked to a club (common field shapes in this codebase). */
export function memberBelongsToClubFilter(clubId: string): Filter<Record<string, unknown>> {
  return {
    $or: [
      { "membership.clubId": clubId },
      { clubId },
    ],
  };
}

export const ACTIVE_MEMBERSHIP_STATUSES = ["Active", "Life", "active"];
