import Link from "next/link";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import {
  getPublicNewsFlowdownForClub,
  serializeNewsFlowdown,
} from "@/lib/data/newsFlowdown";
import NewsFlowdownModal from "@/components/website/news/NewsFlowdownModal";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import { sanitizeCommitteeForPublic } from "@/lib/portal/publicContacts";
import MyFixturesStrip from "@/components/matches/MyFixturesStrip";

type PublicClub = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  logo?: string;
  iconSrc?: string;
  portalSlug?: string;
  associationId?: string;
  parentAssociationId?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  committee?: unknown;
};

async function getClubForHub(clubIdOrSlug: string): Promise<PublicClub | null> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const club =
    (await db.collection("clubs").findOne(
      { slug: clubIdOrSlug },
      {
        projection: {
          id: 1,
          slug: 1,
          name: 1,
          title: 1,
          shortName: 1,
          logo: 1,
          iconSrc: 1,
          portalSlug: 1,
          associationId: 1,
          parentAssociationId: 1,
          colors: 1,
          committee: 1,
        },
      },
    )) ??
    (await db.collection("clubs").findOne(
      { id: clubIdOrSlug },
      {
        projection: {
          id: 1,
          slug: 1,
          name: 1,
          title: 1,
          shortName: 1,
          logo: 1,
          iconSrc: 1,
          portalSlug: 1,
          associationId: 1,
          parentAssociationId: 1,
          colors: 1,
          committee: 1,
        },
      },
    ));

  if (!club) return null;
  const id = String(club.id ?? "");
  const slug = String(club.slug ?? id).trim();
  const name = String(club.name ?? club.title ?? "").trim();
  if (!slug || !name) return null;
  return {
    id,
    slug,
    name,
    shortName: club.shortName ? String(club.shortName) : undefined,
    logo: club.logo ? String(club.logo) : undefined,
    iconSrc: club.iconSrc ? String(club.iconSrc) : undefined,
    portalSlug: club.portalSlug ? String(club.portalSlug) : undefined,
    associationId: club.associationId ? String(club.associationId) : undefined,
    parentAssociationId: club.parentAssociationId
      ? String(club.parentAssociationId)
      : undefined,
    colors: (club.colors ?? undefined) as PublicClub["colors"],
    committee: club.committee ?? null,
  };
}

function clubPrimary(club: PublicClub): string {
  return (
    club.colors?.primaryColor ||
    club.colors?.primary ||
    "#06054e"
  );
}

function clubSecondary(club: PublicClub): string {
  return (
    club.colors?.secondaryColor ||
    club.colors?.secondary ||
    "#0b0a3a"
  );
}

export default async function ClubHubView({
  clubId,
  tenant,
}: {
  clubId: string;
  tenant: PublicTenantPayload | null;
}) {
  const club = await getClubForHub(clubId);
  if (!club) notFound();

  // Tenant isolation: club portal must match club; association portal must own the club.
  if (tenant?.kind === "club" && tenant.id !== club.id) notFound();
  if (tenant?.kind === "association") {
    const owner = club.associationId ?? club.parentAssociationId ?? "";
    if (!owner || owner !== tenant.id) notFound();
  }

  const newsFlow = serializeNewsFlowdown(
    await getPublicNewsFlowdownForClub(club.id, { perSectionLimit: 10 }),
  );
  const committee = sanitizeCommitteeForPublic(club.committee);
  const primary = clubPrimary(club);
  const secondary = clubSecondary(club);

  return (
    <div
      className="min-h-screen px-4 pb-20 pt-8 md:px-8"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, #0b1220 100%)`,
      }}
    >
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          {club.name}
        </h1>
        {club.shortName ? (
          <p className="mt-2 text-sm text-white/70">{club.shortName}</p>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/clubs/${encodeURIComponent(club.slug)}/teams`}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-yellow-400/30"
          >
            Teams →
          </Link>
          <Link
            href={`/clubs/${encodeURIComponent(club.slug)}/register`}
            className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 font-black text-yellow-100 hover:bg-yellow-400/15"
          >
            Join / Register →
          </Link>
          <Link
            href={`/clubs/${encodeURIComponent(club.slug)}/contact`}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-sky-400/30"
          >
            Contact →
          </Link>
          <Link
            href="/news"
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-emerald-400/30"
          >
            News →
          </Link>
        </div>

        <MyFixturesStrip scope={{ clubId: club.id }} title="My fixtures" />

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
              News
            </h2>
            <Link
              href="/news"
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              News index →
            </Link>
          </div>
          <p className="mt-2 text-xs text-white/55">
            This club first, then news from your parent association and further ancestors (up to
            the root) that flow down the tree — not sibling clubs or bodies. Tap a headline for
            the full story.
          </p>
          <div className="mt-4">
            <NewsFlowdownModal sections={newsFlow.sections} variant="dark" />
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-200">
              Committee & contacts
            </h2>
            <Link
              href={`/clubs/${encodeURIComponent(club.slug)}/contact`}
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              Contact page →
            </Link>
          </div>
          {committee.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">
              No public committee contacts available yet.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {committee.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <div className="font-black">{m.name}</div>
                  {m.position ? (
                    <div className="text-xs text-white/60">{m.position}</div>
                  ) : null}
                  <div className="mt-2 space-y-1 text-sm text-white/80">
                    {m.email ? (
                      <a className="hover:underline" href={`mailto:${m.email}`}>
                        {m.email}
                      </a>
                    ) : null}
                    {m.phone ? (
                      <a className="hover:underline" href={`tel:${m.phone}`}>
                        {m.phone}
                      </a>
                    ) : null}
                    {!m.email && !m.phone ? (
                      <span className="text-white/50 text-xs">
                        Contact details not published.
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

