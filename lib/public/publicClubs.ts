import clientPromise from "@/lib/mongodb";

export type PublicClubSummary = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
};

export async function listPublicClubsByAssociation(
  associationId: string,
  opts?: { limit?: number },
): Promise<PublicClubSummary[]> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const rows = await db
    .collection("clubs")
    .find(
      {
        active: true,
        $or: [{ associationId }, { parentAssociationId: associationId }],
      },
      {
        projection: {
          id: 1,
          slug: 1,
          name: 1,
          title: 1,
          shortName: 1,
          abbreviation: 1,
          logo: 1,
          iconSrc: 1,
          icon: 1,
          colors: 1,
        },
      },
    )
    .sort({ name: 1, title: 1, shortName: 1 })
    .limit(Math.max(1, Math.min(120, opts?.limit ?? 24)))
    .toArray();

  const out: PublicClubSummary[] = [];
  for (const c of rows) {
    const id = String(c.id ?? "").trim();
    const slug = String(c.slug ?? id).trim();
    const name = String(c.name ?? c.title ?? "").trim();
    if (!id || !slug || !name) continue;
    const shortName = String(c.shortName ?? c.abbreviation ?? "").trim();
    const logo =
      (typeof c.logo === "string" && c.logo) ||
      (typeof c.iconSrc === "string" && c.iconSrc) ||
      (typeof c.icon === "string" && c.icon) ||
      undefined;
    out.push({
      id,
      slug,
      name,
      shortName: shortName || undefined,
      logo,
      colors: (c.colors ?? undefined) as PublicClubSummary["colors"],
    });
  }
  return out;
}

