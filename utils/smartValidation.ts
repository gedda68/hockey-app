// utils/smartValidation.ts
// Smart validation utilities for player forms

import { PlayerFormData } from "../types/player.types";

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning" | "info";
}

// Australian state/postcode validation
const STATE_POSTCODE_RANGES: Record<string, [number, number][]> = {
  NSW: [
    [1000, 1999],
    [2000, 2599],
    [2619, 2899],
    [2921, 2999],
  ],
  ACT: [
    [200, 299],
    [2600, 2618],
    [2900, 2920],
  ],
  VIC: [
    [3000, 3999],
    [8000, 8999],
  ],
  QLD: [
    [4000, 4999],
    [9000, 9999],
  ],
  SA: [[5000, 5999]],
  WA: [
    [6000, 6797],
    [6800, 6999],
  ],
  TAS: [[7000, 7999]],
  NT: [
    [800, 899],
    [900, 999],
  ],
};

// Check if postcode matches state
export function validateStatePostcode(
  state: string,
  postcode: string,
): boolean {
  if (!state || !postcode) return true; // Skip if empty

  const postcodeNum = parseInt(postcode, 10);
  if (isNaN(postcodeNum)) return true;

  const ranges = STATE_POSTCODE_RANGES[state.toUpperCase()];
  if (!ranges) return true;

  return ranges.some(([min, max]) => postcodeNum >= min && postcodeNum <= max);
}

// Age validation
export function validateAge(dateOfBirth: string): ValidationWarning | null {
  if (!dateOfBirth) return null;

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

  // Flag unusual ages
  if (age < 5) {
    return {
      field: "dateOfBirth",
      message: `Player age is ${age} years old. Please verify the date of birth is correct.`,
      severity: "warning",
    };
  }

  if (age > 100) {
    return {
      field: "dateOfBirth",
      message: `Player age is ${age} years old. This seems unusual - please check the date of birth.`,
      severity: "warning",
    };
  }

  // Future date
  if (birthDate > today) {
    return {
      field: "dateOfBirth",
      message: "Date of birth cannot be in the future.",
      severity: "warning",
    };
  }

  return null;
}

// Name validation - flag unusual characters or all caps
export function validateName(
  name: string,
  fieldName: string,
): ValidationWarning | null {
  if (!name) return null;

  // Check for all caps (more than 2 consecutive caps is suspicious)
  const allCapsPattern = /^[A-Z\s'-]+$/;
  if (name.length > 2 && allCapsPattern.test(name)) {
    return {
      field: fieldName,
      message: `${fieldName} is in ALL CAPS. Please use proper capitalization (e.g., "John Smith").`,
      severity: "warning",
    };
  }

  // Check for unusual characters (numbers, special chars)
  const unusualCharsPattern = /[^a-zA-Z\s'-]/;
  if (unusualCharsPattern.test(name)) {
    return {
      field: fieldName,
      message: `${fieldName} contains unusual characters. Names should only contain letters, spaces, hyphens, and apostrophes.`,
      severity: "warning",
    };
  }

  // Check for excessive spaces
  if (name.includes("  ")) {
    return {
      field: fieldName,
      message: `${fieldName} has multiple consecutive spaces. Please check formatting.`,
      severity: "info",
    };
  }

  return null;
}

// Check for duplicate phone (would need API call in real implementation)
export async function checkDuplicatePhone(
  phone: string,
  currentPlayerId?: string,
): Promise<ValidationWarning | null> {
  if (!phone) return null;

  // This is a placeholder - in real implementation, call API
  // const res = await fetch(`/api/admin/players/check-duplicate?phone=${phone}&exclude=${currentPlayerId}`);
  // const data = await res.json();

  // For now, just validate format
  const cleanPhone = phone.replace(/\s/g, "");
  const phonePattern = /^(\+?61|0)[2-478]\d{8}$/;

  if (!phonePattern.test(cleanPhone)) {
    return {
      field: "phone",
      message:
        "Phone number format looks unusual. Australian numbers should be like: 0400 123 456",
      severity: "info",
    };
  }

  return null;
}

// Check for duplicate email (would need API call in real implementation)
export async function checkDuplicateEmail(
  email: string,
  currentPlayerId?: string,
): Promise<ValidationWarning | null> {
  if (!email) return null;

  // This is a placeholder - in real implementation, call API
  // const res = await fetch(`/api/admin/players/check-duplicate?email=${email}&exclude=${currentPlayerId}`);
  // const data = await res.json();

  // For now, just validate format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return {
      field: "email",
      message: "Email format looks invalid. Please check the email address.",
      severity: "warning",
    };
  }

  return null;
}

// Comprehensive smart validation
export async function performSmartValidation(
  formData: PlayerFormData,
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Age validation
  if (formData.dateOfBirth) {
    const ageWarning = validateAge(formData.dateOfBirth);
    if (ageWarning) warnings.push(ageWarning);
  }

  // Name validation
  if (formData.firstName) {
    const firstNameWarning = validateName(formData.firstName, "First name");
    if (firstNameWarning) warnings.push(firstNameWarning);
  }

  if (formData.lastName) {
    const lastNameWarning = validateName(formData.lastName, "Last name");
    if (lastNameWarning) warnings.push(lastNameWarning);
  }

  // State/postcode validation
  if (formData.state && formData.postcode) {
    if (!validateStatePostcode(formData.state, formData.postcode)) {
      warnings.push({
        field: "postcode",
        message: `Postcode ${formData.postcode} doesn't match state ${formData.state}. Please verify the address.`,
        severity: "warning",
      });
    }
  }

  // Phone validation
  if (formData.phone) {
    const phoneWarning = await checkDuplicatePhone(
      formData.phone,
      formData.playerId,
    );
    if (phoneWarning) warnings.push(phoneWarning);
  }

  // Email validation
  if (formData.email) {
    const emailWarning = await checkDuplicateEmail(
      formData.email,
      formData.playerId,
    );
    if (emailWarning) warnings.push(emailWarning);
  }

  // Context-based validation
  if (formData.dateOfBirth) {
    const age =
      new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
    const isMinor = age < 18;

    // Check for guardians if minor
    if (isMinor && (!formData.guardians || formData.guardians.length === 0)) {
      warnings.push({
        field: "guardians",
        message:
          "This player is under 18 years old. At least one parent/guardian is required.",
        severity: "warning",
      });
    }

    // Check for own contact if adult
    if (!isMinor && !formData.email && !formData.phone) {
      warnings.push({
        field: "contact",
        message:
          "Adult players should have their own email and phone number listed.",
        severity: "info",
      });
    }
  }

  // Emergency contacts
  if (!formData.emergencyContacts || formData.emergencyContacts.length === 0) {
    warnings.push({
      field: "emergencyContacts",
      message: "At least one emergency contact is required for all players.",
      severity: "warning",
    });
  }

  // Check for duplicate emergency contact phone numbers
  if (formData.emergencyContacts && formData.emergencyContacts.length > 1) {
    const phones = formData.emergencyContacts
      .map((c) => c.phone)
      .filter(Boolean);
    const uniquePhones = new Set(phones);
    if (phones.length !== uniquePhones.size) {
      warnings.push({
        field: "emergencyContacts",
        message:
          "Multiple emergency contacts have the same phone number. This may be intentional if they share a family phone.",
        severity: "info",
      });
    }
  }

  return warnings;
}

// Format warning message for display
export function formatWarningMessage(warning: ValidationWarning): string {
  const icon = warning.severity === "warning" ? "⚠️" : "ℹ️";
  return `${icon} ${warning.message}`;
}

// Export types
export type { ValidationWarning };
