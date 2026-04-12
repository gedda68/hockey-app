import clientPromise from "@/lib/mongodb";

export type PublicAssociationProfile = {
  associationId: string;
  code: string;
  name: string;
  fullName: string;
  region: string;
  state: string;
  country: string;
  level: number;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  } | null;
  website: string | null;
};

export async function getPublicAssociationById(
  associationId: string,
): Promise<PublicAssociationProfile | null> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const a = await db.collection("associations").findOne(
    { associationId },
    {
      projection: {
        associationId: 1,
        code: 1,
        name: 1,
        fullName: 1,
        region: 1,
        state: 1,
        country: 1,
        level: 1,
        status: 1,
        branding: 1,
        "contact.website": 1,
      },
    },
  );

  if (!a) return null;
  if (a.status === "inactive" || a.status === "suspended") return null;

  return {
    associationId: String(a.associationId),
    code: String(a.code ?? ""),
    name: String(a.name ?? ""),
    fullName: String(a.fullName ?? a.name ?? ""),
    region: String(a.region ?? ""),
    state: String(a.state ?? ""),
    country: String(a.country ?? ""),
    level: typeof a.level === "number" ? a.level : 0,
    branding: a.branding ?? null,
    website: a.contact?.website ? String(a.contact.website) : null,
  };
}
