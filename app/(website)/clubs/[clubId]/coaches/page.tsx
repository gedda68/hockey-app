// app/(website)/clubs/[clubId]/coaches/page.tsx
// Active coaches at the club and the teams they coach (each team a pill
// linking to that team's page). Opened from the dashboard's Coaches card.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import clientPromise from "@/lib/mongodb";
import { getClubActiveCoaches, resolveClub } from "@/lib/clubs/clubPortalData";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { clubId } = await params;
  return { title: `Coaches | ${clubId}` };
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function ClubCoachesPage({ params }: PageProps) {
  const { clubId } = await params;
  const db = (await clientPromise).db(process.env.DB_NAME?.trim() || "hockey-app");
  const club = await resolveClub(db, clubId);
  if (!club) notFound();

  const coaches = await getClubActiveCoaches(db, club);
  const teamCount = new Set(coaches.flatMap((c) => c.teams.map((t) => t.teamId))).size;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <Link href={`/clubs/${clubId}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#06054e]">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <header>
        <h1 className="text-4xl font-black text-[#06054e]">Coaches</h1>
        <p className="mt-1 text-lg font-semibold text-slate-600">
          {coaches.length} active coach{coaches.length === 1 ? "" : "es"}
          {teamCount ? ` across ${teamCount} team${teamCount === 1 ? "" : "s"}` : ""}
        </p>
      </header>

      {coaches.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-lg text-slate-500 shadow">No active coaches.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
          {coaches.map((c) => (
            <li key={c.memberId} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:w-72 sm:shrink-0">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-700">
                    {initials(c.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-900">{c.name}</p>
                  <p className="truncate text-sm font-semibold text-slate-500">{c.roles.join(" · ")}</p>
                </div>
              </div>

              {c.teams.length ? (
                <ul className="flex flex-wrap gap-2">
                  {c.teams.map((t) => (
                    <li key={t.teamId}>
                      <Link
                        href={`/clubs/${clubId}/teams/${encodeURIComponent(t.teamId)}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#06054e] px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-800"
                        title={`${t.role}${t.season ? ` · ${t.season}` : ""}`}
                      >
                        {t.name}
                        {t.season && <span className="font-semibold text-white/60">{t.season}</span>}
                        {!/^coach$/i.test(t.role) && <span className="font-semibold text-yellow-300">· {t.role}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm font-semibold italic text-slate-400">No team assigned</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
