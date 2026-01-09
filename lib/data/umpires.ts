/**
 * Umpires Data Utilities
 *
 * Functions for loading and processing umpire data
 */

import umpireListData from "../../data/umpires/umpire-list.json";
import umpireAllocationsData from "../../data/umpires/umpire-allocations.json";
import type { Umpire, UmpireAllocation } from "../../types";

/**
 * Get all umpires
 */
export async function getUmpireList(): Promise<Umpire[]> {
  return (umpireListData as any).umpires || [];
}

/**
 * Get umpire by number
 */
export async function getUmpireByNumber(
  umpireNumber: string
): Promise<Umpire | undefined> {
  const umpires = await getUmpireList();
  return umpires.find((u) => u.umpireNumber === umpireNumber);
}

/**
 * Get all umpire allocations
 */
export async function getUmpireAllocations(): Promise<UmpireAllocation[]> {
  return (umpireAllocationsData as any).umpireAllocations || [];
}

/**
 * Get umpire allocations as a map (matchId -> allocation)
 */
export async function getUmpireAllocationsMap(): Promise<
  Record<string, UmpireAllocation>
> {
  const allocations = await getUmpireAllocations();

  return allocations.reduce((map, allocation) => {
    map[allocation.matchId] = allocation;
    return map;
  }, {} as Record<string, UmpireAllocation>);
}

/**
 * Get allocations for a specific match
 */
export async function getUmpireAllocationForMatch(
  matchId: string
): Promise<UmpireAllocation | undefined> {
  const allocations = await getUmpireAllocations();
  return allocations.find((a) => a.matchId === matchId);
}

/**
 * Get umpires for a specific match
 */
export async function getUmpiresForMatch(matchId: string): Promise<Umpire[]> {
  const allocation = await getUmpireAllocationForMatch(matchId);
  if (!allocation) return [];

  const allUmpires = await getUmpireList();
  const umpireIds = allocation.umpires.map((u) => u.umpireId);

  return allUmpires.filter((u) => umpireIds.includes(u.umpireNumber));
}

/**
 * Get active umpires only
 */
export async function getActiveUmpires(): Promise<Umpire[]> {
  const umpires = await getUmpireList();
  return umpires.filter((u) => u.isActive);
}

/**
 * Get umpires by level
 */
export async function getUmpiresByLevel(level: string): Promise<Umpire[]> {
  const umpires = await getUmpireList();
  return umpires.filter((u) => u.umpireLevel === level);
}

/**
 * Get umpires by club
 */
export async function getUmpiresByClub(club: string): Promise<Umpire[]> {
  const umpires = await getUmpireList();
  return umpires.filter((u) => u.club === club);
}
