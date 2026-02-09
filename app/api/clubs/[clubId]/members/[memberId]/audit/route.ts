// app/api/clubs/[clubId]/members/[memberId]/audit/route.ts
// API endpoint for fetching member audit logs

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import {
  canViewMember,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { getMemberAuditHistory } from "@/lib/audit-log";

export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const { clubId, memberId } = params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // Check authorization - must be able to view the member
    if (!canViewMember(user, clubId, memberId)) {
      return NextResponse.json(
        forbiddenResponse(
          "You do not have permission to view this member's history",
        ),
        { status: 403 },
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Fetch audit history
    const logs = await getMemberAuditHistory(memberId, {
      action: action as any,
      limit,
      skip,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
