import Link from "next/link";
import type { Metadata } from "next";
import { PublicAwardsClient } from "./PublicAwardsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Competition awards | Competitions",
  description:
    "Player of the match and season or tournament honours for published leagues and tournaments.",
};

export default function PublicAwardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-20 pt-8 md:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/competitions"
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Match Day Central
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          Awards
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Choose a published league or a tournament to see player of the match and end-of-season
          or end-of-tournament awards. Administrators record winners in the admin competition awards
          screen.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/competitions/leagues"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-200 hover:bg-white/10"
          >
            All leagues
          </Link>
          <Link
            href="/tournaments"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sky-200 hover:bg-white/10"
          >
            Tournaments
          </Link>
        </div>
        <div className="mt-10">
          <PublicAwardsClient />
        </div>
      </div>
    </div>
  );
}
