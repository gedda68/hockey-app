// app/api/auth/login/route.ts
// Login API with DEBUG logging

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function POST(request: NextRequest) {
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🔐 LOGIN ATTEMPT");
    console.log("=".repeat(50));

    // Get the raw body
    const body = await request.json();
    console.log("📥 Raw body received:", JSON.stringify(body, null, 2));
    console.log("📋 Body type:", typeof body);
    console.log("📋 Body keys:", Object.keys(body));

    const { username, password } = body;

    console.log("🔍 Extracted values:");
    console.log("   username:", username, "(type:", typeof username, ")");
    console.log("   password:", password ? "[PROVIDED]" : "[MISSING]", "(type:", typeof password, ")");

    if (!username || !password) {
      console.log("❌ Validation failed - missing fields");
      console.log("   username present?", !!username);
      console.log("   password present?", !!password);
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    console.log("✅ Validation passed");

    const client = await clientPromise;
    const db = client.db();

    console.log("🔍 Looking for user:", username.toLowerCase());

    // Find user by USERNAME
    const user = await db.collection("users").findOne({
      username: username.toLowerCase(),
    });

    if (!user) {
      console.log("❌ User not found:", username.toLowerCase());
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log("✅ User found:", user.username);

    // Check if account is active
    if (user.status !== "active") {
      console.log("❌ Account not active:", user.status);
      return NextResponse.json(
        { error: "Account is not active. Please contact an administrator." },
        { status: 403 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      console.log("❌ Account locked until:", user.lockedUntil);
      return NextResponse.json(
        { error: "Account is temporarily locked. Please try again later." },
        { status: 403 }
      );
    }

    console.log("🔐 Verifying password...");

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      console.log("❌ Password mismatch");
      
      // Increment failed login attempts
      const loginAttempts = (user.loginAttempts || 0) + 1;
      const updateData: any = { loginAttempts };

      // Lock account after 5 failed attempts
      if (loginAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        console.log("⚠️ Account locked after 5 failed attempts");
      }

      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: updateData }
      );

      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log("✅ Password correct");

    // Successful login - reset login attempts and update last login
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        },
      }
    );

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
        associationId: user.associationId,
        clubId: user.clubId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      message: "Login successful",
      user: userWithoutPassword,
    });

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    console.log("✅ LOGIN SUCCESSFUL");
    console.log("=".repeat(50) + "\n");

    return response;
  } catch (error: any) {
    console.error("💥 LOGIN ERROR:", error);
    console.log("=".repeat(50) + "\n");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}