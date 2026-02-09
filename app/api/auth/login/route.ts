// app/api/auth/login/route.ts
// Fixed login endpoint with better error handling

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { createSession, createSessionResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Login attempt started");

    // Try to parse body
    let body;
    try {
      const text = await request.text();
      console.log("📨 Raw body:", text);
      body = JSON.parse(text);
      console.log("📨 Parsed body:", body);
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 },
      );
    }

    const { email, password, username } = body;
    const emailToUse = email || username; // Support both 'email' and 'username' fields

    console.log("📧 Email/Username:", emailToUse);
    console.log("🔑 Password:", password ? "***" : "missing");

    if (!emailToUse || !password) {
      console.log("❌ Missing email/username or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Get user from database
    console.log("🔍 Connecting to database...");
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const usersCollection = db.collection("users");

    console.log("🔍 Looking for user:", emailToUse.toLowerCase());

    // Search by userId, email, or username
    const user = await usersCollection.findOne({
      $or: [
        { userid: emailToUse }, // Matches your log: user.userid
        { userId: emailToUse }, // Common camelCase variant
        { username: emailToUse.toLowerCase() }, // The actual 'username' field
        { email: emailToUse.toLowerCase() }, // The email field
      ],
    });

    if (!user) {
      console.log("❌ User not found:", emailToUse);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    console.log("✅ User found:", {
      id: user.userid,
      email: user.email,
      role: user.role,
    });

    // Verify password
    console.log("🔐 Verifying password...");
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.log("❌ Invalid password");
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    console.log("✅ Password valid");

    // Create session
    const sessionUser = {
      userId: user.userid.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      clubId: user.clubId || undefined,
      memberId: user.memberId || undefined,
    };

    console.log("🎫 Creating session for:", sessionUser);

    const token = await createSession(sessionUser);
    console.log("✅ Session token created");

    // Return response with session cookie
    return createSessionResponse(token, {
      success: true,
      user: sessionUser,
    });
  } catch (error: any) {
    console.error("❌ Login error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Authentication failed", details: error.message },
      { status: 500 },
    );
  }
}
