// app/api/auth/login/route.ts
// Login endpoint — checks users collection first, then members.

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/auth/username";
import bcrypt from "bcryptjs";
import { escapeRegex } from "@/lib/utils/regex";
import {
  createMemberSession,
  createStaffUserSession,
} from "@/lib/auth/createAppSession";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    const loginIdentifier = (username || email || "").trim();
    const loginRegex = escapeRegex(loginIdentifier);

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    // ── 1. Check users collection (admin / staff accounts) ──────────────────
    const user = await db.collection("users").findOne({
      $or: [
        { username: { $regex: `^${loginRegex}$`, $options: "i" } },
        { email: loginIdentifier.toLowerCase() },
      ],
    });

    if (user && user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 },
        );
      }

      const sessionResult = await createStaffUserSession(db, user);
      if (!sessionResult.ok) {
        return NextResponse.json(
          { error: sessionResult.error },
          { status: sessionResult.status },
        );
      }

      return NextResponse.json({
        success: true,
        forcePasswordChange: sessionResult.forcePasswordChange,
        clubPortalOrigin: sessionResult.clubPortalOrigin,
        associationPortalOrigin: sessionResult.associationPortalOrigin,
        user: sessionResult.user,
      });
    }

    // ── 2. Check members collection (portal / player accounts) ──────────────
    const member = await db.collection("members").findOne({
      "auth.username": { $regex: `^${loginRegex}$`, $options: "i" },
    });

    if (member && member.auth?.passwordHash) {
      const isValid = await verifyPassword(password, member.auth.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 },
        );
      }

      const sessionResult = await createMemberSession(db, member);
      if (!sessionResult.ok) {
        return NextResponse.json(
          { error: sessionResult.error },
          { status: sessionResult.status },
        );
      }

      return NextResponse.json({
        success: true,
        forcePasswordChange: sessionResult.forcePasswordChange,
        clubPortalOrigin: sessionResult.clubPortalOrigin,
        associationPortalOrigin: sessionResult.associationPortalOrigin,
        user: sessionResult.user,
      });
    }

    // ── 3. Not found in either collection ───────────────────────────────────
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  } catch (error: unknown) {
    console.error("💥 Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
