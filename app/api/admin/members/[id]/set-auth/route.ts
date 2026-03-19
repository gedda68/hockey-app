// app/api/admin/members/[id]/set-auth/route.ts
// Admin endpoint to create, reset, or update auth credentials for a member.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  generateUsername,
  hashPassword,
  generateTempPassword,
  generateRandomPassword,
} from "@/lib/auth/username";
import type { UserRole } from "@/lib/types/roles";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check — must be an admin user
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminRoles = [
      "super_admin",
      "super-admin",
      "admin",
      "association-admin",
      "club-admin",
    ];
    if (!adminRoles.includes(session.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    let memberId: ObjectId;
    try {
      memberId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid member ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      action,
      role,
      password,
      forcePasswordChange,
    }: {
      action: "create" | "reset" | "update-role";
      role?: UserRole;
      password?: string;
      forcePasswordChange?: boolean;
    } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required (create | reset | update-role)" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Load member document
    const member = await db.collection("members").findOne({ _id: memberId });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const firstName =
      member.personalInfo?.firstName || member.firstName || "user";
    const lastName =
      member.personalInfo?.lastName || member.lastName || "unknown";

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === "create") {
      if (member.auth?.username) {
        return NextResponse.json(
          {
            error:
              "Member already has an account. Use 'reset' to change password.",
          },
          { status: 409 }
        );
      }

      const username = await generateUsername(firstName, lastName, db);
      const plainPassword = password || generateTempPassword();
      const passwordHash = await hashPassword(plainPassword);
      const shouldForceChange = forcePasswordChange !== false; // default true

      await db.collection("members").updateOne(
        { _id: memberId },
        {
          $set: {
            auth: {
              username,
              passwordHash,
              role: (role as UserRole) || "player",
              forcePasswordChange: shouldForceChange,
              createdAt: new Date().toISOString(),
              lastLogin: null,
            },
          },
        }
      );

      console.log("✅ Created auth for member:", username);

      return NextResponse.json({
        success: true,
        action: "create",
        username,
        tempPassword: plainPassword,
        role: role || "player",
        forcePasswordChange: shouldForceChange,
      });
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    if (action === "reset") {
      if (!member.auth?.username) {
        return NextResponse.json(
          {
            error:
              "Member does not have an account yet. Use 'create' to set one up.",
          },
          { status: 400 }
        );
      }

      const plainPassword = password || generateTempPassword();
      const passwordHash = await hashPassword(plainPassword);

      await db.collection("members").updateOne(
        { _id: memberId },
        {
          $set: {
            "auth.passwordHash": passwordHash,
            "auth.forcePasswordChange": true,
            "auth.passwordResetAt": new Date().toISOString(),
          },
        }
      );

      console.log("✅ Reset password for member:", member.auth.username);

      return NextResponse.json({
        success: true,
        action: "reset",
        username: member.auth.username,
        tempPassword: plainPassword,
        forcePasswordChange: true,
      });
    }

    // ── UPDATE-ROLE ───────────────────────────────────────────────────────────
    if (action === "update-role") {
      if (!role) {
        return NextResponse.json(
          { error: "role is required for update-role action" },
          { status: 400 }
        );
      }

      if (!member.auth?.username) {
        return NextResponse.json(
          { error: "Member does not have an account. Use 'create' first." },
          { status: 400 }
        );
      }

      await db.collection("members").updateOne(
        { _id: memberId },
        { $set: { "auth.role": role } }
      );

      console.log(
        "✅ Updated role for member:",
        member.auth.username,
        "→",
        role
      );

      return NextResponse.json({
        success: true,
        action: "update-role",
        username: member.auth.username,
        role,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("💥 set-auth error:", error);
    return NextResponse.json(
      { error: "Failed to update member auth" },
      { status: 500 }
    );
  }
}
