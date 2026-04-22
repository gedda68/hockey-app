/**
 * __tests__/helpers/session.ts
 *
 * Factory functions that build valid SessionData objects for different roles.
 * Import these in any test that needs to mock `getSession()`.
 *
 * Usage:
 *   import { sessions } from "@/__tests__/helpers/session";
 *   vi.mocked(getSession).mockResolvedValue(sessions.clubAdmin("club-alpha"));
 */

import type { SessionData } from "@/lib/auth/session";

/** Base skeleton — every required field filled with safe defaults. */
export function makeSession(overrides: Partial<SessionData>): SessionData {
  return {
    userId:    overrides.userId    ?? "user-test",
    email:     overrides.email     ?? "test@example.com",
    name:      overrides.name      ?? "Test User",
    firstName: overrides.firstName ?? "Test",
    lastName:  overrides.lastName  ?? "User",
    role:      overrides.role      ?? "super-admin",
    associationId:   overrides.associationId   ?? null,
    clubId:          overrides.clubId          ?? null,
    clubSlug:        overrides.clubSlug        ?? null,
    memberId:        overrides.memberId        ?? null,
    scopedRoles:     overrides.scopedRoles     ?? [],
    ...overrides,
  };
}

// ── Role-specific factories ───────────────────────────────────────────────────

export const sessions = {
  /** Platform super-admin — passes every guard. */
  superAdmin: (): SessionData =>
    makeSession({ userId: "user-super", role: "super-admin" }),

  /** Club admin scoped to the given clubId. */
  clubAdmin: (clubId: string, clubSlug?: string): SessionData =>
    makeSession({
      userId:   `user-club-${clubId}`,
      role:     "club-admin",
      clubId,
      clubSlug: clubSlug ?? clubId,
    }),

  /** Association admin scoped to the given associationId. */
  associationAdmin: (associationId: string): SessionData =>
    makeSession({
      userId:        `user-assoc-${associationId}`,
      role:          "association-admin",
      associationId,
    }),

  /** Assoc registrar (registration.manage permission, association-scoped). */
  assocRegistrar: (associationId: string): SessionData =>
    makeSession({
      userId:        `user-assoc-reg-${associationId}`,
      role:          "assoc-registrar",
      associationId,
    }),

  /** Club registrar (registration.manage permission, club-scoped). */
  clubRegistrar: (clubId: string): SessionData =>
    makeSession({
      userId:  `user-reg-${clubId}`,
      role:    "registrar",
      clubId,
      clubSlug: clubId,
    }),

  /** Club coach (limited read-only permissions). */
  coach: (clubId: string): SessionData =>
    makeSession({
      userId:  `user-coach-${clubId}`,
      role:    "coach",
      clubId,
      clubSlug: clubId,
    }),

  /** Media/marketing role (content creation permissions). */
  mediaMarketing: (associationId?: string): SessionData =>
    makeSession({
      userId:        "user-media",
      role:          "media-marketing",
      associationId: associationId ?? null,
    }),

  /** Plain member / player — authenticated but no admin permissions. */
  player: (): SessionData =>
    makeSession({ userId: "user-player", role: "player" }),
};
