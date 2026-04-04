// app/api/admin/users/route.ts
// API routes for user management

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import bcrypt from "bcryptjs";
import {
  CreateUserSchema,
  validateRoleAssignment,
} from "@/lib/db/schemas/user";

// GET all users
export async function GET(request: NextRequest) {
  const { user, response } = await requirePermission(request, "system.users");
  if (response) return response;

  try {
    const client = await clientPromise;
    const db = client.db();

    // Super admin sees all users
    // Association admin sees users in their association
    // Club admin sees users in their club
    let query: Record<string, unknown> = {};

    if (user.role === "association-admin" && user.associationId) {
      query.associationId = user.associationId;
    } else if (user.role === "club-admin" && user.clubId) {
      query.clubId = user.clubId;
    }

    const users = await db
      .collection("users")
      .find(query)
      .project({ passwordHash: 0 }) // Don't return password
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  const { user, response } = await requirePermission(request, "system.users");
  if (response) return response;

  try {
    const body = await request.json();

    // Validate input
    const validated = CreateUserSchema.parse(body);

    // Validate role assignment
    const roleValidation = validateRoleAssignment(
      validated.role,
      validated.associationId,
      validated.clubId
    );

    if (!roleValidation.valid) {
      return NextResponse.json(
        { error: roleValidation.error },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if email already exists
    const existing = await db
      .collection("users")
      .findOne({ email: validated.email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user
    const newUser = {
      userId: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...validated,
      passwordHash,
      status: "active",
      emailVerified: false,
      loginAttempts: 0,
      lastLogin: null,
      lockedUntil: null,
      assignedTeams: validated.assignedTeams || [],
      linkedMembers: validated.linkedMembers || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
    };

    // Remove password field (we have passwordHash now)
    const { password, ...userToInsert } = newUser as any;

    await db.collection("users").insertOne(userToInsert);

    // Return user without password hash
    const { passwordHash: _, ...userResponse } = userToInsert;

    return NextResponse.json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
