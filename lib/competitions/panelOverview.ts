// Per-competition health summary for the association competition panel.

export interface PanelFixture {
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  status?: string | null;
  scheduledStart?: string | null;
  resultStatus?: string | null;
}

export interface CompetitionSummary {
  teams: number;
  fixtures: number;
  completed: number;
  inProgress: number;
  remaining: number;
  postponed: number;
  cancelled: number;
  /** Results submitted and waiting for an approver. */
  awaitingApproval: number;
  /** Scheduled with no date/time yet. */
  unscheduled: number;
  /** Scheduled start has passed but no result is recorded. */
  overdue: number;
  nextStart: string | null;
}

export function summariseFixtures(
  fixtures: PanelFixture[],
  now: Date = new Date(),
): CompetitionSummary {
  const teams = new Set<string>();
  const s: CompetitionSummary = {
    teams: 0, fixtures: fixtures.length, completed: 0, inProgress: 0,
    remaining: 0, postponed: 0, cancelled: 0, awaitingApproval: 0,
    unscheduled: 0, overdue: 0, nextStart: null,
  };
  let next: number | null = null;
  for (const f of fixtures) {
    if (f.homeTeamId) teams.add(f.homeTeamId);
    if (f.awayTeamId) teams.add(f.awayTeamId);
    if (f.resultStatus === "submitted") s.awaitingApproval++;
    const status = f.status ?? "scheduled";
    if (status === "completed") s.completed++;
    else if (status === "in_progress") s.inProgress++;
    else if (status === "cancelled") s.cancelled++;
    else if (status === "postponed") { s.postponed++; s.remaining++; }
    else {
      s.remaining++;
      const t = f.scheduledStart ? Date.parse(f.scheduledStart) : NaN;
      if (Number.isNaN(t)) s.unscheduled++;
      else if (t < now.getTime()) s.overdue++;
      else if (next === null || t < next) next = t;
    }
  }
  s.teams = teams.size;
  s.nextStart = next === null ? null : new Date(next).toISOString();
  return s;
}
