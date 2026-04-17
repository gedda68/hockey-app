import type { MetadataRoute } from "next";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await requestMetadataBase();
  const sitemap = new URL("/sitemap.xml", base).href;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap,
  };
}
