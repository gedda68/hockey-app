// app/api/admin/users/route.ts
// User management API - saves to 'users' collection in MongoDB

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import bcrypt from "bcryptjs";

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
      .collection("users") // ← TABLE NAME: users
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

    // Check if email already exists
    const existing = await db
      .collection("users") // ← TABLE NAME: users
      .findOne({ email: body.email.toLowerCase() });

    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create user object
    const newUser = {
      userId: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      emailVerified: false,
      loginAttempts: 0,
      lastLogin: null,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
    };

    // Insert into users collection
    await db.collection("users").insertOne(newUser); // ← TABLE NAME: users

    // Return user without password hash
    const { passwordHash: _, ...userResponse } = newUser;

    console.log(`Created user: ${newUser.userId} in 'users' collection`);
    return NextResponse.json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
