// lib/altius/harvestTypes.ts
// Shape of the JSON produced by scripts/altius-2026/harvest-in-browser.js
// (scraped from https://hockeybrisbane.altius.live).

export type AltiusLeague = "BHL" | "JHL" | "MHL";

export interface AltiusScore {
  h: number;
  a: number;
  soH: number | null;
  soA: number | null;
}

export interface AltiusTeam {
  altiusTeamId: string | null;
  name: string;
  code: string;
  finalStanding: string | null;
  logoUrl: string | null;
  altiusOrgId: string | null;
}

export interface AltiusMatchRow {
  altiusMatchId: string | null;
  matchNo: string;
  round: number | string | null;
  localDateTime: string | null; // "2026-03-14 11:00:00" in `timezone`
  timezone: string;
  homeCode: string | null;
  awayCode: string | null;
  phaseLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  score: AltiusScore | null;
  scoreText: string | null;
  status: string | null;
  pitch: string | null;
}

export interface AltiusPoolRow {
  rank: number;
  altiusTeamId: string | null;
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface AltiusPlayerStatRow {
  altiusTeamId: string | null;
  shirt: string;
  altiusPlayerId: string | null;
  name: string;
}

export interface AltiusCompetition {
  league: AltiusLeague;
  altiusCompetitionId: string;
  sourceUrl: string;
  title: string; // "BHA 2026 BHL 1"
  location: string;
  dateRange: string; // "14 Mar - 19 Sep 2026"
  category: string; // "Senior Coed Outdoor"
  teams: AltiusTeam[];
  pools: { pool: string | null; rows: AltiusPoolRow[] }[];
  matches: AltiusMatchRow[];
  scorers: (AltiusPlayerStatRow & { fg: number; pc: number; ps: number; goals: number })[];
  cards: (AltiusPlayerStatRow & { red: number; yellow: number; green: number })[];
  awards: string[][]; // [award, player, team]
}

export interface AltiusLineupPlayer {
  shirt: string;
  altiusPlayerId: string | null;
  name: string;
  gk: boolean;
  captain: boolean;
  played: string | null;
}

export interface AltiusMatchDetail {
  lineups: {
    team: string;
    players: AltiusLineupPlayer[];
    staff: { role: string; name: string | null }[];
  }[];
  staffText?: [string, string][];
  goals: {
    team: string;
    minute: number | null;
    shirt: string;
    altiusPlayerId: string | null;
    name: string;
    action: string; // "Field Goal" | "Penalty Corner" | "Penalty Stroke" ...
    scoreAfter: string;
  }[];
  cards: {
    team: string;
    minute: number | null;
    shirt: string;
    altiusPlayerId: string | null;
    name: string;
    type: string; // "Y (5')", "G", "R"
    umpire: string | null;
  }[];
  officials: { role: string; name: string | null; altiusOfficialId: string | null }[];
  details: Record<string, string>; // "Venue", "Weather at Pushback", ...
  awards: string[][];
}

export interface AltiusHarvest {
  status: string;
  started: string;
  finished?: string;
  comps: Record<string, AltiusCompetition>;
  matchDetails: Record<string, AltiusMatchDetail>;
  errors: unknown[];
}
