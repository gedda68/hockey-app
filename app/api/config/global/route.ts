import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const [roles, genders, relTypes, clubs] = await Promise.all([
      db.collection("config").find().toArray(),
      //  db.collection("config_genders").find().toArray(),
      db.collection("config_relationships").find().toArray(),
      db.collection("clubs").find().project({ name: 1, id: 1 }).toArray(),
    ]);

    return NextResponse.json({ roles, genders, relTypes, clubs });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
