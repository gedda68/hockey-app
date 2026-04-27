import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { CreateExpenseLedgerEntryBodySchema } from "@/lib/db/schemas/expenseLedger.schema";
import { ZodError } from "zod";

const COL = "expense_ledger";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response: authRes } = await requirePermission(request, "reports.financial");
  if (authRes) return authRes;

  const { associationId } = await params;
  const scopeId = associationId.trim();
  if (!scopeId) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  const { response: scopeRes } = await requireResourceAccess(request, "association", scopeId);
  if (scopeRes) return scopeRes;

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from")?.trim() || null;
  const to = sp.get("to")?.trim() || null;
  const limit = Math.min(Number(sp.get("limit") ?? "200") || 200, 500);

  const query: Record<string, unknown> = { scopeType: "association", scopeId };
  if (from || to) {
    query.date = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const client = await clientPromise;
  const db = client.db();

  const entries = await db
    .collection(COL)
    .find(query)
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authRes } = await requirePermission(request, "reports.financial");
  if (authRes) return authRes;

  const { associationId } = await params;
  const scopeId = associationId.trim();
  if (!scopeId) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  const { response: scopeRes } = await requireResourceAccess(request, "association", scopeId);
  if (scopeRes) return scopeRes;

  try {
    const body = CreateExpenseLedgerEntryBodySchema.parse(await request.json());
    const nowIso = new Date().toISOString();
    const dateIso = new Date(body.date).toISOString();

    const referenceType = body.referenceType ?? "manual";
    const referenceId = body.referenceId?.trim() || `MAN-${uuidv4()}`;
    const source = body.source ?? "manual_other";

    const doc = {
      entryId: `exp-${uuidv4()}`,
      scopeType: "association",
      scopeId,
      date: dateIso,
      amountCents: body.amountCents,
      gstIncluded: body.gstIncluded ?? false,
      gstAmountCents: body.gstAmountCents ?? 0,
      accountId: body.accountId ?? null,
      costCentreId: body.costCentreId ?? null,
      ...(body.categoryName ? { categoryName: body.categoryName.trim() } : {}),
      description: body.description.trim(),
      source,
      status: "paid" as const,
      referenceType,
      referenceId,
      ...(body.seasonYear ? { seasonYear: body.seasonYear } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.userId,
      updatedBy: user.userId,
    };

    const client = await clientPromise;
    const db = client.db();
    await db.collection(COL).insertOne(doc);
    return NextResponse.json({ entry: doc }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: e.issues }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "Duplicate reference for this ledger" }, { status: 409 });
    }
    console.error("POST expense ledger error:", e);
    return NextResponse.json({ error: "Failed to create expense entry" }, { status: 500 });
  }
}
