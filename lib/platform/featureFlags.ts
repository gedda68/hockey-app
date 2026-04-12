/**
 * Opt-out feature flags for destructive or higher-risk competition / tournament actions.
 * All flags default to **enabled** when unset (backward compatible). Set the env var to
 * `"true"` to **disable** the feature.
 *
 * @see docs/platform/FEATURE_FLAGS.md
 */

function isExplicitlyDisabled(envName: string): boolean {
  const v = process.env[envName]?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** POST .../fixtures/generate with `{ replace: true }` (wipes existing league fixtures for the season). */
export function isLeagueFixtureBulkReplaceEnabled(): boolean {
  return !isExplicitlyDisabled("FEATURE_DISABLE_LEAGUE_FIXTURE_BULK_REPLACE");
}

/** POST .../tournaments/[id]/fixtures with `{ replace: true }` for pool or knockout phase. */
export function isRepTournamentFixtureReplaceEnabled(): boolean {
  return !isExplicitlyDisabled("FEATURE_DISABLE_REP_TOURNAMENT_FIXTURE_REPLACE");
}

/** POST .../tournaments/[id]/fixtures with `mode: "knockout_from_draw"`. */
export function isRepTournamentKnockoutFromDrawEnabled(): boolean {
  return !isExplicitlyDisabled("FEATURE_DISABLE_REP_TOURNAMENT_KNOCKOUT_GENERATE");
}
