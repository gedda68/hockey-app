import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { userId, relatedUserId, relationTypeId, isEmergency } =
      await req.json();
    const client = await clientPromise;
    const db = client.db("hockey-app");

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: {
          relationships: {
            relatedUserId: new ObjectId(relatedUserId),
            relationTypeId,
            isEmergencyContact: isEmergency,
          },
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
