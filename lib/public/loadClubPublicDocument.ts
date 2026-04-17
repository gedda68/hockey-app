import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";

/**
 * Loads a club document the same way as `GET /api/clubs/[clubId]` (slug → id → legacy title).
 * Used for public layouts and SEO metadata without an HTTP self-fetch.
 */
export async function loadClubPublicDocumentByUrlKey(
  clubId: string,
): Promise<Record<string, unknown> | null> {
  const key = String(clubId ?? "").trim();
  if (!key) return null;

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  return (
    (await db.collection("clubs").findOne({ slug: key })) ??
    (await db.collection("clubs").findOne({ id: key })) ??
    (await db.collection("clubs").findOne({
      title: { $regex: new RegExp(`^${escapeRegex(key)}$`, "i") },
    }))
  );
}
