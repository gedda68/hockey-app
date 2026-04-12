// GET /api/admin/members/[id]/data-export
// J4 — Subject-access style JSON bundle (no passwords / secrets).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";

function stripSecrets(doc: Record<string, unknown> | null): unknown {
  if (!doc || typeof doc !== "object") return doc;
  const out = { ...doc } as Record<string, unknown>;
  delete out.passwordHash;
  if (out.auth && typeof out.auth === "object") {
    const a = { ...(out.auth as object) } as Record<string, unknown>;
    delete a.passwordHash;
    out.auth = a;
  }
  if (out.contact && typeof out.contact === "object") {
    const c = { ...(out.contact as object) } as Record<string, unknown>;
    delete c.passwordHash;
    out.contact = c;
  }
  return out;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { response: authRes } = await requirePermission(request, "member.view");
  if (authRes) return authRes;

  try {
    const { id: memberId } = await context.params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const scope = await assertMemberInSessionScope(
      request,
      member as MemberScopeDoc,
    );
    if (scope) return scope;

    const payments = await db
      .collection("payments")
      .find({ memberId })
      .project({
        paymentId: 1,
        amount: 1,
        status: 1,
        createdAt: 1,
        clubId: 1,
        seasonYear: 1,
        description: 1,
      })
      .limit(500)
      .toArray();

    const clubRegistrations = await db
      .collection("club-registrations")
      .find({ memberId })
      .project({
        registrationId: 1,
        clubId: 1,
        clubName: 1,
        seasonYear: 1,
        status: 1,
        registeredDate: 1,
      })
      .limit(200)
      .toArray();

    const payload = {
      exportedAt: new Date().toISOString(),
      memberId,
      member: stripSecrets(member as Record<string, unknown>),
      payments,
      clubRegistrations,
    };

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="member-${memberId}-export.json"`,
      },
    });
  } catch (e: unknown) {
    console.error("data-export error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
