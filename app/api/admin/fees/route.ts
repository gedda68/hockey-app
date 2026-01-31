//api/admin/fees/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const { ownerType, ownerId, fees } = await req.json();

  const client = await clientPromise;
  const db = client.db();

  const collection = ownerType === "association" ? "associations" : "clubs";

  await db
    .collection(collection)
    .updateOne({ associationId: ownerId, clubId: ownerId }, { $set: { fees } });

  return NextResponse.json({ success: true });
}
