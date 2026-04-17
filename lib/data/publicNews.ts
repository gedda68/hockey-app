import type { Db, Filter } from "mongodb";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import {
  publicNewsMongoFilter,
  publicNewsMongoFilterForAssociationHub,
} from "@/lib/portal/newsScope";
import type { NewsAttachment } from "@/types/news";

export type PublicNewsItem = {
  id: string;
  title: string;
  content?: string;
  image?: string;
  imageUrl?: string;
  videoUrl?: string;
  attachments?: NewsAttachment[];
  publishDate?: Date;
  author?: string;
};

function mapNewsRow(item: Record<string, unknown>): PublicNewsItem {
  const attachments = Array.isArray(item.attachments)
    ? (item.attachments as NewsAttachment[])
    : undefined;
  return {
    id: String(item.id ?? item._id),
    title: String(item.title ?? ""),
    content: item.content ? String(item.content) : undefined,
    image: item.image ? String(item.image) : undefined,
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    videoUrl: item.videoUrl ? String(item.videoUrl) : undefined,
    attachments,
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
      videoUrl: 1,
      attachments: 1,
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
/** Single published news row visible for this tenant (or platform on apex). */
export async function getPublicNewsItemById(
  articleId: string,
  tenant: PublicTenantPayload | null,
): Promise<PublicNewsItem | null> {
  const id = String(articleId ?? "").trim();
  if (!id) return null;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const scope = publicNewsMongoFilter(tenant);
    const now = new Date();

    const idMatch: Filter<Record<string, unknown>>[] = [{ id }];
    if (ObjectId.isValid(id)) {
      try {
        idMatch.push({ _id: new ObjectId(id) });
      } catch {
        /* ignore invalid ObjectId construction */
      }
    }

    const row = await db.collection("news").findOne(
      {
        ...scope,
        active: true,
        publishDate: { $lte: now },
        expiryDate: { $gte: now },
        $or: idMatch,
      },
      {
        projection: {
          title: 1,
          content: 1,
          image: 1,
          imageUrl: 1,
          videoUrl: 1,
          attachments: 1,
          publishDate: 1,
          author: 1,
          id: 1,
        },
      },
    );

    if (!row) return null;
    return mapNewsRow(row as Record<string, unknown>);
  } catch {
    return null;
  }
}

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
