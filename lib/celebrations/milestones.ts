export type CelebrationKind =
  | "birthday"
  | "games_played"
  | "wins"
  | "games_coached"
  | "wins_coached";

export type CelebrationScope = "club" | "association" | "total";

export type CelebrationAlert = {
  id: string;
  kind: CelebrationKind;
  scope?: CelebrationScope;
  title: string;
  message: string;
  /** ISO date when it was achieved (best-effort). */
  achievedAt?: string;
};

export const GAMES_PLAYED_MILESTONES = [
  1,
  10,
  25,
  50,
  75,
  100,
  150,
  200,
  250,
  300,
  400,
  500,
  750,
  1000,
] as const;

export const WINS_MILESTONES = [1, 10, 25, 50, 75, 100, 150, 200, 250, 300] as const;

export function isWithinDays(iso: string | null | undefined, days: number): boolean {
  const raw = String(iso ?? "").trim();
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const diff = Date.now() - d.getTime();
  return diff >= 0 && diff <= days * 86400000;
}

export function pickMilestoneJustHit(
  value: number,
  milestones: readonly number[],
): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  for (const m of milestones) {
    if (value === m) return m;
  }
  return null;
}

