// lib/validation/member-validation.ts
// Member validation utilities - Updated with middleName and relatedMembers

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Australian format)
export function isValidPhone(phone: string): boolean {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, "");

  // Australian phone: 10 digits starting with 0, or mobile starting with 04
  const phoneRegex = /^0[2-9]\d{8}$/;
  const mobileRegex = /^04\d{8}$/;

  return phoneRegex.test(cleaned) || mobileRegex.test(cleaned);
}

// Validate postcode (Australian format)
export function isValidPostcode(postcode: string): boolean {
  const postcodeRegex = /^\d{4}$/;
  return postcodeRegex.test(postcode);
}

// Validate date of birth (must be in the past, reasonable age range)
export function isValidDateOfBirth(dob: string): {
  valid: boolean;
  message?: string;
} {
  try {
    const birthDate = new Date(dob);
    const today = new Date();

    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
      return { valid: false, message: "Invalid date format" };
    }

    // Check if date is in the future
    if (birthDate > today) {
      return { valid: false, message: "Date of birth cannot be in the future" };
    }

    // Check if age is reasonable (between 0 and 120 years)
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age < 0) {
      return { valid: false, message: "Invalid age" };
    }

    if (age > 120) {
      return { valid: false, message: "Age exceeds maximum limit" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, message: "Invalid date" };
  }
}

// Calculate age from date of birth
export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
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

// Validate create member request
export function validateCreateMember(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Club ID
  if (!data.clubId) {
    errors.push({ field: "clubId", message: "Club ID is required" });
  }

  // Personal Info
  if (!data.personalInfo) {
    errors.push({
      field: "personalInfo",
      message: "Personal information is required",
    });
  } else {
    if (!data.personalInfo.firstName || !data.personalInfo.firstName.trim()) {
      errors.push({
        field: "personalInfo.firstName",
        message: "First name is required",
      });
    } else if (data.personalInfo.firstName.trim().length < 2) {
      errors.push({
        field: "personalInfo.firstName",
        message: "First name must be at least 2 characters",
      });
    }

    // Middle name is optional, but validate if provided
    if (
      data.personalInfo.middleName &&
      data.personalInfo.middleName.trim().length < 2
    ) {
      errors.push({
        field: "personalInfo.middleName",
        message: "Middle name must be at least 2 characters if provided",
      });
    }

    if (!data.personalInfo.lastName || !data.personalInfo.lastName.trim()) {
      errors.push({
        field: "personalInfo.lastName",
        message: "Last name is required",
      });
    } else if (data.personalInfo.lastName.trim().length < 2) {
      errors.push({
        field: "personalInfo.lastName",
        message: "Last name must be at least 2 characters",
      });
    }

    if (!data.personalInfo.dateOfBirth) {
      errors.push({
        field: "personalInfo.dateOfBirth",
        message: "Date of birth is required",
      });
    } else {
      const dobValidation = isValidDateOfBirth(data.personalInfo.dateOfBirth);
      if (!dobValidation.valid) {
        errors.push({
          field: "personalInfo.dateOfBirth",
          message: dobValidation.message || "Invalid date of birth",
        });
      }
    }

    if (!data.personalInfo.gender) {
      errors.push({
        field: "personalInfo.gender",
        message: "Gender is required",
      });
    }

    // Validate related members if provided
    if (
      data.personalInfo.relatedMembers &&
      Array.isArray(data.personalInfo.relatedMembers)
    ) {
      data.personalInfo.relatedMembers.forEach((member: any, index: number) => {
        if (!member.name || !member.name.trim()) {
          errors.push({
            field: `personalInfo.relatedMembers[${index}].name`,
            message: `Related member #${index + 1} name is required`,
          });
        }

        if (!member.relationshipType || !member.relationshipType.trim()) {
          errors.push({
            field: `personalInfo.relatedMembers[${index}].relationshipType`,
            message: `Related member #${index + 1} relationship type is required`,
          });
        }

        // Member ID is optional, but if provided, validate format
        if (member.memberId && !member.memberId.match(/^[A-Z]+-\d+$/)) {
          errors.push({
            field: `personalInfo.relatedMembers[${index}].memberId`,
            message: `Related member #${index + 1} has invalid member ID format`,
          });
        }
      });
    }
  }

  // Contact Info
  if (!data.contact) {
    errors.push({
      field: "contact",
      message: "Contact information is required",
    });
  } else {
    if (!data.contact.email || !data.contact.email.trim()) {
      errors.push({ field: "contact.email", message: "Email is required" });
    } else if (!isValidEmail(data.contact.email)) {
      errors.push({ field: "contact.email", message: "Invalid email format" });
    }

    if (data.contact.phone && !isValidPhone(data.contact.phone)) {
      errors.push({
        field: "contact.phone",
        message: "Invalid phone number format",
      });
    }

    if (data.contact.mobile && !isValidPhone(data.contact.mobile)) {
      errors.push({
        field: "contact.mobile",
        message: "Invalid mobile number format",
      });
    }

    // Emergency Contact
    if (!data.contact.emergencyContact) {
      errors.push({
        field: "contact.emergencyContact",
        message: "Emergency contact is required",
      });
    } else {
      if (
        !data.contact.emergencyContact.name ||
        !data.contact.emergencyContact.name.trim()
      ) {
        errors.push({
          field: "contact.emergencyContact.name",
          message: "Emergency contact name is required",
        });
      }

      if (!data.contact.emergencyContact.relationship) {
        errors.push({
          field: "contact.emergencyContact.relationship",
          message: "Emergency contact relationship is required",
        });
      }

      if (
        !data.contact.emergencyContact.phone ||
        !data.contact.emergencyContact.phone.trim()
      ) {
        errors.push({
          field: "contact.emergencyContact.phone",
          message: "Emergency contact phone is required",
        });
      } else if (!isValidPhone(data.contact.emergencyContact.phone)) {
        errors.push({
          field: "contact.emergencyContact.phone",
          message: "Invalid emergency contact phone format",
        });
      }
    }
  }

  // Address
  if (!data.address) {
    errors.push({ field: "address", message: "Address is required" });
  } else {
    if (!data.address.street || !data.address.street.trim()) {
      errors.push({
        field: "address.street",
        message: "Street address is required",
      });
    }

    if (!data.address.suburb || !data.address.suburb.trim()) {
      errors.push({ field: "address.suburb", message: "Suburb is required" });
    }

    if (!data.address.state || !data.address.state.trim()) {
      errors.push({ field: "address.state", message: "State is required" });
    }

    if (!data.address.postcode || !data.address.postcode.trim()) {
      errors.push({
        field: "address.postcode",
        message: "Postcode is required",
      });
    } else if (!isValidPostcode(data.address.postcode)) {
      errors.push({
        field: "address.postcode",
        message: "Invalid postcode format (should be 4 digits)",
      });
    }
  }

  // Membership
  if (!data.membership) {
    errors.push({
      field: "membership",
      message: "Membership information is required",
    });
  } else {
    if (
      !data.membership.membershipTypes ||
      data.membership.membershipTypes.length === 0
    ) {
      errors.push({
        field: "membership.membershipTypes",
        message: "At least one membership type is required",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate member against membership type age restrictions
export async function validateMembershipTypeAge(
  db: any,
  memberAge: number,
  membershipTypeIds: string[],
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  for (const typeId of membershipTypeIds) {
    const membershipType = await db
      .collection("membership_types")
      .findOne({ typeId });

    if (!membershipType) {
      errors.push({
        field: "membership.membershipTypes",
        message: `Membership type ${typeId} not found`,
      });
      continue;
    }

    // Check age restrictions
    if (membershipType.minAge !== null && memberAge < membershipType.minAge) {
      errors.push({
        field: "membership.membershipTypes",
        message: `Member is too young for ${membershipType.name} (minimum age: ${membershipType.minAge})`,
      });
    }

    if (membershipType.maxAge !== null && memberAge > membershipType.maxAge) {
      errors.push({
        field: "membership.membershipTypes",
        message: `Member is too old for ${membershipType.name} (maximum age: ${membershipType.maxAge})`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Format display name (includes middle name if provided)
export function formatDisplayName(
  firstName: string,
  middleName: string | undefined,
  lastName: string,
): string {
  const parts = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(
    Boolean,
  );

  return parts.join(" ");
}

// Sanitize phone number (remove spaces and dashes)
export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, "");
}

// Prepare member data for database insertion
export function prepareMemberData(data: any): any {
  // Auto-generate display name if not provided
  if (!data.personalInfo.displayName) {
    data.personalInfo.displayName = formatDisplayName(
      data.personalInfo.firstName,
      data.personalInfo.middleName,
      data.personalInfo.lastName,
    );
  }

  // Clean related members - remove temporary IDs before saving
  if (
    data.personalInfo.relatedMembers &&
    data.personalInfo.relatedMembers.length > 0
  ) {
    data.personalInfo.relatedMembers = data.personalInfo.relatedMembers.map(
      (member: any) => {
        const cleanedMember: any = {
          name: member.name.trim(),
          relationshipType: member.relationshipType,
        };

        // Only include memberId if it's a valid member ID (not temp ID)
        if (member.memberId && member.memberId.match(/^[A-Z]+-\d+$/)) {
          cleanedMember.memberId = member.memberId;
        }

        return cleanedMember;
      },
    );
  }

  // Set timestamps
  const now = new Date().toISOString();
  if (!data.createdAt) {
    data.createdAt = now;
  }
  data.updatedAt = now;

  return data;
}
