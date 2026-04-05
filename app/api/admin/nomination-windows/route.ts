/**
 * GET  /api/admin/nomination-windows  — list windows (filtered by season, category, scopeId, status)
 * POST /api/admin/nomination-windows  — create a new window
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { CreateWindowRequest, NominationWindow } from "@/types/nominations";
import { birthYearRangeForGroup } from "@/types/nominations";

const ALLOWED_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar", "assoc-selector",
  "club-admin", "registrar",
];

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const seasonYear = searchParams.get("seasonYear") ?? undefined;
  const category   = searchParams.get("category")   ?? undefined;
  const scopeId    = searchParams.get("scopeId")    ?? undefined;
  const status     = searchParams.get("status")     ?? undefined;

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const query: Record<string, unknown> = {};

  // Scope enforcement
  if (session.role !== "super-admin") {
    if (["association-admin", "assoc-registrar", "assoc-selector"].includes(session.role) && session.associationId) {
      query.scopeId = session.associationId;
    } else if (["club-admin", "registrar"].includes(session.role) && session.clubId) {
      query.scopeId = session.clubId;
    }
  } else {
    if (scopeId) query.scopeId = scopeId;
  }

  if (seasonYear) query.seasonYear = seasonYear;
  if (category)   query.category   = category;
  if (status)     query.status     = status;

  const windows = await db
    .collection("nomination_windows")
    .find(query)
    .sort({ openDate: -1, title: 1 })
    .toArray();

  return NextResponse.json({
    windows: windows.map((w) => ({ ...w, _id: w._id.toString() })),
    total: windows.length,
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as CreateWindowRequest;

  const {
    category, workflow, title, description,
    ageGroup, gender, linkedTournamentId,
    positionTitle, positionRole,
    scopeType, scopeId, scopeName, associationLevel,
    seasonYear, openDate, closeDate,
    minBirthYear, maxBirthYear,
    requiresFinancialMembership = true,
    requiresStatement = false,
    electorateType = "committee",
  } = body;

  // Validation
  if (!category || !workflow || !title || !scopeType || !scopeId || !seasonYear || !openDate || !closeDate) {
    return NextResponse.json(
      { error: "category, workflow, title, scopeType, scopeId, seasonYear, openDate, closeDate are required" },
      { status: 400 }
    );
  }

  if (closeDate < openDate) {
    return NextResponse.json({ error: "closeDate must be on or after openDate" }, { status: 400 });
  }

  // Scope check: non-super-admin can only create windows for their own scope
  if (session.role !== "super-admin") {
    const ownScope = session.clubId || session.associationId;
    if (ownScope && scopeId !== ownScope) {
      return NextResponse.json({ error: "Forbidden — can only create windows for your own scope" }, { status: 403 });
    }
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");

  // Auto-derive birth year range for rep-team windows if not provided
  let resolvedMinBirthYear = minBirthYear;
  let resolvedMaxBirthYear = maxBirthYear;
  if (category === "rep-team" && ageGroup && (!minBirthYear || !maxBirthYear)) {
    const range = birthYearRangeForGroup(ageGroup, parseInt(seasonYear, 10));
    if (range) {
      resolvedMinBirthYear = resolvedMinBirthYear ?? range.minBirthYear;
      resolvedMaxBirthYear = resolvedMaxBirthYear ?? range.maxBirthYear;
    }
  }

  const now = new Date().toISOString();
  const windowId = `nw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const window: NominationWindow = {
    windowId,
    category,
    workflow,
    title,
    ...(description        ? { description }        : {}),
    ...(ageGroup           ? { ageGroup }            : {}),
    ...(gender             ? { gender }              : {}),
    ...(linkedTournamentId ? { linkedTournamentId }  : {}),
    ...(positionTitle      ? { positionTitle }       : {}),
    ...(positionRole       ? { positionRole }        : {}),
    scopeType,
    scopeId,
    scopeName,
    ...(associationLevel   ? { associationLevel }    : {}),
    seasonYear,
    openDate,
    closeDate,
    ...(resolvedMinBirthYear !== undefined ? { minBirthYear: resolvedMinBirthYear } : {}),
    ...(resolvedMaxBirthYear !== undefined ? { maxBirthYear: resolvedMaxBirthYear } : {}),
    requiresFinancialMembership,
    requiresStatement,
    electorateType,
    status: "draft",
    createdBy: session.userId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("nomination_windows").insertOne(window);

  return NextResponse.json({ window }, { status: 201 });
}
