// POST — O3 public interest form (pathways → duty roster). Not authenticated.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";
import { PublicVolunteerDutyInterestSchema } from "@/lib/db/schemas/volunteerDutyRoster.schema";
import { resolveClubByIdOrSlug } from "@/lib/volunteerDuty/resolveClub";

type Params = { params: Promise<{ clubId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { clubId: clubRef } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = PublicVolunteerDutyInterestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.company?.trim()) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClubByIdOrSlug(db, clubRef);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const full = await db.collection("clubs").findOne(
      { id: club.clubId },
      { projection: { active: 1 } },
    );
    if (full && full.active === false) {
      return NextResponse.json({ error: "Club not accepting enquiries" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const leadId = randomUUID();
    const phone = parsed.data.phone?.trim() || null;

    await db.collection("club_volunteer_duty_leads").insertOne({
      leadId,
      clubId: club.clubId,
      clubSlug: club.clubSlug,
      displayName: parsed.data.displayName,
      email: parsed.data.email.toLowerCase(),
      phone,
      memberId: null,
      dutyKinds: parsed.data.dutyKinds,
      message: parsed.data.message?.trim() || null,
      notes: null,
      status: "lead",
      source: "pathway_web",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true, leadId }, { status: 201 });
  } catch (e) {
    console.error("POST volunteer-duty-interest error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
