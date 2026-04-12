// POST /api/admin/members/[id]/notify-fee-due
// J1 — Send a payment-due reminder email to the member (Resend).

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import {
  assertMemberInSessionScope,
  type MemberScopeDoc,
} from "@/lib/auth/memberRouteScope";
import { sendPaymentDueReminderEmail } from "@/lib/notifications/paymentDueReminder";

const BodySchema = z
  .object({
    note: z.string().max(2000).optional(),
  })
  .strict();

function memberEmail(member: Record<string, unknown>): string | null {
  const contact = member.contact as Record<string, unknown> | undefined;
  const primary = contact?.primaryEmail;
  const legacy = contact?.email;
  const top = member.primaryEmail;
  for (const v of [primary, legacy, top]) {
    if (typeof v === "string" && v.includes("@")) return v.trim();
  }
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { response: authRes } = await requirePermission(
    request,
    "registration.manage",
  );
  if (authRes) return authRes;

  try {
    const { id: memberId } = await context.params;
    let body: z.infer<typeof BodySchema>;
    try {
      const json = await request.json().catch(() => ({}));
      body = BodySchema.parse(json);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: e.flatten() },
          { status: 400 },
        );
      }
      throw e;
    }

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

    const to = memberEmail(member as Record<string, unknown>);
    if (!to) {
      return NextResponse.json(
        { error: "Member has no email on file" },
        { status: 400 },
      );
    }

    const displayName =
      (member.personalInfo as { displayName?: string } | undefined)
        ?.displayName ?? memberId;

    const result = await sendPaymentDueReminderEmail({
      to,
      memberDisplayName: displayName,
      note: body.note,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Email failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, sentTo: to });
  } catch (e: unknown) {
    console.error("notify-fee-due error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
