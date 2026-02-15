// types/config.ts
// Type definitions for configuration items

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
  // Flexible attributes - different config types can have different fields
  icon?: string;
  color?: string;
  abbreviation?: string;
  category?: string;
}

export type ConfigType =
  | "salutation"
  | "gender"
  | "membershipType"
  | "role"
  | "relationshipType"
  | "healthProvider"
  | "position"
  | "emailOwnership";

export interface ConfigItemsByType {
  [key: string]: ConfigItem[];
}
