import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const rosters = await db.collection("rosters").find({}).toArray();

    for (const roster of rosters) {
      const keys = { ageGroup: roster.ageGroup, season: roster.season };

      // Split into 5 distinct collections
      if (roster.trialInfo)
        await db
          .collection("trials")
          .updateOne(keys, { $set: roster.trialInfo }, { upsert: true });
      if (roster.trainingInfo)
        await db
          .collection("training")
          .updateOne(keys, { $set: roster.trainingInfo }, { upsert: true });
      if (roster.tournamentInfo)
        await db
          .collection("tournaments")
          .updateOne(keys, { $set: roster.tournamentInfo }, { upsert: true });

      // Create empty placeholders for Registration and Nominations if they don't exist
      await db
        .collection("registrations")
        .updateOne(
          keys,
          { $setOnInsert: { status: "Closed" } },
          { upsert: true }
        );
      await db
        .collection("nominations")
        .updateOne(keys, { $setOnInsert: { list: [] } }, { upsert: true });

      // Clean the original roster
      await db
        .collection("rosters")
        .updateOne(
          { _id: roster._id },
          { $unset: { trialInfo: "", trainingInfo: "", tournamentInfo: "" } }
        );
    }
    return NextResponse.json({ message: "Migration successful" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
