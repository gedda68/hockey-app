/** GET/POST /api/public/rsvp/<token> → the page behind the email link. The token is the person's own invitation. */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { answerInvite, describeInvite } from "@/lib/rsvp/respond";

type Ctx = { params: Promise<{ token: string }> };
const valid = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t);

export async function GET(_r: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { token } = await params;
  if (!valid(token)) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });
  const d = await describeInvite(await getDatabase(), { token });
  return d ? NextResponse.json({ request: d }) : NextResponse.json({ error: "This link isn't valid any more" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { token } = await params;
  if (!valid(token)) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const r = await answerInvite(await getDatabase(), { token }, body, "link");
  return r.ok ? NextResponse.json({ ok: true, answer: r.answer }) : NextResponse.json({ error: r.error }, { status: r.status });
}
