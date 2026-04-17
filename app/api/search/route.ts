import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";
import { getPublicTenantFromRequest } from "@/lib/tenant/requestTenant";
import { publicNewsMongoFilter } from "@/lib/portal/newsScope";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

export const dynamic = "force-dynamic";

type SearchResult = {
  kind: "news" | "club" | "team";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

async function resolveAllowedClubIds(
  tenant: PublicTenantPayload | null,
): Promise<string[] | null> {
  if (!tenant) return null; // apex → all clubs
  if (tenant.kind === "club") return [tenant.id];

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const rows = await db
    .collection("clubs")
    .find(
      {
        active: true,
        $or: [{ associationId: tenant.id }, { parentAssociationId: tenant.id }],
      },
      { projection: { id: 1 } },
    )
    .toArray();
  return rows
    .map((r) => (typeof r.id === "string" ? r.id : ""))
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = String(searchParams.get("q") ?? "").trim();
    const q = qRaw.length > 80 ? qRaw.slice(0, 80) : qRaw;
    if (q.length < 2) {
      return NextResponse.json({ q, results: [] as SearchResult[] });
    }

    const tenant = await getPublicTenantFromRequest(request);
    const allowedClubIds = await resolveAllowedClubIds(tenant);
    if (tenant?.kind === "association" && allowedClubIds && allowedClubIds.length === 0) {
      return NextResponse.json({ q, results: [] as SearchResult[] });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const re = new RegExp(escapeRegex(q), "i");
    const now = new Date();

    const [newsRows, clubRows, teamRows] = await Promise.all([
      db
        .collection("news")
        .find({
          ...publicNewsMongoFilter(tenant),
          active: true,
          publishDate: { $lte: now },
          expiryDate: { $gte: now },
          $or: [{ title: { $regex: re } }, { content: { $regex: re } }],
        })
        .sort({ publishDate: -1 })
        .limit(10)
        .project({ id: 1, title: 1, publishDate: 1, author: 1 })
        .toArray(),
      db
        .collection("clubs")
        .find(
          {
            active: true,
            ...(allowedClubIds ? { id: { $in: allowedClubIds } } : {}),
            $or: [
              { name: { $regex: re } },
              { title: { $regex: re } },
              { shortName: { $regex: re } },
              { abbreviation: { $regex: re } },
              { slug: { $regex: re } },
            ],
          },
          { projection: { id: 1, slug: 1, name: 1, title: 1, shortName: 1, abbreviation: 1 } },
        )
        .sort({ name: 1, title: 1 })
        .limit(12)
        .toArray(),
      db
        .collection("teams")
        .find(
          {
            ...(allowedClubIds ? { clubId: { $in: allowedClubIds } } : {}),
            status: { $in: ["active", "inactive"] },
            $or: [{ name: { $regex: re } }, { displayName: { $regex: re } }, { teamId: { $regex: re } }],
          },
          { projection: { teamId: 1, clubId: 1, name: 1, displayName: 1, ageCategory: 1 } },
        )
        .sort({ displayName: 1, name: 1 })
        .limit(20)
        .toArray(),
    ]);

    const clubIdSet = new Set<string>();
    for (const t of teamRows) {
      if (typeof t.clubId === "string" && t.clubId.trim()) clubIdSet.add(t.clubId.trim());
    }

    const clubsForTeams =
      clubIdSet.size > 0
        ? await db
            .collection("clubs")
            .find({ id: { $in: [...clubIdSet] } }, { projection: { id: 1, name: 1, title: 1, slug: 1 } })
            .toArray()
        : [];
    const clubLabelById = new Map<string, { name: string; slug: string }>();
    for (const c of clubsForTeams) {
      const id = typeof c.id === "string" ? c.id : "";
      const slug = typeof c.slug === "string" ? c.slug : id;
      const name = String(c.name ?? c.title ?? "").trim();
      if (id && name) clubLabelById.set(id, { name, slug });
    }

    const results: SearchResult[] = [];

    for (const n of newsRows) {
      const id = String(n.id ?? n._id ?? "").trim();
      const title = String(n.title ?? "").trim();
      if (!id || !title) continue;
      const author = typeof n.author === "string" ? n.author.trim() : "";
      const d = n.publishDate instanceof Date ? n.publishDate.toLocaleDateString("en-AU") : "";
      results.push({
        kind: "news",
        id,
        title,
        subtitle: [author, d].filter(Boolean).join(" · ") || undefined,
        href: "/news",
      });
    }

    for (const c of clubRows) {
      const id = String(c.id ?? "").trim();
      const slug = String(c.slug ?? id).trim();
      const name = String(c.name ?? c.title ?? "").trim();
      if (!id || !slug || !name) continue;
      const shortName = String(c.shortName ?? c.abbreviation ?? "").trim();
      results.push({
        kind: "club",
        id,
        title: name,
        subtitle: shortName || undefined,
        href: `/clubs/${encodeURIComponent(slug)}`,
      });
    }

    for (const t of teamRows) {
      const teamId = String(t.teamId ?? "").trim();
      const clubId = typeof t.clubId === "string" ? t.clubId.trim() : "";
      if (!teamId || !clubId) continue;
      const club = clubLabelById.get(clubId);
      if (!club) continue;
      const title = String(t.displayName ?? t.name ?? teamId).trim();
      const age = typeof t.ageCategory === "string" ? t.ageCategory : "";
      results.push({
        kind: "team",
        id: teamId,
        title,
        subtitle: [club.name, age].filter(Boolean).join(" · ") || undefined,
        href: `/clubs/${encodeURIComponent(club.slug)}/teams`,
      });
    }

    return NextResponse.json({ q, tenant, results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

