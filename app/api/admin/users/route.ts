// app/api/admin/users/route.ts
// User management API with username generation

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import bcrypt from "bcryptjs";

/**
 * Generate username from first and last name
 * Format: {firstInitial}{lastName5chars}
 * Example: John Smith → jsmith
 * Example: Jane Anderson → jander
 */
async function generateUsername(
  firstName: string,
  lastName: string,
  db: any
): Promise<string> {
  // Get first initial (lowercase)
  const firstInitial = firstName.charAt(0).toLowerCase();

  // Get up to 5 characters of last name (lowercase)
  const lastNamePart = lastName.substring(0, 5).toLowerCase();

  // Combine
  let baseUsername = firstInitial + lastNamePart;

  // Remove any non-alphanumeric characters
  baseUsername = baseUsername.replace(/[^a-z0-9]/g, "");

  // Check if username exists
  const existing = await db
    .collection("users")
    .findOne({ username: baseUsername });

  if (!existing) {
    // Username is available
    return baseUsername;
  }

  // Username exists, find next available number
  let counter = 1;
  let username = `${baseUsername}${counter}`;

  while (await db.collection("users").findOne({ username })) {
    counter++;
    username = `${baseUsername}${counter}`;
  }

  return username;
}

// GET all users
export async function GET(request: NextRequest) {
  const { user, response } = await requirePermission(request, "system.users");
  if (response) return response;

  try {
    const client = await clientPromise;
    const db = client.db();

    let query: any = {};

    // Filter based on role
    if (user.role === "association-admin" && user.associationId) {
      query.associationId = user.associationId;
    } else if (user.role === "club-admin" && user.clubId) {
      query.clubId = user.clubId;
    }

    const users = await db
      .collection("users")
      .find(query)
      .project({ passwordHash: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Loaded ${users.length} users from 'users' collection`);
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  const { user, response } = await requirePermission(request, "system.users");
  if (response) return response;

  try {
    const body = await request.json();
    console.log("Creating user with data:", { ...body, password: "***" });

    // Basic validation
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, password, firstName, lastName",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Generate unique username
    const username = await generateUsername(body.firstName, body.lastName, db);
    console.log(`Generated username: ${username}`);

    // Check if username already exists (shouldn't happen with our logic, but double-check)
    const existingUsername = await db.collection("users").findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username generation failed - please try again" },
        { status: 400 }
      );
    }

    // Note: We allow duplicate emails as users may have same email
    // but different usernames (e.g., family members)

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create user object
    const newUser = {
      userId: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username, // ← Generated username for login
      email: body.email.toLowerCase(),
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone || null,
      role: body.role || "member",
      associationId: body.associationId || null,
      clubId: body.clubId || null,
      assignedTeams: body.assignedTeams || [],
      linkedMembers: body.linkedMembers || [],
      passwordHash,
      status: "active",
      emailVerified: body.emailVerified || false,
      emailVerifiedAt: body.emailVerifiedAt || null,
      emailVerifiedBy: body.emailVerifiedBy || null,
      loginAttempts: 0,
      lastLogin: null,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
    };

    // Insert into users collection
    await db.collection("users").insertOne(newUser);

    // Return user without password hash
    const { passwordHash: _, ...userResponse } = newUser;

    console.log(`Created user: ${newUser.userId} with username: ${username}`);
    return NextResponse.json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
