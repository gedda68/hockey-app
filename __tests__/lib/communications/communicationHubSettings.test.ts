import { describe, expect, it } from "vitest";
import { mergeCommunicationHubSettings } from "@/lib/communications/communicationHubSettings";

describe("mergeCommunicationHubSettings", () => {
  it("returns defaults when row is null", () => {
    const s = mergeCommunicationHubSettings(null);
    expect(s.weeklyDigestEnabled).toBe(false);
    expect(s.fixtureChangeEmailSupplementText).toBeNull();
    expect(s.enabledPushTopics).toEqual(["fixture_changes"]);
  });

  it("honours explicit empty push topics", () => {
    const s = mergeCommunicationHubSettings({
      enabledPushTopics: [],
    } as Record<string, unknown>);
    expect(s.enabledPushTopics).toEqual([]);
  });

  it("filters unknown push topics", () => {
    const s = mergeCommunicationHubSettings({
      enabledPushTopics: ["fixture_changes", "nope"],
    } as Record<string, unknown>);
    expect(s.enabledPushTopics).toEqual(["fixture_changes"]);
  });
});
