import Image from "next/image";
import Link from "next/link";
import { getUpcomingMatches, getRecentMatches } from "@/lib/data/matches";
import { getCurrentSeasonStandings } from "@/lib/data/standings";
import { getClubs } from "@/lib/data/clubs";

export default async function HomePage() {
  // Fetch data
  const upcomingMatches = await getUpcomingMatches();
  const recentMatches = await getRecentMatches(3);
  const divisions = await getCurrentSeasonStandings();
  const clubs = await getClubs();

  // Get feature match (first upcoming)
  const featureMatch = upcomingMatches[0];

  // Get top division standings (first 5 teams)
  const topDivision = divisions[0];
  const topTeams = topDivision?.teams.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section - Feature Match */}
      {featureMatch && (
        <section className="relative bg-gradient-to-br from-[#06054e] to-[#0a0870] text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full mb-4">
                <span className="text-xs font-black uppercase tracking-wider">
                  Feature Match
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase mb-2">
                {featureMatch.division}
              </h1>
              <p className="text-lg opacity-80">
                {new Date(featureMatch.dateTime).toLocaleDateString("en-AU", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Match Details */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                <div className="grid grid-cols-3 gap-8 items-center">
                  {/* Home Team */}
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <Image
                        src={featureMatch.homeTeam.icon}
                        alt={featureMatch.homeTeam.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <h2 className="text-xl font-black uppercase">
                      {featureMatch.homeTeam.name}
                    </h2>
                  </div>

                  {/* VS / Time */}
                  <div className="text-center">
                    <div className="text-5xl font-black mb-2">VS</div>
                    <div className="text-sm opacity-80">
                      {new Date(featureMatch.dateTime).toLocaleTimeString(
                        "en-AU",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {featureMatch.venue}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <Image
                        src={featureMatch.awayTeam.icon}
                        alt={featureMatch.awayTeam.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <h2 className="text-xl font-black uppercase">
                      {featureMatch.awayTeam.name}
                    </h2>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <Link
                    href={`/competitions/matches`}
                    className="inline-block px-8 py-3 bg-white text-[#06054e] rounded-full font-black uppercase text-sm hover:bg-slate-100 transition-all"
                  >
                    View Match Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Latest Results & Upcoming */}
          <div className="lg:col-span-2 space-y-8">
            {/* Latest Results */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase text-[#06054e]">
                  Latest Results
                </h2>
                <Link
                  href="/competitions/matches"
                  className="text-sm font-black uppercase text-slate-600 hover:text-[#06054e]"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-4">
                {recentMatches.map((match) => (
                  <div
                    key={match.matchId}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black uppercase text-slate-400">
                        {match.division}
                      </span>
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                        {match.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Home Team */}
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <Image
                            src={match.homeTeam.icon}
                            alt={match.homeTeam.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm truncate">
                            {match.homeTeam.name}
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-center">
                        {match.score ? (
                          <div className="text-2xl font-black">
                            {match.score.home} - {match.score.away}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-400">
                            VS
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-3 justify-end">
                        <div className="flex-1 min-w-0 text-right">
                          <div className="font-black text-sm truncate">
                            {match.awayTeam.name}
                          </div>
                        </div>
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <Image
                            src={match.awayTeam.icon}
                            alt={match.awayTeam.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Matches */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase text-[#06054e]">
                  Upcoming Matches
                </h2>
                <Link
                  href="/competitions/matches"
                  className="text-sm font-black uppercase text-slate-600 hover:text-[#06054e]"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-4">
                {upcomingMatches.slice(0, 3).map((match) => (
                  <div
                    key={match.matchId}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black uppercase text-slate-400">
                        {match.division}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {new Date(match.dateTime).toLocaleDateString("en-AU", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(match.dateTime).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Home Team */}
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <Image
                            src={match.homeTeam.icon}
                            alt={match.homeTeam.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm truncate">
                            {match.homeTeam.name}
                          </div>
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-center">
                        <div className="text-sm font-bold text-slate-400">
                          VS
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-3 justify-end">
                        <div className="flex-1 min-w-0 text-right">
                          <div className="font-black text-sm truncate">
                            {match.awayTeam.name}
                          </div>
                        </div>
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <Image
                            src={match.awayTeam.icon}
                            alt={match.awayTeam.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        📍 {match.venue}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Ladder & News */}
          <div className="space-y-8">
            {/* Ladder Preview */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase text-[#06054e]">
                  Ladder
                </h2>
                <Link
                  href="/competitions/standings"
                  className="text-xs font-black uppercase text-slate-600 hover:text-[#06054e]"
                >
                  Full Ladder →
                </Link>
              </div>

              {topDivision && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-[#06054e] px-4 py-3">
                    <h3 className="text-sm font-black uppercase text-white">
                      {topDivision.divisionName}
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {topTeams.map((team, index) => (
                      <div
                        key={team.club}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-6 text-center">
                          <span className="text-sm font-black text-slate-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <Image
                            src={team.icon}
                            alt={team.club}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">
                            {team.club}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[#06054e]">
                            {team.pts}
                          </div>
                          <div className="text-xs text-slate-400">pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Featured Clubs */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase text-[#06054e]">
                  Featured Clubs
                </h2>
                <Link
                  href="/clubs"
                  className="text-xs font-black uppercase text-slate-600 hover:text-[#06054e]"
                >
                  All Clubs →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {clubs.slice(0, 4).map((club) => (
                  <Link
                    key={club.slug}
                    href={`/clubs/${club.slug}`}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all text-center group"
                  >
                    <div className="relative w-16 h-16 mx-auto mb-3">
                      {club.iconSrc ? (
                        <Image
                          src={club.iconSrc}
                          alt={club.title}
                          fill
                          className="object-contain group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="text-4xl">{club.icon}</span>
                      )}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-900">
                      {club.title.split(" ")[0]}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#06054e] to-[#0a0870] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">
            Join Brisbane Hockey League
          </h2>
          <p className="text-lg opacity-80 mb-8 max-w-2xl mx-auto">
            Be part of Queensland's premier hockey competition. Find a club near
            you and start your journey today.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/clubs"
              className="px-8 py-4 bg-white text-[#06054e] rounded-full font-black uppercase text-sm hover:bg-slate-100 transition-all"
            >
              Find a Club
            </Link>
            <Link
              href="/representative"
              className="px-8 py-4 border-2 border-white rounded-full font-black uppercase text-sm hover:bg-white/10 transition-all"
            >
              Representative Teams
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 border-2 border-white rounded-full font-black uppercase text-sm hover:bg-white/10 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
