// app/api/auth/login/route.ts
// Login endpoint - works with EXISTING user schema

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createSession } from "@/lib/auth/session";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Accept either username or email
    const loginIdentifier = username || email;

    console.log("🔐 Login attempt:", {
      loginIdentifier,
      hasPassword: !!password,
    });

    if (!loginIdentifier || !password) {
      console.log("❌ Missing credentials");
      return NextResponse.json(
        { error: "Username/Email and password are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find user by username OR email
    const user = await db.collection("users").findOne({
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier.toLowerCase() },
      ],
    });

    console.log("👤 User lookup:", {
      searchedFor: loginIdentifier,
      found: !!user,
      username: user?.username,
      email: user?.email,
    });

    if (!user) {
      console.log("❌ User not found");
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 },
      );
    }

    // Verify password using passwordHash field
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    console.log("🔑 Password check:", { valid: isValidPassword });

    if (!isValidPassword) {
      console.log("❌ Invalid password");
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 },
      );
    }

    // Check if user is active
    if (user.status !== "active") {
      console.log("❌ Account not active:", user.status);
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 },
      );
    }

    // Get club name if user has a club
    let clubName = null;
    if (user.clubId) {
      const club = await db
        .collection("clubs")
        .findOne({ clubId: user.clubId });
      clubName = club?.name || null;
      console.log("🏢 Club:", clubName);
    }

    // Get association name if user has an association
    let associationName = null;
    if (user.associationId) {
      const association = await db.collection("associations").findOne({
        associationId: user.associationId,
      });
      associationName = association?.name || null;
      console.log("🏛️ Association:", associationName);
    }

    // Determine role for session
    // Map your role field to our session role structure
    let sessionRole: "super_admin" | "admin" | "user" = "user";
    if (user.role === "super-admin" || user.role === "super_admin") {
      sessionRole = "super_admin";
    } else if (user.role === "club-admin" || user.role === "admin") {
      sessionRole = "admin";
    }

    // Create session
    await createSession({
      userId: user.userId || user._id.toString(),
      email: user.email || `${user.username}@local`,
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        user.email,
      role: sessionRole,
      clubId: user.clubId || null,
      clubName,
    });

    // Update last login
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          loginAttempts: 0,
        },
      },
    );

    console.log(
      "✅ Login successful:",
      user.username || user.email,
      "Role:",
      sessionRole,
    );

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: sessionRole,
        clubId: user.clubId,
        clubName,
        associationId: user.associationId,
        associationName,
      },
    });
  } catch (error: any) {
    console.error("💥 Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
