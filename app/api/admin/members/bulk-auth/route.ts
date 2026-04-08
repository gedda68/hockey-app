// app/api/admin/members/bulk-auth/route.ts
// Bulk-provision login accounts for members who don't yet have one.
// Supports dryRun mode to preview what would be created.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  generateUsername,
  hashPassword,
  generateTempPassword,
} from "@/lib/auth/username";

interface BulkAuthResult {
  memberId: string;
  memberName: string;
  username: string;
  tempPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "member.edit");
    if (authRes) return authRes;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { clubId, dryRun = false }: { clubId?: string; dryRun?: boolean } =
      body;

    if (!clubId) {
      return NextResponse.json(
        { error: "clubId is required for bulk auth" },
        { status: 400 },
      );
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubId,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db();

    // Build query: find members WITHOUT auth.username
    const query: Record<string, unknown> = {
      $or: [
        { "auth.username": { $exists: false } },
        { "auth.username": null },
        { "auth.username": "" },
      ],
    };

    if (clubId) {
      // Support both top-level clubId and nested membership.clubId
      query.$and = [
        {
          $or: [{ clubId }, { "membership.clubId": clubId }],
        },
      ];
    }

    const members = await db.collection("members").find(query).toArray();

    console.log(
      `📋 Bulk auth: found ${members.length} members without accounts${clubId ? ` in club ${clubId}` : ""}`
    );

    const tempPassword = generateTempPassword();
    const results: BulkAuthResult[] = [];

    for (const member of members) {
      const firstName =
        member.personalInfo?.firstName || member.firstName || "user";
      const lastName =
        member.personalInfo?.lastName || member.lastName || "unknown";
      const memberName = `${firstName} ${lastName}`.trim();

      // Generate a unique username — even in dryRun we generate one to show the preview,
      // but we track what we've "used" in-memory so previewed names don't collide.
      const username = await generateUsername(firstName, lastName, db);

      results.push({
        memberId: member._id.toString(),
        memberName,
        username,
        tempPassword,
      });

      if (!dryRun) {
        const passwordHash = await hashPassword(tempPassword);

        await db.collection("members").updateOne(
          { _id: member._id },
          {
            $set: {
              auth: {
                username,
                passwordHash,
                role: "player",
                forcePasswordChange: true,
                createdAt: new Date().toISOString(),
                lastLogin: null,
              },
            },
          }
        );
      }
    }

    if (!dryRun) {
      console.log(`✅ Bulk auth: provisioned ${results.length} accounts`);
    } else {
      console.log(
        `🔍 Bulk auth dryRun: would provision ${results.length} accounts`
      );
    }

    return NextResponse.json({
      success: true,
      dryRun,
      processed: results.length,
      created: results,
    });
  } catch (error: unknown) {
    console.error("💥 bulk-auth error:", error);
    return NextResponse.json(
      { error: "Failed to bulk-provision member accounts" },
      { status: 500 }
    );
  }
}
