import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLeagueFixtureBulkReplaceEnabled,
  isRepTournamentFixtureReplaceEnabled,
  isRepTournamentKnockoutFromDrawEnabled,
} from "@/lib/platform/featureFlags";

describe("featureFlags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults all risky features to enabled", () => {
    expect(isLeagueFixtureBulkReplaceEnabled()).toBe(true);
    expect(isRepTournamentFixtureReplaceEnabled()).toBe(true);
    expect(isRepTournamentKnockoutFromDrawEnabled()).toBe(true);
  });

  it("disables league bulk replace when FEATURE_DISABLE_LEAGUE_FIXTURE_BULK_REPLACE is true", () => {
    vi.stubEnv("FEATURE_DISABLE_LEAGUE_FIXTURE_BULK_REPLACE", "true");
    expect(isLeagueFixtureBulkReplaceEnabled()).toBe(false);
  });

  it("disables tournament replace when FEATURE_DISABLE_REP_TOURNAMENT_FIXTURE_REPLACE is true", () => {
    vi.stubEnv("FEATURE_DISABLE_REP_TOURNAMENT_FIXTURE_REPLACE", "1");
    expect(isRepTournamentFixtureReplaceEnabled()).toBe(false);
  });

  it("disables knockout generate when FEATURE_DISABLE_REP_TOURNAMENT_KNOCKOUT_GENERATE is true", () => {
    vi.stubEnv("FEATURE_DISABLE_REP_TOURNAMENT_KNOCKOUT_GENERATE", "yes");
    expect(isRepTournamentKnockoutFromDrawEnabled()).toBe(false);
  });
});
