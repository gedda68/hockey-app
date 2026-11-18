// GET /api/public/school-suggestions?type=school|district&q=kel — names others have already entered, to keep spelling consistent.
// Only school and district names are returned; nothing about any person.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") === "district" ? "district" : "name";
    const q = String(request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
    if (q.length < 2) return NextResponse.json({ suggestions: [] });
    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const field = `personalInfo.school.${type}`;
    const rows = await db.collection("members").aggregate([
      { $match: { [field]: { $regex: esc(q), $options: "i" } } },
      { $group: { _id: { $toLower: `$${field}` }, name: { $first: `$${field}` }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
    ]).toArray();
    return NextResponse.json({ suggestions: rows.map((r) => String(r.name)) });
  } catch (e) {
    console.error("school suggestions error:", e);
    return NextResponse.json({ suggestions: [] });
  }
}
