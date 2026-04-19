import type { Db } from "mongodb";
import type { BulkImportEntity, ImportResult, ImportRow } from "@/lib/bulk-import/types";
import type { ImportRuntimeContext } from "@/lib/bulk-import/helpers";
import { importAssociations, importClubs } from "@/lib/bulk-import/importers/orgs";
import { importMembers, importPlayers, importUsers } from "@/lib/bulk-import/importers/people";
import { importTeams } from "@/lib/bulk-import/importers/teams";
import {
  importAssociationRegistrations,
  importClubRegistrations,
  importLeagueVenues,
  importTournaments,
  importTournamentFixtures,
  importTournamentResults,
  importLeagueFixtureResults,
  importCompetitionAwardsBulk,
  importNominations,
  importFees,
  importTournamentFees,
  importNews,
} from "@/lib/bulk-import/importers/extended";

const ENTITY_KEYS = new Set<string>([
  "associations",
  "clubs",
  "members",
  "players",
  "users",
  "teams",
  "rep-teams",
  "association-registrations",
  "club-registrations",
  "league-venues",
  "tournaments",
  "tournament-fixtures",
  "tournament-results",
  "league-fixture-results",
  "competition-awards",
  "nominations",
  "fees",
  "tournament-fees",
  "news",
]);

export function isBulkImportEntity(entity: string): entity is BulkImportEntity {
  return ENTITY_KEYS.has(entity);
}

export async function runBulkImport(
  db: Db,
  entity: string,
  rows: ImportRow[],
  ctx: ImportRuntimeContext,
): Promise<ImportResult> {
  if (!ENTITY_KEYS.has(entity)) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: `Unknown entity type: ${entity}` }],
    };
  }

  switch (entity as BulkImportEntity) {
    case "associations":
      return importAssociations(db, rows);
    case "clubs":
      return importClubs(db, rows);
    case "members":
      return importMembers(db, rows);
    case "players":
      return importPlayers(db, rows);
    case "users":
      return importUsers(db, rows, ctx);
    case "teams":
      return importTeams(db, rows, false);
    case "rep-teams":
      return importTeams(db, rows, true);
    case "association-registrations":
      return importAssociationRegistrations(db, rows);
    case "club-registrations":
      return importClubRegistrations(db, rows);
    case "league-venues":
      return importLeagueVenues(db, rows);
    case "tournaments":
      return importTournaments(db, rows);
    case "tournament-fixtures":
      return importTournamentFixtures(db, rows);
    case "tournament-results":
      return importTournamentResults(db, rows);
    case "league-fixture-results":
      return importLeagueFixtureResults(db, rows);
    case "competition-awards":
      return importCompetitionAwardsBulk(db, rows);
    case "nominations":
      return importNominations(db, rows);
    case "fees":
      return importFees(db, rows);
    case "tournament-fees":
      return importTournamentFees(db, rows);
    case "news":
      return importNews(db, rows);
    default:
      return {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: `Unhandled entity: ${entity}` }],
      };
  }
}
