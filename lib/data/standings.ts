/**
 * Standings Data Utilities
 *
 * Functions for loading and processing standings data
 */

import standingsData from "../../data/standings/standings.json";
import type { Division } from "../../types";

// Type for the standings JSON structure
interface StandingsJSON {
  season: number;
  divisions: Division[];
}

/**
 * Get all available standings years
 */
export async function getStandingsYears(): Promise<string[]> {
  // If you have multiple files like standings-2024.json, standings-2025.json
  // you would dynamically import them. For now, return available years.

  // Extract unique years from the data
  const years = new Set<number>();

  if (Array.isArray(standingsData)) {
    // If it's an array of season data
    standingsData.forEach((item: any) => {
      if (item.season) {
        years.add(item.season);
      }
    });
  } else if ((standingsData as any).season) {
    // If it's a single season object
    years.add((standingsData as any).season);
  }

  // If no years found, return current and previous year
  if (years.size === 0) {
    const currentYear = new Date().getFullYear();
    return [currentYear.toString(), (currentYear - 1).toString()];
  }

  return Array.from(years)
    .sort((a, b) => b - a) // Sort descending (newest first)
    .map((year) => year.toString());
}

/**
 * Get all divisions for a specific year
 */
export async function getDivisionsByYear(year: string): Promise<Division[]> {
  const yearNum = parseInt(year);

  if (Array.isArray(standingsData)) {
    const seasonData = standingsData.find(
      (item: any) => item.season === yearNum
    );
    return seasonData?.divisions || [];
  } else if ((standingsData as any).season === yearNum) {
    return (standingsData as any).divisions || [];
  }

  // If data structure is just divisions array
  if ((standingsData as any).divisions) {
    return (standingsData as any).divisions;
  }

  return [];
}

/**
 * Get standings for a specific division and year
 */
export async function getDivisionStandings(
  divisionName: string,
  year?: string
): Promise<Division | null> {
  const divisions = year
    ? await getDivisionsByYear(year)
    : (standingsData as any).divisions || [];

  return (
    divisions.find((d: Division) => d.divisionName === divisionName) || null
  );
}

/**
 * Get all divisions (for current season)
 */
export async function getAllDivisions(): Promise<Division[]> {
  if ((standingsData as any).divisions) {
    return (standingsData as any).divisions;
  }

  if (Array.isArray(standingsData) && standingsData.length > 0) {
    return standingsData[0].divisions || [];
  }

  return [];
}

/**
 * Get division names
 */
export async function getDivisionNames(year?: string): Promise<string[]> {
  const divisions = year
    ? await getDivisionsByYear(year)
    : await getAllDivisions();

  return divisions.map((d: Division) => d.divisionName);
}

/**
 * Get current season year
 */
export async function getCurrentSeasonYear(): Promise<string> {
  const years = await getStandingsYears();
  return years[0] || new Date().getFullYear().toString();
}

/**
 * Check if a division exists in a specific year
 */
export async function divisionExistsInYear(
  divisionName: string,
  year: string
): Promise<boolean> {
  const divisions = await getDivisionsByYear(year);
  return divisions.some((d: Division) => d.divisionName === divisionName);
}
