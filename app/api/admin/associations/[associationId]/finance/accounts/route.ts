import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { CreateFinanceAccountBodySchema } from "@/lib/db/schemas/financeCoa.schema";
import { ZodError } from "zod";

const COL = "finance_accounts";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response: authRes } = await requirePermission(request, "reports.financial");
  if (authRes) return authRes;

  const { associationId } = await params;
  const id = associationId.trim();
  if (!id) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  const { response: scopeRes } = await requireResourceAccess(request, "association", id);
  if (scopeRes) return scopeRes;

  const client = await clientPromise;
  const db = client.db();

  const accounts = await db
    .collection(COL)
    .find({ scopeType: "association", scopeId: id })
    .sort({ type: 1, code: 1 })
    .toArray();

  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authRes } = await requirePermission(request, "reports.financial");
  if (authRes) return authRes;

  const { associationId } = await params;
  const id = associationId.trim();
  if (!id) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  const { response: scopeRes } = await requireResourceAccess(request, "association", id);
  if (scopeRes) return scopeRes;

  try {
    const body = CreateFinanceAccountBodySchema.parse(await request.json());

    const now = new Date().toISOString();
    const doc = {
      accountId: `acct-${uuidv4()}`,
      scopeType: "association",
      scopeId: id,
      code: body.code.trim(),
      name: body.name.trim(),
      type: body.type,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    const client = await clientPromise;
    const db = client.db();
    await db.collection(COL).insertOne(doc);

    return NextResponse.json({ account: doc }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: e.issues }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    // Unique index conflict typically contains "E11000"
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "Account code already exists for this association" }, { status: 409 });
    }
    console.error("POST finance accounts error:", e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

