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
  positions?: Array<{
    positionId: string;
    title: string;
    displayName?: string;
    description?: string;
    email?: string;
    phone?: string;
  }>;
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
        positions: 1,
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
    positions: Array.isArray(a.positions)
      ? a.positions
          .filter((p: any) => p && typeof p === "object" && p.isActive !== false)
          .map((p: any) => {
            const contact = p.contactPerson ?? null;
            const showEmail = contact?.showEmailOnPublicSite === true;
            const showPhone = contact?.showPhoneOnPublicSite === true;
            return {
              positionId: String(p.positionId ?? p.title ?? ""),
              title: String(p.title ?? p.displayName ?? ""),
              displayName:
                typeof p.displayName === "string" ? p.displayName : undefined,
              description:
                typeof p.description === "string" ? p.description : undefined,
              email:
                showEmail && typeof contact?.email === "string"
                  ? contact.email
                  : undefined,
              phone:
                showPhone && typeof contact?.phone === "string"
                  ? contact.phone
                  : undefined,
            };
          })
          .filter((p: any) => p.positionId && p.title)
      : undefined,
  };
}
