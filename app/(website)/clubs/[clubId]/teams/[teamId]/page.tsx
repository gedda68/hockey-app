// app/(website)/clubs/[clubId]/teams/[teamId]/page.tsx
// A club team on its own page: coaching staff, latest team sheet and everyone
// who has played / is registered this season. Linked from the Coaches and
// Teams pages. Editing the team lives at ./manage.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import clientPromise from "@/lib/mongodb";
import { getClubTeamsOverview, resolveClub, TEAM_CATEGORY_LABEL } from "@/lib/clubs/clubPortalData";
import ClubTeamCard from "@/components/clubs/ClubTeamCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubId: string; teamId: string }>;
}

const dbName = () => process.env.DB_NAME?.trim() || "hockey-app";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamId } = await params;
  try {
    const team = await (await clientPromise)
      .db(dbName())
      .collection("teams")
      .findOne({ teamId }, { projection: { displayName: 1, name: 1, season: 1 } });
    const label = String(team?.displayName || team?.name || "Team");
    return { title: `${label}${team?.season ? ` (${team.season})` : ""} | Club team` };
  } catch {
    return { title: "Team" };
  }
}

export default async function ClubTeamPage({ params }: PageProps) {
  const { clubId, teamId } = await params;
  const db = (await clientPromise).db(dbName());
  const club = await resolveClub(db, clubId);
  if (!club) notFound();

  const { teams } = await getClubTeamsOverview(db, club, { teamId: decodeURIComponent(teamId) });
  const team = teams[0];
  if (!team) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500">
          <Link href={`/clubs/${clubId}/teams${team.season ? `?season=${encodeURIComponent(team.season)}` : ""}`} className="inline-flex items-center gap-1.5 hover:text-[#06054e]">
            <ArrowLeft size={16} /> All teams
          </Link>
          <Link href={`/clubs/${clubId}/coaches`} className="hover:text-[#06054e]">
            Coaches
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
            {TEAM_CATEGORY_LABEL[team.category]}
          </span>
          <Link
            href={`/clubs/${clubId}/teams/${encodeURIComponent(team.teamId)}/manage`}
            className="rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-bold text-[#06054e] hover:bg-yellow-500"
          >
            Manage team
          </Link>
        </div>
      </div>

      <ClubTeamCard team={team} clubId={clubId} large />
    </div>
  );
}
