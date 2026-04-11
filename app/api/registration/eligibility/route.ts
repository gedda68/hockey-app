// POST /api/registration/eligibility
// Epic H2: returning vs transfer hints, registration / transfer windows, insurance & clearance flags.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { computeRegistrationEligibility } from "@/lib/registration/registrationEligibility";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clubId, seasonYear, memberId, email } = body as Record<
      string,
      string | undefined
    >;

    if (!clubId || !seasonYear) {
      return NextResponse.json(
        { error: "Missing required fields: clubId, seasonYear" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const snapshot = await computeRegistrationEligibility(db, {
      clubId,
      seasonYear,
      memberId: memberId || undefined,
      email: email || undefined,
    });

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Club not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message === "Club has no parent association" ||
      message === "Parent association not found"
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("POST /api/registration/eligibility error:", error);
    return NextResponse.json(
      { error: "Failed to compute eligibility", details: message },
      { status: 500 },
    );
  }
}
