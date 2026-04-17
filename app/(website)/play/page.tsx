import Link from "next/link";
import { headers } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { isLocalDevHostname, resolvePortalSlugForRequest } from "@/lib/tenant/portalHost";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import {
  buildPathwaysCards,
  type PathwaysTenantContext,
} from "@/lib/website/pathwaysCards";
import PathwaysGrid from "@/components/website/pathways/PathwaysGrid";

export const dynamic = "force-dynamic";

export default async function PlayPathwaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const queryPortal = typeof sp.portal === "string" ? sp.portal : null;
  const portalParam =
    queryPortal?.trim() && isLocalDevHostname(host) ? queryPortal.trim() : null;

  let ctx: PathwaysTenantContext = { kind: "platform" };

  if (tenant?.kind === "association") {
    ctx = {
      kind: "association",
      associationId: tenant.id,
      associationName: tenant.displayName,
    };
  } else if (tenant?.kind === "club") {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const seg = String(tenant.pathSlug ?? tenant.portalSlug ?? "").trim();
    const club =
      (await db.collection("clubs").findOne(
        { slug: seg },
        { projection: { id: 1, slug: 1, name: 1, title: 1 } },
      )) ??
      (await db.collection("clubs").findOne(
        { id: tenant.id },
        { projection: { id: 1, slug: 1, name: 1, title: 1 } },
      ));
    if (club) {
      const id = String((club as { id?: string }).id ?? tenant.id).trim();
      const slug = String((club as { slug?: string }).slug ?? seg).trim();
      const name = String(
        (club as { name?: string; title?: string }).name ??
          (club as { title?: string }).title ??
          tenant.displayName,
      ).trim();
      if (id && slug) {
        ctx = { kind: "club", clubId: id, clubSlug: slug, clubName: name || tenant.displayName };
      }
    }
  }

  const cards = buildPathwaysCards(ctx, portalParam);
  const slugForLinks = resolvePortalSlugForRequest(host, queryPortal);
  const tenantLabel =
    ctx.kind === "club"
      ? ctx.clubName
      : ctx.kind === "association"
        ? ctx.associationName
        : "Brisbane Hockey";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06054e] via-[#12106e] to-[#0b1220] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200/90">
          Pathways
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight sm:text-4xl">
          Play, coach, umpire, volunteer
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">
          {ctx.kind === "platform"
            ? "Start here on the public site: register with a club, or sign in to request a role. Links below adapt when you open this page on an association or club portal."
            : `You are browsing as ${tenantLabel}. Shortcuts below point at this organisation’s registration and role-request flows.`}
        </p>
        {slugForLinks ? (
          <p className="mt-3 text-xs text-white/50">
            Portal: <span className="font-mono text-white/70">{slugForLinks}</span>
          </p>
        ) : null}

        <div className="mt-10">
          <PathwaysGrid
            cards={cards}
            variant="dark"
            intro="Registration opens your club’s season forms. Coach, umpire, and volunteer paths use My registrations (same workflow as fees and renewals)."
          />
        </div>

        <p className="mt-10 text-center text-xs text-white/50">
          <Link href="/" className="text-sky-300 hover:underline">
            ← Home
          </Link>
          {" · "}
          <Link href="/competitions" className="text-sky-300 hover:underline">
            Match day
          </Link>
        </p>
      </div>
    </div>
  );
}
