import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import { buildCelebrationsForMember } from "@/lib/celebrations/celebrationsService";

export async function GET() {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json({ error: "Member session required" }, { status: 401 });
  }
  const db = await getDatabase();
  const alerts = await buildCelebrationsForMember(db, session.memberId);
  return NextResponse.json({ alerts });
}

