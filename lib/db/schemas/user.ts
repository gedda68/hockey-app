// lib/db/schemas/user.ts
// User schema with role-based access control

import { z } from "zod";
import type { UserRole } from "@/lib/types/roles";

export const UserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),

  // Profile
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),

  // Role and permissions
  role: z.enum([
    "super-admin",
    "association-admin",
    "club-admin",
    "coach",
    "manager",
    "umpire",
    "volunteer",
    "member",
    "parent",
  ]),

  // Organization assignment
  associationId: z.string().nullable(),
  clubId: z.string().nullable(),

  // For coaches/managers - assigned teams
  assignedTeams: z.array(z.string()).default([]),

  // For parents - linked children
  linkedMembers: z.array(z.string()).default([]),

  // Account status
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  emailVerified: z.boolean().default(false),

  // Authentication
  passwordHash: z.string(),
  passwordResetToken: z.string().nullable().optional(),
  passwordResetExpires: z.date().nullable().optional(),

  // Sessions
  lastLogin: z.date().nullable().optional(),
  loginAttempts: z.number().default(0),
  lockedUntil: z.date().nullable().optional(),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Helper type for user creation
export const CreateUserSchema = UserSchema.omit({
  userId: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(8),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

// Helper type for user update
export const UpdateUserSchema = UserSchema.partial().omit({
  userId: true,
  passwordHash: true,
  createdAt: true,
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// Session type
export interface UserSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  associationId: string | null;
  clubId: string | null;
  assignedTeams: string[];
  linkedMembers: string[];
  permissions: string[];
}

// Role assignment validation
export function validateRoleAssignment(
  role: UserRole,
  associationId: string | null,
  clubId: string | null
): { valid: boolean; error?: string } {
  switch (role) {
    case "super-admin":
      // Super admin should not be tied to specific org
      if (associationId || clubId) {
        return {
          valid: false,
          error: "Super admin should not be assigned to specific organization",
        };
      }
      break;

    case "association-admin":
      // Must have association
      if (!associationId) {
        return {
          valid: false,
          error: "Association admin must be assigned to an association",
        };
      }
      break;

    case "club-admin":
    case "coach":
    case "manager":
      // Must have club (and implicitly association)
      if (!clubId) {
        return {
          valid: false,
          error: `${role} must be assigned to a club`,
        };
      }
      break;

    case "umpire":
    case "volunteer":
    case "member":
    case "parent":
      // Optional club assignment
      break;
  }

  return { valid: true };
}
