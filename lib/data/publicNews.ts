import clientPromise from "@/lib/mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import { publicNewsMongoFilter } from "@/lib/portal/newsScope";

export type PublicNewsItem = {
  id: string;
  title: string;
  content?: string;
  image?: string;
  imageUrl?: string;
  publishDate?: Date;
  author?: string;
};

export async function getPublicNewsItems(
  limit = 6,
  tenant: PublicTenantPayload | null = null,
): Promise<PublicNewsItem[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const now = new Date();
    const scope = publicNewsMongoFilter(tenant);
    const rows = await db
      .collection("news")
      .find({
        ...scope,
        active: true,
        publishDate: { $lte: now },
        expiryDate: { $gte: now },
      })
      .sort({ publishDate: -1 })
      .limit(limit)
      .project({
        title: 1,
        content: 1,
        image: 1,
        imageUrl: 1,
        publishDate: 1,
        author: 1,
        id: 1,
      })
      .toArray();

    return rows.map((item) => ({
      id: String(item.id ?? item._id),
      title: String(item.title ?? ""),
      content: item.content ? String(item.content) : undefined,
      image: item.image ? String(item.image) : undefined,
      imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      publishDate: item.publishDate instanceof Date ? item.publishDate : undefined,
      author: item.author ? String(item.author) : undefined,
    }));
  } catch {
    return [];
  }
}
