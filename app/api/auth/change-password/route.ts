// app/api/auth/change-password/route.ts
// Allows a logged-in member to change their password.
// If forcePasswordChange is set in the session, skips current-password verification.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession, createSession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/username";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Must be a member session (has memberId)
    if (!session.memberId) {
      return NextResponse.json(
        { error: "This endpoint is for member accounts only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Basic validation
    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Load member document
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

    if (!member || !member.auth?.passwordHash) {
      return NextResponse.json(
        { error: "Member record not found" },
        { status: 404 }
      );
    }

    // If NOT a forced password change, verify the current password
    if (!session.forcePasswordChange) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyPassword(
        currentPassword,
        member.auth.passwordHash
      );

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update member auth document
    await db.collection("members").updateOne(
      { _id: memberId },
      {
        $set: {
          "auth.passwordHash": newPasswordHash,
          "auth.forcePasswordChange": false,
          "auth.lastPasswordChange": new Date().toISOString(),
        },
      }
    );

    // Refresh the session cookie to clear forcePasswordChange flag
    await createSession({
      ...session,
      forcePasswordChange: false,
    });

    console.log(
      "✅ Password changed for member:",
      session.username || session.memberId
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("💥 Change-password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
