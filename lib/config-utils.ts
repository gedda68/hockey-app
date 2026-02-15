// lib/config-utils.ts
// Centralized utility functions for config item lookups

import { ConfigItem } from "@/types/config";

/**
 * Get the display name for a config item
 * @param configId - The ID of the config item
 * @param configItems - Array of all config items
 * @param configType - The type of config (e.g., 'gender', 'role')
 * @returns The name of the config item, or the configId if not found
 */
export function getConfigDisplayName(
  configId: string,
  configItems: ConfigItem[],
  configType: string,
): string {
  const config = configItems.find(
    (item) => item.id === configId && item.configType === configType,
  );
  return config?.name || configId;
}

/**
 * Get the full config item
 * @param configId - The ID of the config item
 * @param configItems - Array of all config items
 * @param configType - The type of config
 * @returns The config item or undefined if not found
 */
export function getConfigItem(
  configId: string,
  configItems: ConfigItem[],
  configType: string,
): ConfigItem | undefined {
  return configItems.find(
    (item) => item.id === configId && item.configType === configType,
  );
}

/**
 * Get the code field for salutation (e.g., "Mr", "Mrs", "Dr")
 * Salutations use the code field for display, not the name
 * @param configId - The salutation ID
 * @param configItems - Array of all config items
 * @returns The code, name, or configId as fallback
 */
export function getSalutationDisplay(
  configId: string,
  configItems: ConfigItem[],
): string {
  const config = configItems.find(
    (item) => item.id === configId && item.configType === "salutation",
  );
  // Return the code field for salutation, fallback to name, then to the ID
  return config?.code || config?.name || configId;
}

/**
 * Get multiple config items by type
 * @param configItems - Array of all config items
 * @param configType - The type to filter by
 * @returns Array of config items of that type
 */
export function getConfigItemsByType(
  configItems: ConfigItem[],
  configType: string,
): ConfigItem[] {
  return configItems.filter((item) => item.configType === configType);
}

/**
 * Get config item color (for roles, teams, etc.)
 * @param configId - The ID of the config item
 * @param configItems - Array of all config items
 * @param configType - The type of config
 * @returns The color string or undefined
 */
export function getConfigColor(
  configId: string,
  configItems: ConfigItem[],
  configType: string,
): string | undefined {
  const config = getConfigItem(configId, configItems, configType);
  return config?.color;
}

/**
 * Get config item icon
 * @param configId - The ID of the config item
 * @param configItems - Array of all config items
 * @param configType - The type of config
 * @returns The icon string or undefined
 */
export function getConfigIcon(
  configId: string,
  configItems: ConfigItem[],
  configType: string,
): string | undefined {
  const config = getConfigItem(configId, configItems, configType);
  return config?.icon;
}

/**
 * Format a date string to Australian locale
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "13/02/2026")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-AU");
}

/**
 * Format a date string to long format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "13 February 2026")
 */
export function formatDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Get member's display name
 * @param member - Member object
 * @returns Display name or full name
 */
export function getMemberDisplayName(member: {
  personalInfo: { displayName?: string; firstName: string; lastName: string };
}): string {
  return (
    member.personalInfo.displayName ||
    `${member.personalInfo.firstName} ${member.personalInfo.lastName}`
  );
}

/**
 * Check if member has an active membership
 * @param member - Member object
 * @returns True if membership is active
 */
export function isMemberActive(member: {
  membership: { status: string };
}): boolean {
  return member.membership.status === "Active";
}

/**
 * Get member's age
 * @param dateOfBirth - ISO date string
 * @returns Age in years
 */
export function getMemberAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}
