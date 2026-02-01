// app/api/auth/login/route.ts
// User login endpoint

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { createToken, setAuthCookie } from "@/lib/auth/middleware";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { UserSession } from "@/lib/db/schemas/user";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check status
    if (user.status !== "active") {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }

    // Update last login
    await db.collection("users").updateOne(
      { userId: user.userId },
      {
        $set: {
          lastLogin: new Date(),
          loginAttempts: 0,
          updatedAt: new Date(),
        },
      }
    );

    // Create session
    const roleDefinition = ROLE_DEFINITIONS[user.role];
    const session: UserSession = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      associationId: user.associationId || null,
      clubId: user.clubId || null,
      assignedTeams: user.assignedTeams || [],
      linkedMembers: user.linkedMembers || [],
      permissions: roleDefinition.permissions,
    };

    const token = createToken(session);
    const response = NextResponse.json({
      message: "Login successful",
      user: session,
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
