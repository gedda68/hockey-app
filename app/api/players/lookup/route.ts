// app/api/players/lookup/route.ts
// Public endpoint — find a player by first name + last name + date of birth.
// Returns only the fields needed for a public nomination flow (no sensitive admin data).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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

    // Case-insensitive name match + exact DOB
    const player = await db.collection("players").findOne({
      firstName: { $regex: `^${firstName}$`, $options: "i" },
      lastName: { $regex: `^${lastName}$`, $options: "i" },
      dateOfBirth: dob,
    });

    if (!player) {
      return NextResponse.json({ player: null });
    }

    // Return fields needed for nomination.
    // Emergency contacts and medical are returned so the player can confirm/update their own data.
    return NextResponse.json({
      player: {
        playerId: player.playerId,
        firstName: player.firstName,
        lastName: player.lastName,
        preferredName: player.preferredName ?? null,
        dateOfBirth: player.dateOfBirth,
        gender: player.gender ?? null,
        email: player.email ?? null,
        phone: player.phone ?? null,
        clubId: player.clubId ?? null,
        clubName: player.clubName ?? null,
        linkedMemberId: player.linkedMemberId ?? null,
        photo: player.photo ?? null,
        status: player.status?.current ?? "active",
        // Returned so the player can verify and update their own contact/medical details
        emergencyContacts: (player.emergencyContacts ?? []).map((c: any) => ({
          id: c.id ?? "",
          name: c.name ?? "",
          relationship: c.relationship ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
        })),
        medical: player.medical
          ? {
              conditions: player.medical.conditions ?? "",
              allergies: player.medical.allergies ?? "",
              medications: player.medical.medications ?? "",
              bloodType: player.medical.bloodType ?? "",
              doctorName: player.medical.doctorName ?? "",
              doctorPhone: player.medical.doctorPhone ?? "",
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/players/lookup error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
