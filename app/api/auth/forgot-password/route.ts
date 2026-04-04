/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email address, looks up the matching member or user,
 * generates a secure time-limited reset token, stores it in MongoDB,
 * and sends a password-reset email via Resend.
 *
 * Always returns 200 (even if the email is not found) to prevent
 * user-enumeration attacks.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import clientPromise from "@/lib/mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildPasswordResetEmail } from "@/lib/email/templates/passwordReset";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const EXPIRY_MINUTES = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // ── 1. Find account (check users first, then members) ──────────────────

    let firstName = "there";
    let foundId: string | null = null;
    let collection = "users";

    const user = await db
      .collection("users")
      .findOne({ email }, { projection: { userId: 1, firstName: 1, email: 1 } });

    if (user) {
      firstName = user.firstName || "there";
      foundId = user.userId;
      collection = "users";
    } else {
      const member = await db.collection("members").findOne(
        {
          $or: [
            { "contact.email": email },
            { "contact.primaryEmail": email },
          ],
        },
        { projection: { memberId: 1, "personalInfo.firstName": 1 } }
      );

      if (member) {
        firstName = member.personalInfo?.firstName || "there";
        foundId = member.memberId;
        collection = "members";
      }
    }

    // ── 2. Always return 200 to prevent email enumeration ──────────────────
    if (!foundId) {
      // Deliberate constant-time response — don't leak whether email exists
      return NextResponse.json({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    }

    // ── 3. Generate a secure random token ──────────────────────────────────
    const token = randomBytes(32).toString("hex"); // 64 hex chars
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // ── 4. Store token in password_reset_tokens collection ─────────────────
    // Upsert so repeated requests replace the previous token
    await db.collection("password_reset_tokens").updateOne(
      { email },
      {
        $set: {
          email,
          token,
          collection, // "users" | "members"
          accountId: foundId,
          expiresAt,
          createdAt: new Date(),
          used: false,
        },
      },
      { upsert: true }
    );

    // ── 5. Create a TTL index so MongoDB auto-deletes expired tokens ───────
    // (idempotent — safe to call every request)
    await db
      .collection("password_reset_tokens")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });

    // ── 6. Send email ───────────────────────────────────────────────────────
    const { subject, html, text } = buildPasswordResetEmail({
      firstName,
      resetToken: token,
      expiryMinutes: EXPIRY_MINUTES,
    });

    await sendEmail({ to: email, subject, html, text });

    return NextResponse.json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error: unknown) {
    console.error("💥 forgot-password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
