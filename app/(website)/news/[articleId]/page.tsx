import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicNewsAttachmentsWrapper from "@/components/news/PublicNewsAttachmentsWrapper";
import { getPublicNewsItemById } from "@/lib/data/publicNews";
import {
  absolutizeOpenGraphUrl,
  canonicalFromPath,
} from "@/lib/seo/absolutizeMediaUrl";
import { plainTextExcerpt } from "@/lib/seo/plainTextExcerpt";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";
import { sanitizeHtml } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ articleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { articleId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const item = await getPublicNewsItemById(articleId, tenant);
  const metadataBase = await requestMetadataBase();

  if (!item) {
    return { title: "News" };
  }

  const path = `/news/${encodeURIComponent(articleId)}`;
  const canonical = canonicalFromPath(path, metadataBase);
  const description =
    plainTextExcerpt(item.content) ??
    `${item.title} — ${tenant?.displayName ?? "News"}.`;
  const ogImage = absolutizeOpenGraphUrl(
    item.imageUrl || item.image,
    metadataBase,
  );

  return {
    title: item.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: item.title,
      description,
      url: canonical,
      publishedTime: item.publishDate?.toISOString(),
      images: ogImage ? [{ url: ogImage, alt: item.title }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: item.title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function NewsArticlePage({ params, searchParams }: Props) {
  const { articleId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const item = await getPublicNewsItemById(articleId, tenant);

  if (!item) notFound();

  const metadataBase = await requestMetadataBase();
  const hero = absolutizeOpenGraphUrl(
    item.imageUrl || item.image,
    metadataBase,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/news"
          className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
        >
          ← All news
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl md:text-4xl font-black uppercase text-[#06054e] tracking-tight">
            {item.title}
          </h1>
          <div className="mt-2 text-sm text-slate-500">
            {item.publishDate
              ? item.publishDate.toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : null}
            {item.author ? ` · ${item.author}` : ""}
          </div>
        </header>

        {hero && (
          <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src={hero}
              alt={item.title}
              width={1200}
              height={630}
              className="w-full h-auto object-cover max-h-[480px]"
              priority
            />
          </div>
        )}

        <div className="mt-8">
          <PublicNewsAttachmentsWrapper
            item={item}
            heroImageUrl={item.imageUrl || item.image}
          />
        </div>

        {item.content ? (
          <div
            className="prose prose-slate max-w-none mt-8 [&>p]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-3 [&>ol]:mb-3"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(item.content),
            }}
          />
        ) : null}
      </article>
    </div>
  );
}
