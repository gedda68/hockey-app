import type { Db } from "mongodb";
import { z } from "zod";

export const COMMUNICATION_HUB_PUSH_TOPICS = [
  "fixture_changes",
  "weekly_digest",
  "news_alerts",
] as const;

export type CommunicationHubPushTopic = (typeof COMMUNICATION_HUB_PUSH_TOPICS)[number];

export type CommunicationHubSettings = {
  fixtureChangeEmailSupplementText: string | null;
  weeklyDigestEnabled: boolean;
  weeklyDigestIntroText: string | null;
  enabledPushTopics: CommunicationHubPushTopic[];
  /**
   * R6 — Whether the seasonal re-registration reminder cron job should send
   * reminders for this association's members.  Defaults to false (opt-in).
   */
  seasonalReminderEnabled: boolean;
  /**
   * R6 — Optional plain-text paragraph injected into seasonal reminder emails
   * between the greeting and the registration details table.  Max 2000 chars.
   * HTML is stripped server-side before storage.
   */
  seasonalReminderCustomText: string | null;
};

const DEFAULT_SETTINGS: CommunicationHubSettings = {
  fixtureChangeEmailSupplementText: null,
  weeklyDigestEnabled: false,
  weeklyDigestIntroText: null,
  enabledPushTopics: ["fixture_changes"],
  seasonalReminderEnabled:    false,
  seasonalReminderCustomText: null,
};

const TOPIC_SET = new Set<string>(COMMUNICATION_HUB_PUSH_TOPICS);

function normalizeTopics(raw: unknown): CommunicationHubPushTopic[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SETTINGS.enabledPushTopics];
  const out = raw
    .map((x) => String(x ?? "").trim())
    .filter((x): x is CommunicationHubPushTopic => TOPIC_SET.has(x));
  return out.length ? (out as CommunicationHubPushTopic[]) : [];
}

export function mergeCommunicationHubSettings(
  row: Record<string, unknown> | null | undefined,
): CommunicationHubSettings {
  if (!row) return { ...DEFAULT_SETTINGS, enabledPushTopics: [...DEFAULT_SETTINGS.enabledPushTopics] };
  const supplement =
    typeof row.fixtureChangeEmailSupplementText === "string"
      ? row.fixtureChangeEmailSupplementText.trim().slice(0, 4000) || null
      : null;
  const digestIntro =
    typeof row.weeklyDigestIntroText === "string"
      ? row.weeklyDigestIntroText.trim().slice(0, 4000) || null
      : null;
  const reminderCustomText =
    typeof row.seasonalReminderCustomText === "string"
      ? row.seasonalReminderCustomText.trim().slice(0, 2000) || null
      : null;

  return {
    fixtureChangeEmailSupplementText: supplement,
    weeklyDigestEnabled: Boolean(row.weeklyDigestEnabled),
    weeklyDigestIntroText: digestIntro,
    enabledPushTopics: normalizeTopics(row.enabledPushTopics),
    // R6
    seasonalReminderEnabled:    Boolean(row.seasonalReminderEnabled),
    seasonalReminderCustomText: reminderCustomText,
  };
}

export async function getCommunicationHubSettingsForAssociation(
  db: Db,
  associationId: string,
): Promise<CommunicationHubSettings> {
  const id = associationId.trim();
  if (!id) return { ...DEFAULT_SETTINGS, enabledPushTopics: [...DEFAULT_SETTINGS.enabledPushTopics] };
  const row = await db.collection("communication_hub_settings").findOne({
    scopeType: "association",
    scopeId: id,
  });
  return mergeCommunicationHubSettings(row as Record<string, unknown> | null);
}

export const PatchCommunicationHubSettingsSchema = z.object({
  fixtureChangeEmailSupplementText: z.string().max(4000).nullable().optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  weeklyDigestIntroText: z.string().max(4000).nullable().optional(),
  enabledPushTopics: z
    .array(z.enum(COMMUNICATION_HUB_PUSH_TOPICS))
    .max(COMMUNICATION_HUB_PUSH_TOPICS.length)
    .optional(),
  // R6 — seasonal re-registration reminders
  seasonalReminderEnabled:    z.boolean().optional(),
  seasonalReminderCustomText: z.string().max(2000).nullable().optional(),
});

export type PatchCommunicationHubSettings = z.infer<
  typeof PatchCommunicationHubSettingsSchema
>;
