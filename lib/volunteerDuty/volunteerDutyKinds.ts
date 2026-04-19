/** Game-day and club volunteer duties — separate from association umpire / official register (F1). */

export const VOLUNTEER_DUTY_KIND_IDS = [
  "canteen",
  "goal_judge",
  "scoring_table",
  "timekeeper",
  "first_aid",
  "setup_packup",
  "other",
] as const;

export type VolunteerDutyKindId = (typeof VOLUNTEER_DUTY_KIND_IDS)[number];

export const VOLUNTEER_DUTY_KIND_LABELS: Record<VolunteerDutyKindId, string> = {
  canteen: "Canteen / BBQ",
  goal_judge: "Goal judge",
  scoring_table: "Scoring table",
  timekeeper: "Timekeeper",
  first_aid: "First aid",
  setup_packup: "Setup / pack-up",
  other: "Other",
};
