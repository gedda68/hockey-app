// lib/auth-utils.ts
// Authorization utilities for member access control

import { User, AccessControlContext } from "@/types/member";

/**
 * Check if user can view a member list for a club
 */
export function canViewMemberList(user: User, clubId: string): boolean {
  // Super admins can view all clubs
  if (user.role === "superadmin") {
    return true;
  }

  // Club admins can view their own club
  if (user.role === "clubadmin" && user.clubId === clubId) {
    return true;
  }

  // Regular members cannot view member lists
  return false;
}

/**
 * Check if user can view a specific member
 */
export function canViewMember(
  user: User,
  clubId: string,
  memberId: string,
): boolean {
  // Super admins can view all members
  if (user.role === "superadmin") {
    return true;
  }

  // Club admins can view members in their club
  if (user.role === "clubadmin" && user.clubId === clubId) {
    return true;
  }

  // Members can view their own record
  if (user.role === "member" && user.memberId === memberId) {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a member
 * Returns object with full/limited edit permissions
 */
export function canEditMember(
  user: User,
  clubId: string,
  memberId: string,
): {
  canEdit: boolean;
  isLimitedEdit: boolean; // If true, can only edit certain fields
} {
  // Super admins can fully edit all members
  if (user.role === "superadmin") {
    return { canEdit: true, isLimitedEdit: false };
  }

  // Club admins can fully edit members in their club
  if (user.role === "clubadmin" && user.clubId === clubId) {
    return { canEdit: true, isLimitedEdit: false };
  }

  // Members can edit limited fields in their own record
  if (user.role === "member" && user.memberId === memberId) {
    return { canEdit: true, isLimitedEdit: true };
  }

  return { canEdit: false, isLimitedEdit: false };
}

/**
 * Check if user can delete a member
 */
export function canDeleteMember(
  user: User,
  clubId: string,
  memberId: string,
): boolean {
  // Super admins can delete all members
  if (user.role === "superadmin") {
    return true;
  }

  // Club admins can delete members in their club
  if (user.role === "clubadmin" && user.clubId === clubId) {
    return true;
  }

  // Members cannot delete themselves or others
  return false;
}

/**
 * Check if user can renew a membership
 */
export function canRenewMembership(
  user: User,
  clubId: string,
  memberId: string,
): boolean {
  // Super admins can renew all memberships
  if (user.role === "superadmin") {
    return true;
  }

  // Club admins can renew memberships in their club
  if (user.role === "clubadmin" && user.clubId === clubId) {
    return true;
  }

  // Members cannot renew (must go through admin)
  // Change this to true if you want members to self-renew
  return false;
}

/**
 * Get editable fields for limited edit access
 * Used when members edit their own profile
 */
export function getEditableFields(
  user: User,
  isLimitedEdit: boolean,
): string[] {
  if (!isLimitedEdit) {
    return ["all"]; // Full access
  }

  // Limited edit: members can only edit these fields
  return [
    "personalInfo.displayName",
    "personalInfo.photoUrl",
    "contact.phone",
    "contact.mobile",
    "contact.primaryEmail", // May want to require verification
    "address.street",
    "address.suburb",
    "address.state",
    "address.postcode",
    "address.country",
    "emergencyContacts",
    "healthcare.medicare",
    "healthcare.privateHealth",
    "medical.conditions",
    "medical.medications",
    "medical.allergies",
  ];
}

/**
 * Filter member data based on user permissions
 * Removes sensitive fields if user shouldn't see them
 */
export function filterMemberData(member: any, user: User, clubId: string): any {
  const { canEdit, isLimitedEdit } = canEditMember(
    user,
    clubId,
    member.memberId,
  );

  // If user can't view, return null
  if (!canViewMember(user, clubId, member.memberId)) {
    return null;
  }

  // Super admins and club admins get full data
  if (user.role === "superadmin" || user.role === "clubadmin") {
    return member;
  }

  // Members viewing their own data get full data
  if (user.role === "member" && user.memberId === member.memberId) {
    return member;
  }

  // Default: return null (shouldn't happen if canViewMember is correct)
  return null;
}

/**
 * Validate that updates only include allowed fields for limited edit
 */
export function validateLimitedEdit(
  updates: any,
  allowedFields: string[],
): {
  isValid: boolean;
  invalidFields: string[];
} {
  if (allowedFields.includes("all")) {
    return { isValid: true, invalidFields: [] };
  }

  const invalidFields: string[] = [];

  function checkObject(obj: any, prefix = ""): void {
    for (const key in obj) {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        checkObject(obj[key], fullPath);
      } else {
        if (!allowedFields.includes(fullPath)) {
          invalidFields.push(fullPath);
        }
      }
    }
  }

  checkObject(updates);

  return {
    isValid: invalidFields.length === 0,
    invalidFields,
  };
}

/**
 * Create authorization error response
 */
export function unauthorizedResponse(message?: string) {
  return {
    error: "Unauthorized",
    message: message || "You do not have permission to access this resource",
  };
}

/**
 * Create forbidden error response
 */
export function forbiddenResponse(message?: string) {
  return {
    error: "Forbidden",
    message: message || "You do not have permission to perform this action",
  };
}
