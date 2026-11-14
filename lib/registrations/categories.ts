// Registration categories and the interim per-level fee (AUD). Edit the numbers here.

export const CURRENCY = "AUD";
export const JUNIOR_MAX_AGE = 17; // under 18 in the season year

export type RegistrationCategory = "junior" | "senior" | "other" | "volunteer";

export const CATEGORY_FEE: Record<RegistrationCategory, number> = {
  junior: 20,
  senior: 100,
  other: 20,
  volunteer: 0,
};

export const CATEGORY_LABEL: Record<RegistrationCategory, string> = {
  junior: "Junior",
  senior: "Senior",
  other: "Other",
  volunteer: "Volunteer",
};

