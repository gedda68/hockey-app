import type { Metadata } from "next";
import Link from "next/link";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import {
  absolutizeOpenGraphUrl,
  canonicalFromPath,
} from "@/lib/seo/absolutizeMediaUrl";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const metadataBase = await requestMetadataBase();
  const canonical = canonicalFromPath("/news", metadataBase);
  const title = tenant ? `News | ${tenant.displayName}` : "News";
  const description = tenant
    ? `News and updates from ${tenant.displayName}.`
    : "News and updates from Brisbane Hockey Association.";

  const items = await getPublicNewsItems(1, tenant);
  const first = items[0];
  const ogImage = absolutizeOpenGraphUrl(
    first?.imageUrl || first?.image,
    metadataBase,
  );

  return {
    title: "News",
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage, alt: first?.title ?? "News" }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const items = await getPublicNewsItems(30, tenant);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <Link
            href="/"
            className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
          >
            ← Home
          </Link>
          <h1 className="mt-4 text-4xl font-black uppercase text-[#06054e] tracking-tight">
            News
          </h1>
          <p className="mt-2 text-slate-600">
            Updates and announcements from the association.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-slate-500">No published news at the moment.</p>
        ) : (
          <ul className="space-y-6">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-black text-slate-900">
                  <Link
                    href={`/news/${encodeURIComponent(item.id)}`}
                    className="hover:text-[#06054e] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-md"
                  >
                    {item.title}
                  </Link>
                </h2>
                <div className="mt-1 text-xs text-slate-500">
                  {item.publishDate
                    ? item.publishDate.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : null}
                  {item.author ? ` · ${item.author}` : ""}
                </div>
                {item.content && (
                  <p className="mt-3 text-slate-700 whitespace-pre-wrap line-clamp-6">
                    {item.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
                  </p>
                )}
                <div className="mt-4">
                  <Link
                    href={`/news/${encodeURIComponent(item.id)}`}
                    className="text-xs font-black uppercase text-[#06054e] hover:underline"
                  >
                    Read full article →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
