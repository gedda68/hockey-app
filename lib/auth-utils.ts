// lib/auth-utils.ts
// Authorization utilities for member access control

import { User, AccessControlContext } from "@/types/member";
// Role helper: check if a user has elevated admin access
function isSuperAdmin(user: User): boolean {
  return user.role === "super-admin";
}
function isClubAdmin(user: User, clubId: string): boolean {
  return user.role === "club-admin" && user.clubId === clubId;
}
function isAssociationAdmin(user: User): boolean {
  return user.role === "association-admin";
}

/**
 * Check if user can view a member list for a club
 */
export function canViewMemberList(user: User, clubId: string): boolean {
  if (isSuperAdmin(user) || isAssociationAdmin(user)) return true;
  if (isClubAdmin(user, clubId)) return true;
  if (
    (user.role === "coach" || user.role === "manager") &&
    user.clubId === clubId
  )
    return true;
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
  if (isSuperAdmin(user) || isAssociationAdmin(user)) return true;
  if (isClubAdmin(user, clubId)) return true;
  if (
    (user.role === "coach" || user.role === "manager") &&
    user.clubId === clubId
  )
    return true;
  if (
    (user.role === "member" || user.role === "parent") &&
    user.memberId === memberId
  )
    return true;
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
  if (isSuperAdmin(user) || isAssociationAdmin(user))
    return { canEdit: true, isLimitedEdit: false };
  if (isClubAdmin(user, clubId)) return { canEdit: true, isLimitedEdit: false };
  if (
    (user.role === "member" || user.role === "parent") &&
    user.memberId === memberId
  )
    return { canEdit: true, isLimitedEdit: true };
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
  if (isSuperAdmin(user) || isAssociationAdmin(user)) return true;
  if (isClubAdmin(user, clubId)) return true;
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
  if (isSuperAdmin(user) || isAssociationAdmin(user)) return true;
  if (isClubAdmin(user, clubId)) return true;
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

  // Super admins, association admins, and club admins get full data
  if (
    isSuperAdmin(user) ||
    isAssociationAdmin(user) ||
    isClubAdmin(user, clubId)
  ) {
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
