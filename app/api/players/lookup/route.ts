// app/api/players/lookup/route.ts
// Public endpoint — find a player by first name + last name + date of birth.
// Returns only the fields needed for a public nomination flow (no sensitive admin data).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firstName = (searchParams.get("firstName") ?? "").trim();
    const lastName = (searchParams.get("lastName") ?? "").trim();
    const dob = (searchParams.get("dob") ?? "").trim(); // YYYY-MM-DD

    if (!firstName || !lastName || !dob) {
      return NextResponse.json(
        { error: "firstName, lastName and dob are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Case-insensitive name match + exact DOB — query members collection
    const member = await db.collection("members").findOne({
      "personalInfo.firstName": { $regex: `^${escapeRegex(firstName)}$`, $options: "i" },
      "personalInfo.lastName":  { $regex: `^${escapeRegex(lastName)}$`,  $options: "i" },
      "personalInfo.dateOfBirth": dob,
    });

    if (!member) {
      return NextResponse.json({ player: null });
    }

    const pi = member.personalInfo ?? {};
    const ct = member.contact ?? {};

    // Return fields needed for nomination.
    return NextResponse.json({
      player: {
        playerId:       member.memberId,
        memberId:       member.memberId,
        firstName:      pi.firstName ?? null,
        lastName:       pi.lastName ?? null,
        preferredName:  pi.preferredName ?? null,
        dateOfBirth:    pi.dateOfBirth ?? null,
        gender:         pi.gender ?? null,
        email:          ct.primaryEmail ?? null,
        phone:          ct.primaryPhone ?? null,
        clubId:         member.membership?.clubId ?? null,
        clubName:       member.membership?.clubName ?? null,
        linkedMemberId: member.memberId,
        photo:          pi.photo ?? null,
        status:         member.membership?.status?.toLowerCase() ?? "active",
        emergencyContacts: (member.emergencyContacts ?? []).map((c: Record<string, any>) => ({
          id:           c.id ?? "",
          name:         c.name ?? "",
          relationship: c.relationship ?? "",
          phone:        c.phone ?? "",
          email:        c.email ?? "",
        })),
        medical: member.medical
          ? {
              conditions:  member.medical.conditions  ?? "",
              allergies:   member.medical.allergies   ?? "",
              medications: member.medical.medications ?? "",
              bloodType:   member.medical.bloodType   ?? "",
              doctorName:  member.medical.doctorName  ?? "",
              doctorPhone: member.medical.doctorPhone ?? "",
            }
          : null,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/players/lookup error:", error);
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 },
    );
  }
}
