// app/api/uploadthing/route.ts
// Uploadthing is not yet installed. This stub prevents build errors.
// To enable: npm install uploadthing @uploadthing/react, add env vars, then
// replace this file with the full implementation.

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ error: "Uploadthing not configured" }, { status: 501 });
}

export function POST() {
  return NextResponse.json({ error: "Uploadthing not configured" }, { status: 501 });
}
