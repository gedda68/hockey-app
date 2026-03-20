// app/api/auth/login/route.ts
// Login endpoint — checks users collection first, then members.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/username";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    const loginIdentifier = (username || email || "").trim();

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // ── 1. Check users collection (admin / staff accounts) ──────────────────
    const user = await db.collection("users").findOne({
      $or: [
        { username: { $regex: `^${loginIdentifier}$`, $options: "i" } },
        { email: loginIdentifier.toLowerCase() },
      ],
    });

    if (user && user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      if (user.status && user.status !== "active") {
        return NextResponse.json(
          { error: "Account is not active. Please contact an administrator." },
          { status: 403 }
        );
      }

      const firstName = (user.firstName || "").trim();
      const lastName  = (user.lastName  || "").trim();
      const fullName  = `${firstName} ${lastName}`.trim() || user.username;
      const role: string = user.role || "player";

      // Resolve club name
      let clubName: string | undefined;
      if (user.clubId) {
        const club = await db.collection("clubs").findOne({
          $or: [{ clubId: user.clubId }, { _id: user.clubId }],
        });
        clubName = club?.name;
      }

      const forcePasswordChange = user.forcePasswordChange === true;

      await createSession({
        userId:        user.userId || user._id.toString(),
        email:         user.email  || `${user.username}@local`,
        name:          fullName,
        firstName,
        lastName,
        role,
        associationId: user.associationId || null,
        clubId:        user.clubId || null,
        clubName,
        username:      user.username,
        forcePasswordChange,
      });

      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date(), loginAttempts: 0 } }
      );

      return NextResponse.json({
        success: true,
        forcePasswordChange,
        user: {
          userId:        user.userId || user._id.toString(),
          username:      user.username,
          email:         user.email,
          firstName,
          lastName,
          role,
          associationId: user.associationId || null,
          clubId:        user.clubId || null,
          clubName:      clubName || null,
          forcePasswordChange,
        },
      });
    }

    // ── 2. Check members collection (portal / player accounts) ──────────────
    const member = await db.collection("members").findOne({
      "auth.username": { $regex: `^${loginIdentifier}$`, $options: "i" },
    });

    if (member && member.auth?.passwordHash) {
      const isValid = await verifyPassword(password, member.auth.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      const memberStatus =
        member.status?.toLowerCase() ||
        member.membership?.status?.toLowerCase();
      if (memberStatus && memberStatus !== "active") {
        return NextResponse.json(
          { error: "Account is not active. Please contact your club administrator." },
          { status: 403 }
        );
      }

      const firstName =
        (member.personalInfo?.firstName || member.firstName || "").trim();
      const lastName =
        (member.personalInfo?.lastName || member.lastName || "").trim();
      const fullName = `${firstName} ${lastName}`.trim() || member.auth.username;
      const memberEmail =
        member.contact?.email || member.email || `${member.auth.username}@local`;
      const role: string = member.auth.role || "player";
      const memberClubId = member.clubId || member.membership?.clubId || null;
      const memberAssocId = member.associationId || null;
      const forcePasswordChange = member.auth.forcePasswordChange === true;

      let clubName: string | undefined;
      if (memberClubId) {
        const club = await db.collection("clubs").findOne({
          $or: [{ clubId: memberClubId }, { _id: memberClubId }],
        });
        clubName = club?.name;
      }

      await createSession({
        userId:        member._id.toString(),
        email:         memberEmail,
        name:          fullName,
        firstName,
        lastName,
        role,
        associationId: memberAssocId,
        clubId:        memberClubId,
        clubName,
        memberId:      member._id.toString(),
        username:      member.auth.username,
        forcePasswordChange,
      });

      await db.collection("members").updateOne(
        { _id: member._id },
        { $set: { "auth.lastLogin": new Date().toISOString() } }
      );

      return NextResponse.json({
        success: true,
        forcePasswordChange,
        user: {
          memberId:      member._id.toString(),
          username:      member.auth.username,
          email:         memberEmail,
          firstName,
          lastName,
          role,
          associationId: memberAssocId,
          clubId:        memberClubId,
          clubName:      clubName || null,
          forcePasswordChange,
        },
      });
    }

    // ── 3. Not found in either collection ───────────────────────────────────
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error: unknown) {
    console.error("💥 Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
