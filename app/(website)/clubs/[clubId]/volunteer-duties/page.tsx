import { notFound } from "next/navigation";
import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import { resolveClubByIdOrSlug } from "@/lib/volunteerDuty/resolveClub";
import VolunteerDutyInterestClient from "@/components/website/clubs/VolunteerDutyInterestClient";

export const dynamic = "force-dynamic";

function colorsFromClubRow(row: Record<string, unknown> | null | undefined) {
  const colors = (row?.colors ?? null) as Record<string, unknown> | null;
  const primary =
    String(colors?.primaryColor ?? colors?.primary ?? row?.color ?? "#06054e") ||
    "#06054e";
  const secondary =
    String(colors?.secondaryColor ?? colors?.secondary ?? row?.bgColor ?? "#0b0a3a") ||
    "#0b0a3a";
  return { primary, secondary };
}

export default async function ClubVolunteerDutiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const club = await resolveClubByIdOrSlug(db, clubId);
  if (!club) notFound();

  const row = await db.collection("clubs").findOne(
    { id: club.clubId },
    { projection: { active: 1, colors: 1, color: 1, bgColor: 1 } },
  );
  if (row?.active === false) notFound();

  if (tenant?.kind === "club" && tenant.id !== club.clubId) notFound();
  if (tenant?.kind === "association") {
    const full = await db.collection("clubs").findOne(
      { id: club.clubId },
      { projection: { associationId: 1, parentAssociationId: 1 } },
    );
    const owner =
      (full?.associationId ? String(full.associationId) : "") ||
      (full?.parentAssociationId ? String(full.parentAssociationId) : "");
    if (!owner || owner !== tenant.id) notFound();
  }

  const { primary, secondary } = colorsFromClubRow(
    row as Record<string, unknown> | null | undefined,
  );
  const hubHref = `/clubs/${encodeURIComponent(club.clubSlug)}`;

  return (
    <div
      className="min-h-screen px-4 pb-20 pt-8 md:px-8"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, #0b1220 100%)`,
      }}
    >
      <div className="mx-auto max-w-2xl">
        <Link
          href={hubHref}
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← {club.name}
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          Volunteer duties
        </h1>
        <p className="mt-2 text-sm font-semibold text-white/70">
          Game-day help at {club.name} — not the umpire register.
        </p>

        <div className="mt-8">
          <VolunteerDutyInterestClient
            clubName={club.name}
            clubSlug={club.clubSlug}
            apiClubRef={club.clubSlug}
            hubHref={hubHref}
          />
        </div>
      </div>
    </div>
  );
}
