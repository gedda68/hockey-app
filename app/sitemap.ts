import type { MetadataRoute } from "next";
import clientPromise from "@/lib/mongodb";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import { loadPublicTenantFromIncomingHost } from "@/lib/tenant/serverTenant";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

const STATIC_PATHS = [
  "/",
  "/news",
  "/play",
  "/contact",
  "/about",
  "/competitions",
  "/competitions/matches",
  "/competitions/standings",
  "/competitions/events",
  "/competitions/statistics",
  "/competitions/this-round",
  "/competitions/leagues",
  "/tournaments",
  "/representative",
  "/officials",
  "/search",
  "/clubs",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const metadataBase = await requestMetadataBase();
  const origin = metadataBase.origin.replace(/\/$/, "");
  const tenant = await loadPublicTenantFromIncomingHost();

  const entries: MetadataRoute.Sitemap = [];

  const pushPath = (
    path: string,
    opts?: {
      lastModified?: Date;
      changeFrequency?: MetadataRoute.Sitemap[0]["changeFrequency"];
      priority?: number;
    },
  ) => {
    const url = path === "/" ? `${origin}/` : `${origin}${path}`;
    const priority =
      opts?.priority ?? (path === "/" ? 1 : 0.7);
    entries.push({
      url,
      lastModified: opts?.lastModified ?? new Date(),
      changeFrequency: opts?.changeFrequency ?? "weekly",
      priority,
    });
  };

  for (const p of STATIC_PATHS) {
    pushPath(p, { priority: p === "/" ? 1 : 0.65 });
  }

  const news = await getPublicNewsItems(500, tenant);
  for (const item of news) {
    pushPath(`/news/${encodeURIComponent(item.id)}`, {
      lastModified: item.publishDate ?? new Date(),
      changeFrequency: "monthly",
      priority: 0.55,
    });
  }

  if (tenant?.kind === "club" && tenant.pathSlug) {
    const slug = tenant.pathSlug.trim();
    if (slug) {
      pushPath(`/clubs/${encodeURIComponent(slug)}`, {
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }
  }

  if (!tenant) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.DB_NAME || "hockey-app");
      const clubs = await db
        .collection("clubs")
        .find(
          { slug: { $exists: true, $nin: [null, ""] } },
          { projection: { slug: 1, updatedAt: 1 }, limit: 2000 },
        )
        .toArray();

      for (const c of clubs) {
        const doc = c as { slug?: string; updatedAt?: unknown };
        const slug = String(doc.slug ?? "").trim();
        if (!slug) continue;
        const lm =
          doc.updatedAt instanceof Date ? doc.updatedAt : new Date();
        pushPath(`/clubs/${encodeURIComponent(slug)}`, {
          lastModified: lm,
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    } catch {
      /* ignore sitemap club enumeration failures */
    }
  }

  return entries;
}
