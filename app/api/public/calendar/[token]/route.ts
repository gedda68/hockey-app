// GET /api/public/calendar/<token>.ics — a member's (or child's) matches, training and duties as an iCalendar feed
// for Google, Apple or Outlook calendars to subscribe to. The long random link is the key: anyone who has it can read
// the calendar, and the person it belongs to can replace or stop it at any time.

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { renderFeed } from "@/lib/calendar/service";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { token } = await params;
    const db = await getDatabase();
    const body = await renderFeed(db, token, { origin: request.nextUrl.origin });
    if (!body) return new NextResponse("Calendar not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    return new NextResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="hockey.ics"', "Cache-Control": "private, max-age=300", "X-Robots-Tag": "noindex" } });
  } catch (e) {
    console.error("calendar feed error:", e);
    return new NextResponse("Calendar unavailable", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
