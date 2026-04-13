// app/api/auth/change-password/route.ts
// Handles password change for both members and users collection accounts.
// Forced change: deletes session so user must log in fresh with new password.
// Voluntary change: refreshes session in place.

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession, deleteSession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/username";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation are required" },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const isForced = session.forcePasswordChange === true;

    // ── Path A: member account (has memberId) ────────────────────────────────
    if (session.memberId) {
      let memberId: ObjectId;
      try {
        memberId = new ObjectId(session.memberId);
      } catch {
        return NextResponse.json(
          { error: "Invalid member ID in session" },
          { status: 400 }
        );
      }

      const member = await db
        .collection("members")
        .findOne({ _id: memberId }, { projection: { auth: 1 } });

      if (!member?.auth?.passwordHash) {
        return NextResponse.json(
          { error: "Member account not found" },
          { status: 404 }
        );
      }

      if (!isForced) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Current password is required" },
            { status: 400 }
          );
        }
        const valid = await verifyPassword(currentPassword, member.auth.passwordHash);
        if (!valid) {
          return NextResponse.json(
            { error: "Current password is incorrect" },
            { status: 401 }
          );
        }
      }

      const newHash = await hashPassword(newPassword);

      await db.collection("members").updateOne(
        { _id: memberId },
        {
          $set: {
            "auth.passwordHash":        newHash,
            "auth.forcePasswordChange": false,
            "auth.lastPasswordChange":  new Date().toISOString(),
          },
        }
      );

      // For forced changes: clear session so user logs in fresh with new password
      await deleteSession();
      console.log("✅ Member password changed:", session.username || session.memberId);
      return NextResponse.json({ success: true });
    }

    // ── Path B: users collection account (admin / staff) ─────────────────────
    if (session.userId) {
      // Try by userId string field first
      let userDoc: Record<string, any> | null = await db
        .collection("users")
        .findOne({ userId: session.userId }, { projection: { _id: 1, passwordHash: 1 } });

      // Fallback: try by MongoDB _id
      if (!userDoc) {
        try {
          const oid = new ObjectId(session.userId);
          userDoc = await db
            .collection("users")
            .findOne({ _id: oid }, { projection: { _id: 1, passwordHash: 1 } });
        } catch {
          // userId is not a valid ObjectId — skip
        }
      }

      if (!userDoc?.passwordHash) {
        return NextResponse.json(
          { error: "User account not found" },
          { status: 404 }
        );
      }

      if (!isForced) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Current password is required" },
            { status: 400 }
          );
        }
        const valid = await bcrypt.compare(currentPassword, userDoc.passwordHash);
        if (!valid) {
          return NextResponse.json(
            { error: "Current password is incorrect" },
            { status: 401 }
          );
        }
      }

      const newHash = await bcrypt.hash(newPassword, 12);

      await db.collection("users").updateOne(
        { _id: userDoc._id },
        {
          $set: {
            passwordHash:        newHash,
            forcePasswordChange: false,
            lastPasswordChange:  new Date().toISOString(),
          },
        }
      );

      // Clear session — user logs in fresh with new password
      await deleteSession();
      console.log("✅ User password changed:", session.username || session.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Could not identify account — please log in again" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("💥 Change-password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
