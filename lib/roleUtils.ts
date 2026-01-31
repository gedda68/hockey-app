// lib/roleUtils.ts
// Utility functions for role display and categorization

export interface Role {
  id: string;
  name: string;
  category: string;
  description?: string;
}

// Role categories with colors
export const ROLE_CATEGORIES = {
  Playing: {
    color: "bg-blue-100 text-blue-700",
    label: "Playing",
  },
  Coaching: {
    color: "bg-purple-100 text-purple-700",
    label: "Coaching",
  },
  Administration: {
    color: "bg-green-100 text-green-700",
    label: "Administration",
  },
  Official: {
    color: "bg-orange-100 text-orange-700",
    label: "Official",
  },
  Volunteer: {
    color: "bg-pink-100 text-pink-700",
    label: "Volunteer",
  },
  Other: {
    color: "bg-slate-100 text-slate-700",
    label: "Other",
  },
} as const;

// Get role display name from ID
export function getRoleDisplayName(roleId: string, roles: Role[]): string {
  const role = roles.find((r) => r.id === roleId);
  return role?.name || roleId;
}

// Get role category from ID
export function getRoleCategory(roleId: string, roles: Role[]): string {
  const role = roles.find((r) => r.id === roleId);
  return role?.category || "Other";
}

// Get role color class from category
export function getRoleColor(category: string): string {
  return (
    ROLE_CATEGORIES[category as keyof typeof ROLE_CATEGORIES]?.color ||
    ROLE_CATEGORIES.Other.color
  );
}

// Get role color from role ID
export function getRoleColorById(roleId: string, roles: Role[]): string {
  const category = getRoleCategory(roleId, roles);
  return getRoleColor(category);
}

// Group roles by category
export function groupRolesByCategory(roles: Role[]) {
  return roles.reduce((acc, role) => {
    const category = role.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(role);
    return acc;
  }, {} as Record<string, Role[]>);
}

// Search roles by name or category
export function searchRoles(roles: Role[], query: string): Role[] {
  const lowerQuery = query.toLowerCase();
  return roles.filter(
    (role) =>
      role.name.toLowerCase().includes(lowerQuery) ||
      role.category.toLowerCase().includes(lowerQuery)
  );
}
