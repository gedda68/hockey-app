import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  formatDistanceToNow,
} from "date-fns";
import { APP_CONFIG } from "../constants/config";

/**
 * Date Utilities
 *
 * Centralized date formatting and manipulation functions.
 * Uses date-fns for consistency.
 */

/**
 * Format a date string or Date object
 */
export function formatDate(
  date: string | Date,
  formatStr: string = APP_CONFIG.DATE_FORMATS.SHORT
): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, APP_CONFIG.DATE_FORMATS.DATETIME);
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  return formatDate(date, APP_CONFIG.DATE_FORMATS.TIME);
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error("Error getting relative time:", error);
    return "";
  }
}

/**
 * Get friendly date (Today, Tomorrow, or formatted date)
 */
export function getFriendlyDate(date: string | Date): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    if (isToday(dateObj)) {
      return "Today";
    }
    if (isTomorrow(dateObj)) {
      return "Tomorrow";
    }
    if (isYesterday(dateObj)) {
      return "Yesterday";
    }

    return formatDate(dateObj, "EEEE, MMMM d");
  } catch (error) {
    console.error("Error getting friendly date:", error);
    return formatDate(date);
  }
}

/**
 * Get match date display (friendly date + time)
 */
export function getMatchDateDisplay(date: string | Date): {
  date: string;
  time: string;
  friendly: string;
} {
  return {
    date: formatDate(date, APP_CONFIG.DATE_FORMATS.LONG),
    time: formatTime(date),
    friendly: getFriendlyDate(date),
  };
}

/**
 * Check if date is in the past
 */
export function isPast(date: string | Date): boolean {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return dateObj < new Date();
  } catch (error) {
    return false;
  }
}

/**
 * Check if date is in the future
 */
export function isFuture(date: string | Date): boolean {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return dateObj > new Date();
  } catch (error) {
    return false;
  }
}

/**
 * Sort dates ascending
 */
export function sortDatesAsc(dates: (string | Date)[]): (string | Date)[] {
  return [...dates].sort((a, b) => {
    const dateA = typeof a === "string" ? parseISO(a) : a;
    const dateB = typeof b === "string" ? parseISO(b) : b;
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Sort dates descending
 */
export function sortDatesDesc(dates: (string | Date)[]): (string | Date)[] {
  return [...dates].sort((a, b) => {
    const dateA = typeof a === "string" ? parseISO(a) : a;
    const dateB = typeof b === "string" ? parseISO(b) : b;
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Get season year from date
 */
export function getSeasonFromDate(date: string | Date): number {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return dateObj.getFullYear();
  } catch (error) {
    return new Date().getFullYear();
  }
}

/**
 * Get current season
 */
export function getCurrentSeason(): number {
  return new Date().getFullYear();
}

/**
 * Check if date is in current season
 */
export function isCurrentSeason(date: string | Date): boolean {
  return getSeasonFromDate(date) === getCurrentSeason();
}
