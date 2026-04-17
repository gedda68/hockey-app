import type { Db } from "mongodb";
import type { Filter } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import {
  publicNewsMongoFilter,
  publicNewsMongoFilterForAssociationHub,
} from "@/lib/portal/newsScope";

export type PublicNewsItem = {
  id: string;
  title: string;
  content?: string;
  image?: string;
  imageUrl?: string;
  publishDate?: Date;
  author?: string;
};

function mapNewsRow(item: Record<string, unknown>): PublicNewsItem {
  return {
    id: String(item.id ?? item._id),
    title: String(item.title ?? ""),
    content: item.content ? String(item.content) : undefined,
    image: item.image ? String(item.image) : undefined,
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    publishDate: item.publishDate instanceof Date ? item.publishDate : undefined,
    author: item.author ? String(item.author) : undefined,
  };
}

export async function queryActiveNews(
  db: Db,
  scope: Filter<Record<string, unknown>>,
  limit: number,
): Promise<PublicNewsItem[]> {
  const now = new Date();
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

  return rows.map((item) => mapNewsRow(item as Record<string, unknown>));
}

export async function getPublicNewsItems(
  limit = 6,
  tenant: PublicTenantPayload | null = null,
): Promise<PublicNewsItem[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const scope = publicNewsMongoFilter(tenant);
    return await queryActiveNews(db, scope, limit);
  } catch {
    return [];
  }
}

/** Association hub: always scope news to this association (`scopeType` / `scopeId`), not the request host alone. */
export async function getPublicNewsItemsForAssociationHub(
  limit: number,
  associationId: string,
): Promise<PublicNewsItem[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const scope = publicNewsMongoFilterForAssociationHub(associationId);
    return await queryActiveNews(db, scope, limit);
  } catch {
    return [];
  }
}
