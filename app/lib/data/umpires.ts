import { promises as fs } from "fs";
import path from "path";
import type { UmpireDetails, UmpireAllocation } from "../../types";

interface UmpireListData {
  umpires: UmpireDetails[];
}

interface UmpireAllocationsData {
  umpireAllocations: UmpireAllocation[];
}

/**
 * Get all umpires from JSON file
 */
export async function getUmpireList(): Promise<UmpireDetails[]> {
  const umpireListPath = path.join(process.cwd(), "data/umpireList.json");
  const data = await fs.readFile(umpireListPath, "utf8");
  const parsed: UmpireListData = JSON.parse(data);
  return parsed.umpires || [];
}

/**
 * Get all umpire allocations from JSON file
 */
export async function getUmpireAllocations(): Promise<UmpireAllocation[]> {
  const allocationsPath = path.join(
    process.cwd(),
    "data/umpireAllocations.json"
  );
  const data = await fs.readFile(allocationsPath, "utf8");
  const parsed: UmpireAllocationsData = JSON.parse(data);
  return parsed.umpireAllocations || [];
}

/**
 * Get umpire allocations as a keyed object (by matchId)
 */
export async function getUmpireAllocationsMap(): Promise<
  Record<string, UmpireAllocation>
> {
  const allocations = await getUmpireAllocations();
  return allocations.reduce((acc, allocation) => {
    acc[allocation.matchId] = allocation;
    return acc;
  }, {} as Record<string, UmpireAllocation>);
}

/**
 * Get umpire details by ID
 */
export async function getUmpireById(
  umpireId: string
): Promise<UmpireDetails | null> {
  const umpires = await getUmpireList();
  return umpires.find((u) => u.umpireNumber === umpireId) || null;
}

/**
 * Get umpires allocated to a specific match
 */
export async function getUmpiresForMatch(
  matchId: string
): Promise<UmpireDetails[]> {
  const allocations = await getUmpireAllocations();
  const umpireList = await getUmpireList();

  const matchAllocation = allocations.find((a) => a.matchId === matchId);
  if (!matchAllocation) return [];

  return matchAllocation.umpires
    .map((u) => umpireList.find((ump) => ump.umpireNumber === u.umpireId))
    .filter((u): u is UmpireDetails => u !== undefined);
}

/**
 * Get primary umpires for a match
 */
export async function getPrimaryUmpiresForMatch(
  matchId: string
): Promise<UmpireDetails[]> {
  const allocations = await getUmpireAllocations();
  const umpireList = await getUmpireList();

  const matchAllocation = allocations.find((a) => a.matchId === matchId);
  if (!matchAllocation) return [];

  const primaryUmpireIds = matchAllocation.umpires
    .filter((u) => u.umpireType === "primary")
    .map((u) => u.umpireId);

  return umpireList.filter((u) => primaryUmpireIds.includes(u.umpireNumber));
}

/**
 * Get backup umpires for a match
 */
export async function getBackupUmpiresForMatch(
  matchId: string
): Promise<UmpireDetails[]> {
  const allocations = await getUmpireAllocations();
  const umpireList = await getUmpireList();

  const matchAllocation = allocations.find((a) => a.matchId === matchId);
  if (!matchAllocation) return [];

  const backupUmpireIds = matchAllocation.umpires
    .filter((u) => u.umpireType === "backup")
    .map((u) => u.umpireId);

  return umpireList.filter((u) => backupUmpireIds.includes(u.umpireNumber));
}

/**
 * Get umpires by club
 */
export async function getUmpiresByClub(club: string): Promise<UmpireDetails[]> {
  const umpires = await getUmpireList();
  return umpires.filter((u) => u.club === club);
}

/**
 * Get active umpires
 */
export async function getActiveUmpires(): Promise<UmpireDetails[]> {
  const umpires = await getUmpireList();
  return umpires.filter((u) => u.isActive);
}

/**
 * Get umpires by level
 */
export async function getUmpiresByLevel(
  level: string
): Promise<UmpireDetails[]> {
  const umpires = await getUmpireList();
  return umpires.filter((u) => u.umpireLevel === level);
}

/**
 * Get matches assigned to an umpire
 */
export async function getMatchesForUmpire(umpireId: string): Promise<string[]> {
  const allocations = await getUmpireAllocations();

  return allocations
    .filter((allocation) =>
      allocation.umpires.some((u) => u.umpireId === umpireId)
    )
    .map((allocation) => allocation.matchId);
}

/**
 * Check if umpire has accepted allocation for a match
 */
export async function hasUmpireAccepted(
  matchId: string,
  umpireId: string
): Promise<boolean> {
  const allocations = await getUmpireAllocations();

  const matchAllocation = allocations.find((a) => a.matchId === matchId);
  if (!matchAllocation) return false;

  const umpire = matchAllocation.umpires.find((u) => u.umpireId === umpireId);
  return umpire?.dateAccepted !== null;
}

/**
 * Get umpire statistics
 */
export async function getUmpireStats(umpireId: string) {
  const matches = await getMatchesForUmpire(umpireId);
  const umpire = await getUmpireById(umpireId);

  if (!umpire) return null;

  return {
    umpire,
    totalMatches: matches.length,
    matchIds: matches,
  };
}
