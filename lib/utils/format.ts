/**
 * Formatting Utilities
 *
 * Functions for formatting numbers, strings, and other data.
 */

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-AU").format(num);
}

/**
 * Format currency (AUD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format goal difference with + or -
 */
export function formatGoalDifference(diff: number): string {
  if (diff === 0) return "0";
  return diff > 0 ? `+${diff}` : diff.toString();
}

/**
 * Format score (e.g., "3-2")
 */
export function formatScore(home: number, away: number): string {
  return `${home}-${away}`;
}

/**
 * Format player name (First Last)
 */
export function formatPlayerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Format player name with initial (F. Last)
 */
export function formatPlayerNameInitial(
  firstName: string,
  lastName: string
): string {
  return `${firstName.charAt(0)}. ${lastName}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Convert to kebab-case
 */
export function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

/**
 * Convert to slug (URL-friendly)
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format phone number (Australian)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");

  // Format as (0X) XXXX XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)} ${cleaned.slice(
      6
    )}`;
  }

  return phone;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;

  return `${num}th`;
}

/**
 * Format statistics value (goals/match, etc.)
 */
export function formatStatValue(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format compact number (1K, 1M, etc.)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-AU", {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}

/**
 * Parse CSV to array
 */
export function parseCSV(csv: string): string[][] {
  return csv
    .split("\n")
    .map((row) => row.split(",").map((cell) => cell.trim()));
}

/**
 * Array to CSV
 */
export function arrayToCSV(data: any[][]): string {
  return data.map((row) => row.join(",")).join("\n");
}

/**
 * Pluralize word
 */
export function pluralize(word: string, count: number): string {
  if (count === 1) return word;

  // Simple pluralization rules
  if (word.endsWith("y")) {
    return word.slice(0, -1) + "ies";
  }
  if (word.endsWith("s") || word.endsWith("sh") || word.endsWith("ch")) {
    return word + "es";
  }

  return word + "s";
}

/**
 * Format list with commas and "and"
 */
export function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Extract initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Mask email for privacy
 */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  const maskedName = name.charAt(0) + "***" + name.slice(-1);
  return `${maskedName}@${domain}`;
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = ""): string {
  const random = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}-${random}` : random;
}
