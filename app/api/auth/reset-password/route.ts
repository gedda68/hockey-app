/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and updates the user/member password.
 *
 * Body: { token: string; password: string; confirmPassword: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth/username";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    // ── Validate inputs ────────────────────────────────────────────────────
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // ── Look up token ──────────────────────────────────────────────────────
    const resetDoc = await db
      .collection("password_reset_tokens")
      .findOne({ token, used: false });

    if (!resetDoc) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // ── Check expiry ───────────────────────────────────────────────────────
    if (new Date() > new Date(resetDoc.expiresAt)) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // ── Hash new password ──────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);

    // ── Update the correct collection ─────────────────────────────────────
    const col = resetDoc.collection as "users" | "members";
    const idField = col === "users" ? "userId" : "memberId";

    const result = await db.collection(col).updateOne(
      { [idField]: resetDoc.accountId },
      {
        $set: {
          passwordHash,
          forcePasswordChange: false,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // ── Mark token as used ─────────────────────────────────────────────────
    await db.collection("password_reset_tokens").updateOne(
      { token },
      { $set: { used: true, usedAt: new Date() } }
    );

    return NextResponse.json({
      message: "Password updated successfully. You can now log in.",
    });
  } catch (error: unknown) {
    console.error("💥 reset-password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password?token=...
 * Validate a token without consuming it (used by the UI to pre-validate
 * before showing the new-password form).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const resetDoc = await db
      .collection("password_reset_tokens")
      .findOne({ token, used: false });

    if (!resetDoc) {
      return NextResponse.json({ valid: false, error: "Invalid or expired token" });
    }

    if (new Date() > new Date(resetDoc.expiresAt)) {
      return NextResponse.json({ valid: false, error: "Token has expired" });
    }

    return NextResponse.json({ valid: true });
  } catch (error: unknown) {
    console.error("💥 reset-password validate error:", error);
    return NextResponse.json(
      { valid: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
