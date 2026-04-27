import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { CreateCostCentreBodySchema } from "@/lib/db/schemas/financeCoa.schema";
import { ZodError } from "zod";

const COL = "finance_cost_centres";

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

  const costCentres = await db
    .collection(COL)
    .find({ scopeType: "association", scopeId: id })
    .sort({ code: 1 })
    .toArray();

  return NextResponse.json({ costCentres });
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
    const body = CreateCostCentreBodySchema.parse(await request.json());
    const now = new Date().toISOString();
    const doc = {
      costCentreId: `cc-${uuidv4()}`,
      scopeType: "association",
      scopeId: id,
      code: body.code.trim(),
      name: body.name.trim(),
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    const client = await clientPromise;
    const db = client.db();
    await db.collection(COL).insertOne(doc);
    return NextResponse.json({ costCentre: doc }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: e.issues }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "Cost centre code already exists for this association" }, { status: 409 });
    }
    console.error("POST finance cost centres error:", e);
    return NextResponse.json({ error: "Failed to create cost centre" }, { status: 500 });
  }
}

