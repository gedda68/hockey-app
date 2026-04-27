import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { PatchFinanceAccountBodySchema } from "@/lib/db/schemas/financeCoa.schema";
import { ZodError } from "zod";

const COL = "finance_accounts";

type Params = { params: Promise<{ associationId: string; accountId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response: authRes } = await requirePermission(request, "reports.financial");
  if (authRes) return authRes;

  const { associationId, accountId } = await params;
  const scopeId = associationId.trim();
  const id = accountId.trim();
  if (!scopeId || !id) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const { response: scopeRes } = await requireResourceAccess(request, "association", scopeId);
  if (scopeRes) return scopeRes;

  try {
    const body = PatchFinanceAccountBodySchema.parse(await request.json());
    const $set: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: user.userId };
    if (body.code !== undefined) $set.code = body.code.trim();
    if (body.name !== undefined) $set.name = body.name.trim();
    if (body.type !== undefined) $set.type = body.type;
    if (body.active !== undefined) $set.active = body.active;

    const client = await clientPromise;
    const db = client.db();
    const res = await db.collection(COL).updateOne(
      { scopeType: "association", scopeId, accountId: id },
      { $set },
    );
    if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: e.issues }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "Account code already exists for this association" }, { status: 409 });
    }
    console.error("PATCH finance account error:", e);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response: authRes } = await requirePermission(request, "reports.financial");
  if (authRes) return authRes;

  const { associationId, accountId } = await params;
  const scopeId = associationId.trim();
  const id = accountId.trim();
  if (!scopeId || !id) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const { response: scopeRes } = await requireResourceAccess(request, "association", scopeId);
  if (scopeRes) return scopeRes;

  const client = await clientPromise;
  const db = client.db();
  const now = new Date().toISOString();
  const res = await db.collection(COL).updateOne(
    { scopeType: "association", scopeId, accountId: id },
    { $set: { active: false, updatedAt: now, updatedBy: user.userId } },
  );
  if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

