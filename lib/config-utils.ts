// lib/config-utils.ts
// Utility functions for working with config items

export interface ConfigItem {
  _id?: string;
  configType: string;
  id: string; // This is the key/identifier
  name: string; // This is the display value
  code?: string;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  usageCount?: number;
  lastUsed?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string | null;
  // Type-specific flexible attributes
  icon?: string;
  color?: string;
  category?: string;
  defaultPermissions?: string[];
  clubId?: string | null;
  phone?: string;
  website?: string;
  shortName?: string;
  [key: string]: any;
}

/**
 * Get display name for a config id
 */
export function getConfigDisplayName(
  configId: string,
  configType: string,
  configItems: ConfigItem[],
): string {
  const config = configItems.find(
    (c) => c.configType === configType && c.id === configId,
  );
  return config?.name || configId;
}

/**
 * Get a specific attribute from a config item
 */
export function getConfigAttribute<T = any>(
  configId: string,
  configType: string,
  attributeName: string,
  configItems: ConfigItem[],
  defaultValue?: T,
): T | undefined {
  const config = configItems.find(
    (c) => c.configType === configType && c.id === configId,
  );
  return config?.[attributeName] ?? defaultValue;
}

/**
 * Get entire config object for an id
 */
export function getConfigItem(
  configId: string,
  configType: string,
  configItems: ConfigItem[],
): ConfigItem | undefined {
  return configItems.find(
    (c) => c.configType === configType && c.id === configId,
  );
}

/**
 * Get all config items of a specific type
 */
export function getConfigsByType(
  configType: string,
  configItems: ConfigItem[],
  activeOnly: boolean = true,
): ConfigItem[] {
  return configItems
    .filter((c) => c.configType === configType && (!activeOnly || c.isActive))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Convert config items to dropdown options
 */
export function configToOptions(
  configType: string,
  configItems: ConfigItem[],
): Array<{ value: string; label: string; [key: string]: any }> {
  return getConfigsByType(configType, configItems).map((config) => ({
    value: config.id,
    label: config.name,
    ...config, // Include all other attributes
  }));
}

/**
 * Get member role details with icon and color
 */
export function getMemberRoleDetails(
  roleId: string,
  configItems: ConfigItem[],
): {
  name: string;
  icon?: string;
  color?: string;
  category?: string;
  permissions?: string[];
} {
  const config = getConfigItem(roleId, "role", configItems);
  return {
    name: config?.name || roleId,
    icon: config?.icon,
    color: config?.color,
    category: config?.category,
    permissions: config?.defaultPermissions,
  };
}

/**
 * Get health provider contact info
 */
export function getProviderContactInfo(
  providerId: string,
  configItems: ConfigItem[],
): {
  name: string;
  phone?: string;
  website?: string;
  category?: string;
} {
  const config = getConfigItem(
    providerId,
    "privateHealthProvider",
    configItems,
  );
  return {
    name: config?.name || providerId,
    phone: config?.phone,
    website: config?.website,
    category: config?.category,
  };
}

/**
 * Get membership type details
 */
export function getMembershipTypeDetails(
  membershipId: string,
  configItems: ConfigItem[],
): {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
} {
  const config = getConfigItem(membershipId, "membershipType", configItems);
  return {
    name: config?.name || membershipId,
    description: config?.description,
    icon: config?.icon,
    color: config?.color,
  };
}

/**
 * Get salutation details
 */
export function getSalutationDetails(
  salutationId: string,
  configItems: ConfigItem[],
): {
  name: string;
  code?: string;
} {
  const config = getConfigItem(salutationId, "salutation", configItems);
  return {
    name: config?.name || salutationId,
    code: config?.code,
  };
}

/**
 * Validate if a config id exists for a type
 */
export function isValidConfigId(
  configId: string,
  configType: string,
  configItems: ConfigItem[],
): boolean {
  return configItems.some(
    (c) => c.configType === configType && c.id === configId && c.isActive,
  );
}

/**
 * Get config items grouped by type
 */
export function getConfigsGroupedByType(
  configItems: ConfigItem[],
): Record<string, ConfigItem[]> {
  return configItems.reduce(
    (acc, config) => {
      if (!acc[config.configType]) {
        acc[config.configType] = [];
      }
      acc[config.configType].push(config);
      return acc;
    },
    {} as Record<string, ConfigItem[]>,
  );
}
