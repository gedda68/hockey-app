// app/api/auth/login/route.ts
// Login endpoint — checks members collection first, then falls back to users collection.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/username";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/types/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Accept either username or email field — username-only for member portal
    const loginIdentifier = username || email;

    console.log("🔐 Login attempt:", {
      loginIdentifier,
      hasPassword: !!password,
    });

    if (!loginIdentifier || !password) {
      console.log("❌ Missing credentials");
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // ── 1. Check members collection first (member portal auth) ──────────────
    const member = await db.collection("members").findOne({
      "auth.username": { $regex: `^${loginIdentifier}$`, $options: "i" },
    });

    if (member && member.auth?.passwordHash) {
      console.log("👤 Member lookup found:", member.auth.username);

      // Verify password against member's auth hash
      const isValidPassword = await verifyPassword(
        password,
        member.auth.passwordHash
      );

      console.log("🔑 Member password check:", { valid: isValidPassword });

      if (!isValidPassword) {
        console.log("❌ Invalid member password");
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      // Check member status
      const memberStatus =
        member.status?.toLowerCase() || member.membership?.status?.toLowerCase();
      if (memberStatus && memberStatus !== "active") {
        console.log("❌ Member account not active:", memberStatus);
        return NextResponse.json(
          { error: "Account is not active. Please contact your club administrator." },
          { status: 403 }
        );
      }

      const forcePasswordChange = member.auth.forcePasswordChange === true;
      const memberRole: UserRole = member.auth.role || "player";

      // Build name from member document
      const firstName =
        member.personalInfo?.firstName || member.firstName || "";
      const lastName = member.personalInfo?.lastName || member.lastName || "";
      const memberName = `${firstName} ${lastName}`.trim() || member.auth.username;
      const memberEmail =
        member.contact?.email || member.email || `${member.auth.username}@local`;

      // Get club name if available
      let clubName: string | null = null;
      const memberClubId = member.clubId || member.membership?.clubId || null;
      if (memberClubId) {
        const club = await db
          .collection("clubs")
          .findOne({ $or: [{ clubId: memberClubId }, { _id: memberClubId }] });
        clubName = club?.name || null;
      }

      // Create session for member
      await createSession({
        userId: member._id.toString(),
        email: memberEmail,
        name: memberName,
        role: memberRole,
        clubId: memberClubId,
        clubName: clubName || undefined,
        memberId: member._id.toString(),
        username: member.auth.username,
        forcePasswordChange,
      });

      // Update lastLogin timestamp
      await db.collection("members").updateOne(
        { _id: member._id },
        { $set: { "auth.lastLogin": new Date().toISOString() } }
      );

      console.log(
        "✅ Member login successful:",
        member.auth.username,
        "Role:",
        memberRole,
        "ForceChange:",
        forcePasswordChange
      );

      return NextResponse.json({
        success: true,
        forcePasswordChange,
        user: {
          memberId: member._id.toString(),
          username: member.auth.username,
          name: memberName,
          email: memberEmail,
          role: memberRole,
          clubId: memberClubId,
          clubName,
          forcePasswordChange,
        },
      });
    }

    // ── 2. Fall back to users collection (existing admin auth) ─────────────
    console.log("👤 No member found, checking users collection...");

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
      console.log("❌ User not found in either collection");
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password using passwordHash field
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    console.log("🔑 Password check:", { valid: isValidPassword });

    if (!isValidPassword) {
      console.log("❌ Invalid password");
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== "active") {
      console.log("❌ Account not active:", user.status);
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Get club name if user has a club
    let clubName: string | null = null;
    if (user.clubId) {
      const club = await db
        .collection("clubs")
        .findOne({ clubId: user.clubId });
      clubName = club?.name || null;
      console.log("🏢 Club:", clubName);
    }

    // Get association name if user has an association
    let associationName: string | null = null;
    if (user.associationId) {
      const association = await db.collection("associations").findOne({
        associationId: user.associationId,
      });
      associationName = association?.name || null;
      console.log("🏛️ Association:", associationName);
    }

    // Determine role for session — map to legacy session role structure
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
      clubName: clubName || undefined,
    });

    // Update last login
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          loginAttempts: 0,
        },
      }
    );

    console.log(
      "✅ Login successful:",
      user.username || user.email,
      "Role:",
      sessionRole
    );

    return NextResponse.json({
      success: true,
      forcePasswordChange: false,
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
  } catch (error: unknown) {
    console.error("💥 Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
