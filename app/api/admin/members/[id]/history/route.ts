// app/api/admin/members/[id]/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response: authRes } = await requirePermission(request, "member.view");
  if (authRes) return authRes;

  try {
    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    const client = await clientPromise;
    const db = client.db();

    const member = await db.collection("members").findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const scope = await assertMemberInSessionScope(request, member as MemberScopeDoc);
    if (scope) return scope;

    // Fetch change logs from member_change_logs collection
    const changes = await db
      .collection("member_change_logs")
      .find({ memberId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      changes,
    });
  } catch (error: unknown) {
    console.error("Error fetching member change history:", error);
    return NextResponse.json(
      { error: "Failed to fetch change history" },
      { status: 500 },
    );
  }
}
