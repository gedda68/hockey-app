import { describe, it, expect } from "vitest";
import { buildSeasonalRegistrationReminderEmail } from "@/lib/email/templates/seasonalRegistrationReminder";

const BASE_OPTS = {
  firstName:          "Alex",
  roleLabel:          "Player",
  scopeName:          "Northside Hockey Club",
  scopeType:          "club" as const,
  currentSeasonYear:  "2025",
  upcomingSeasonYear: "2026",
  weeksLabel:         "6w" as const,
  customText:         null,
};

// ── subject ───────────────────────────────────────────────────────────────────

describe("buildSeasonalRegistrationReminderEmail — subject", () => {
  it("contains the upcoming season year", () => {
    const { subject } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(subject).toContain("2026");
  });

  it("6w subject mentions 'registration is open'", () => {
    const { subject } = buildSeasonalRegistrationReminderEmail({ ...BASE_OPTS, weeksLabel: "6w" });
    expect(subject.toLowerCase()).toContain("open");
  });

  it("2w subject conveys urgency", () => {
    const { subject } = buildSeasonalRegistrationReminderEmail({ ...BASE_OPTS, weeksLabel: "2w" });
    // Should mention "time" or "running out"
    expect(subject.toLowerCase()).toMatch(/time|running out|soon/);
  });
});

// ── HTML ──────────────────────────────────────────────────────────────────────

describe("buildSeasonalRegistrationReminderEmail — html", () => {
  it("addresses the member by first name", () => {
    const { html } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(html).toContain("Alex");
  });

  it("includes the role label", () => {
    const { html } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(html).toContain("Player");
  });

  it("includes the scope name", () => {
    const { html } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(html).toContain("Northside Hockey Club");
  });

  it("includes current and upcoming season years", () => {
    const { html } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(html).toContain("2025");
    expect(html).toContain("2026");
  });

  it("includes the registration CTA URL", () => {
    const { html } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(html).toContain("my-registrations");
  });

  it("6w urgency banner uses amber colour", () => {
    const { html } = buildSeasonalRegistrationReminderEmail({ ...BASE_OPTS, weeksLabel: "6w" });
    expect(html).toContain("#d97706"); // amber-600
  });

  it("2w urgency banner uses red colour", () => {
    const { html } = buildSeasonalRegistrationReminderEmail({ ...BASE_OPTS, weeksLabel: "2w" });
    expect(html).toContain("#dc2626"); // red-600
  });

  it("does NOT inject custom paragraph when customText is null", () => {
    const { html } = buildSeasonalRegistrationReminderEmail({ ...BASE_OPTS, customText: null });
    expect(html).not.toContain("border-left:4px solid #f59e0b"); // custom block style
  });

  it("injects custom paragraph when customText is provided", () => {
    const { html } = buildSeasonalRegistrationReminderEmail({
      ...BASE_OPTS,
      customText: "Please contact Jane Bloggs for any questions.",
    });
    expect(html).toContain("Please contact Jane Bloggs for any questions.");
    expect(html).toContain("#f59e0b"); // amber left-border on custom block
  });

  it("is valid UTF-8 HTML (contains DOCTYPE and body tags)", () => {
    const { html } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });
});

// ── plain text ────────────────────────────────────────────────────────────────

describe("buildSeasonalRegistrationReminderEmail — text", () => {
  it("contains first name", () => {
    const { text } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(text).toContain("Alex");
  });

  it("contains both season years", () => {
    const { text } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(text).toContain("2025");
    expect(text).toContain("2026");
  });

  it("contains registration URL", () => {
    const { text } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(text).toContain("my-registrations");
  });

  it("contains custom text when provided", () => {
    const { text } = buildSeasonalRegistrationReminderEmail({
      ...BASE_OPTS,
      customText: "Deadline is March 15.",
    });
    expect(text).toContain("Deadline is March 15.");
  });

  it("does not contain HTML tags", () => {
    const { text } = buildSeasonalRegistrationReminderEmail(BASE_OPTS);
    expect(text).not.toMatch(/<[a-z][^>]*>/i);
  });
});

// ── scopeType variants ────────────────────────────────────────────────────────

describe("buildSeasonalRegistrationReminderEmail — scopeType variants", () => {
  it("renders for association scopeType without error", () => {
    const result = buildSeasonalRegistrationReminderEmail({
      ...BASE_OPTS,
      scopeType: "association",
      scopeName: "Hockey Victoria",
    });
    expect(result.html).toContain("Hockey Victoria");
    expect(result.text).toContain("Hockey Victoria");
  });

  it("renders for team scopeType without error", () => {
    const result = buildSeasonalRegistrationReminderEmail({
      ...BASE_OPTS,
      scopeType: "team",
      scopeName: "Under 18s",
    });
    expect(result.html).toContain("Under 18s");
  });
});
