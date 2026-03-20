// app/api/admin/clubs/[id]/fees/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
}

interface FeesStructure {
  [key: string]: FeeItem[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const club = await db
      .collection("clubs")
      .findOne({ $or: [{ slug: id }, { id }] });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const fees: FeesStructure = club.fees || {};
    return NextResponse.json({ fees });
  } catch (error) {
    console.error("GET /api/admin/clubs/[id]/fees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const fees: FeesStructure = body.fees;

    if (!fees || typeof fees !== "object") {
      return NextResponse.json({ error: "Invalid fees data" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const result = await db.collection("clubs").updateOne(
      { $or: [{ slug: id }, { id }] },
      { $set: { fees, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/admin/clubs/[id]/fees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
