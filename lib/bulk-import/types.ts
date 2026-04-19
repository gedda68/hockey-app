// Shared types for CSV / JSON row bulk import (API + CLI).

export type ImportRow = Record<string, string>;

export type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export type BulkImportEntity =
  | "associations"
  | "clubs"
  | "members"
  | "players"
  | "users"
  | "teams"
  | "rep-teams"
  | "association-registrations"
  | "club-registrations"
  | "league-venues"
  | "tournaments"
  | "tournament-fixtures"
  | "tournament-results"
  | "league-fixture-results"
  | "competition-awards"
  | "nominations"
  | "fees"
  | "tournament-fees"
  | "news";
