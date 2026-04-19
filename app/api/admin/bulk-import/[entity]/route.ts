// Unified bulk-import endpoint for all entity types.
// POST { rows: Record<string, string>[] } → { imported, updated, skipped, errors }

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { applyRowScope } from "@/lib/bulk-import/helpers";
import {
  authorizeBulkImport,
  buildImportRuntimeContext,
} from "@/lib/bulk-import/bulkImportAccess";
import { isBulkImportEntity, runBulkImport } from "@/lib/bulk-import/runBulkImport";
import type { ImportRow } from "@/lib/bulk-import/types";

type Ctx = { params: Promise<{ entity: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { user, response: authRes } = await requireAuth(req);
    if (authRes) return authRes;

    const { entity: entityParam } = await ctx.params;
    if (!isBulkImportEntity(entityParam)) {
      return NextResponse.json({ error: `Unknown entity type: ${entityParam}` }, { status: 400 });
    }
    const entity = entityParam;

    const { response: gateRes } = await authorizeBulkImport(req, user, entity);
    if (gateRes) return gateRes;

    const body = (await req.json()) as { rows?: ImportRow[] };
    const rows = body.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const runtime = buildImportRuntimeContext(user);
    const scopedRows = applyRowScope(entity, rows, runtime);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const result = await runBulkImport(db, entity, scopedRows, runtime);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Bulk import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
