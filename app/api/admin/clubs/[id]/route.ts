import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

// Helper to match the club by ID or Slug
function matchesClub(c: any, id: string) {
  const cid = c?.id ? String(c.id) : "";
  const cslug = c?.slug ? String(c.slug) : "";
  return cid === id || cslug === id;
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/admin/clubs`, { cache: "no-store" });

  if (!res.ok)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });

  const clubs = await res.json();
  const club = Array.isArray(clubs)
    ? clubs.find((c: any) => matchesClub(c, id))
    : null;

  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(club);
}

// THIS IS THE MISSING PIECE CAUSING THE 405 ERROR
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();
  const origin = new URL(req.url).origin;

  // We forward the PUT request to the main /api/admin/clubs endpoint
  // which likely handles the actual file writing/database logic.
  try {
    const res = await fetch(`${origin}/api/admin/clubs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, id }), // Ensure the ID stays consistent
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(errorData, { status: res.status });
    }

    const updatedClub = await res.json();
    return NextResponse.json(updatedClub);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
