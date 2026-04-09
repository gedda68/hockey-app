/**
 * Umpires Data Functions
 *
 * Load umpire and allocation data from /data folder
 */

// Direct imports from /data folder
import umpireListData from "../../data/umpires/umpire-list.json";
import umpireAllocationsData from "../../data/umpires/umpire-allocations.json";
import type { Match, UmpireDetails } from "@/types";

// Types
interface UmpireRaw {
  umpireName: string;
  umpireNumber: string;
  club: string;
  gender: string;
  dateOfBirth: string;
  umpireLevel: string;
  isActive: boolean;
}

interface Umpire {
  umpireNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  club: string;
  gender: string;
  dateOfBirth: string;
  umpireLevel: string;
  isActive: boolean;
  email?: string;
  phone?: string;
}

interface UmpireAllocationRaw {
  matchId: string;
  umpires: Array<{
    umpireType: string;
    umpireId: string;
    dateAllocated: string;
    dateAccepted: string | null;
    dateUpdated: string;
  }>;
}

interface UmpireAllocation {
  matchId: string;
  umpires: Array<{
    umpireId: string;
    role: string;
    dateAllocated: string;
    dateAccepted: string | null;
  }>;
}

/**
 * Parse umpire name into first and last name
 */
function parseUmpireName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    // Assume format is "FirstInitial. LastName" or "FirstName LastName"
    const firstName = parts[0].replace(".", "");
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
  }
  return { firstName: name, lastName: "" };
}

/**
 * Transform raw umpire data to app format
 */
function transformUmpire(raw: UmpireRaw): Umpire {
  const { firstName, lastName } = parseUmpireName(raw.umpireName);

  return {
    umpireNumber: raw.umpireNumber,
    firstName,
    lastName,
    fullName: raw.umpireName,
    club: raw.club,
    gender: raw.gender,
    dateOfBirth: raw.dateOfBirth,
    umpireLevel: raw.umpireLevel,
    isActive: raw.isActive ?? true,
  };
}

/**
 * Get all umpires
 */
export async function getUmpireList(): Promise<Umpire[]> {
  try {
    const data = umpireListData as any;
    const umpires = data.umpires || [];
    return umpires.map((u: UmpireRaw) => transformUmpire(u));
  } catch (error) {
    console.error("Failed to load umpire list:", error);
    return [];
  }
}

/** Public shape for MatchList / UI (uses display name field). */
export async function getUmpireDetailsList(): Promise<UmpireDetails[]> {
  const umpires = await getUmpireList();
  return umpires.map((u) => ({
    umpireName: u.fullName,
    umpireNumber: u.umpireNumber,
    club: u.club,
    gender: u.gender as UmpireDetails["gender"],
    dateOfBirth: u.dateOfBirth,
    umpireLevel: u.umpireLevel,
    isActive: u.isActive,
  }));
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
  try {
    const data = umpireAllocationsData as any;
    const allocations = data.umpireAllocations || [];

    return allocations.map((alloc: UmpireAllocationRaw) => {
      // Assign roles based on order and type
      const umpires = alloc.umpires.map((u, i) => ({
        umpireId: u.umpireId,
        role:
          u.umpireType === "backup"
            ? "reserve"
            : i === 0
            ? "umpire1"
            : "umpire2",
        dateAllocated: u.dateAllocated,
        dateAccepted: u.dateAccepted,
      }));

      return {
        matchId: alloc.matchId,
        umpires,
      };
    });
  } catch (error) {
    console.error("Failed to load umpire allocations:", error);
    return [];
  }
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
 * Build a map keyed by **fixtureId** (`Match.matchId`) for live fixtures.
 * Priority: DB `league_fixtures.umpires` → legacy JSON by `legacyMatchId` → JSON by `fixtureId`.
 */
export async function resolveUmpireAllocationsForMatches(
  matches: Match[],
): Promise<Record<string, unknown>> {
  const legacyMap = await getUmpireAllocationsMap();
  const out: Record<string, unknown> = {};

  for (const m of matches) {
    const id = m.matchId;

    if (m.fixtureUmpires && m.fixtureUmpires.length > 0) {
      out[id] = {
        matchId: id,
        umpires: m.fixtureUmpires.map((u) => ({
          umpireId: u.umpireId,
          umpireType: u.umpireType,
          qualificationTier: u.qualificationTier ?? null,
          dateAllocated: u.dateAllocated ?? "",
          dateAccepted: u.dateAccepted ?? null,
          dateUpdated: u.dateUpdated,
        })),
      };
      continue;
    }

    const legacyKey = m.legacyMatchId?.trim();
    if (legacyKey && legacyMap[legacyKey]) {
      out[id] = legacyMap[legacyKey];
      continue;
    }

    if (legacyMap[id]) {
      out[id] = legacyMap[id];
    }
  }

  return out;
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
