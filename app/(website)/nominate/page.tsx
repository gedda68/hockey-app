// app/(website)/nominate/page.tsx
// Public player self-nomination portal.
// Players find themselves by name + DOB, then nominate for any eligible open tournament.

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Trophy,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  MapPin,
  Calendar,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { calcAgeForSeason } from "@/types/nominations";
import type { OpenOpportunity } from "@/types/tournaments";
import NominationWorkflowModal from "@/components/admin/players/NominationWorkflowModal";

// ── Types ──────────────────────────────────────────────────────────────────────
interface FoundPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth: string;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  clubId?: string | null;
  clubName?: string | null;
  linkedMemberId?: string | null;
  photo?: string | null;
  status?: string;
}

type LookupState = "idle" | "loading" | "found" | "not_found" | "error";

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function genderLabel(g?: string | null) {
  if (!g) return null;
  const lower = g.toLowerCase();
  if (lower.includes("female") || lower === "f") return "Female";
  if (lower.includes("male") || lower === "m") return "Male";
  return g;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NominatePage() {
  // Lookup form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [player, setPlayer] = useState<FoundPlayer | null>(null);

  // Open tournaments
  const [opportunities, setOpportunities] = useState<OpenOpportunity[]>([]);
  const [existingNominations, setExistingNominations] = useState<string[]>([]); // ageGroups already nominated

  // Nomination modal
  const [activeOpportunity, setActiveOpportunity] =
    useState<OpenOpportunity | null>(null);
  const [nominatedAgeGroups, setNominatedAgeGroups] = useState<string[]>([]);

  // ── Lookup ─────────────────────────────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !dob) return;

    setLookupState("loading");
    setPlayer(null);

    try {
      const [playerRes, oppsRes] = await Promise.all([
        fetch(
          `/api/players/lookup?firstName=${encodeURIComponent(firstName.trim())}&lastName=${encodeURIComponent(lastName.trim())}&dob=${dob}`,
        ),
        fetch(
          `/api/admin/nominations/available?season=${new Date().getFullYear()}`,
        ),
      ]);

      const playerData = await playerRes.json();
      const oppsData = oppsRes.ok ? await oppsRes.json() : { opportunities: [] };

      if (!playerData.player) {
        setLookupState("not_found");
        return;
      }

      const foundPlayer: FoundPlayer = playerData.player;

      // Filter opportunities by age + gender eligibility
      const eligible = (oppsData.opportunities as OpenOpportunity[]).filter(
        (opp) => {
          if (!foundPlayer.dateOfBirth) return false;
          const age = calcAgeForSeason(
            foundPlayer.dateOfBirth,
            parseInt(opp.season),
          );
          const range = opp.eligibilityRange;
          const ageOk =
            age >= range.minAge &&
            (range.maxAge === null || age <= range.maxAge);
          if (!ageOk) return false;
          if (opp.tournamentGender === "mixed") return true;
          const pg = (foundPlayer.gender || "").toLowerCase();
          return (
            pg.includes(opp.tournamentGender) || pg === opp.tournamentGender[0]
          );
        },
      );

      // Fetch existing nominations for this player to show already-nominated badge
      const season = new Date().getFullYear();
      const nomsRes = await fetch(
        `/api/admin/nominations?season=${season}&playerId=${foundPlayer.playerId}`,
      );
      const nomsData = nomsRes.ok ? await nomsRes.json() : [];
      const nomAgeGroups: string[] = Array.isArray(nomsData)
        ? nomsData
            .filter(
              (n: any) =>
                n.playerId === foundPlayer.playerId ||
                (foundPlayer.linkedMemberId &&
                  n.memberId === foundPlayer.linkedMemberId),
            )
            .map((n: any) => n.ageGroup)
        : [];

      setPlayer(foundPlayer);
      setOpportunities(eligible);
      setExistingNominations(nomAgeGroups);
      setLookupState("found");
    } catch {
      setLookupState("error");
    }
  };

  const handleReset = () => {
    setLookupState("idle");
    setPlayer(null);
    setOpportunities([]);
    setExistingNominations([]);
    setNominatedAgeGroups([]);
    setFirstName("");
    setLastName("");
    setDob("");
  };

  const handleNominationSuccess = (ageGroup: string) => {
    setActiveOpportunity(null);
    setNominatedAgeGroups((prev) => [...prev, ageGroup]);
  };

  const alreadyNominated = (ageGroup: string) =>
    existingNominations.includes(ageGroup) ||
    nominatedAgeGroups.includes(ageGroup);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-[#06054e] text-white pt-10 pb-24 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            href="/representative"
            className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-yellow-400 flex items-center justify-center gap-2 mb-8 group transition-colors"
          >
            <ChevronLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to Representative
          </Link>

          <div className="inline-flex items-center gap-2 bg-yellow-400/20 px-4 py-2 rounded-2xl border border-yellow-400/30 mb-6">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-yellow-400 font-black text-xs uppercase tracking-widest">
              Representative Nominations
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
            Nominate for<br />
            <span className="text-yellow-400">Rep Hockey</span>
          </h1>
          <p className="text-white/60 font-bold text-sm max-w-md mx-auto">
            Find your player profile and nominate for any eligible open
            tournament during the nomination window.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 -mt-12 pb-20">
        {/* ── STEP 1: Lookup form ── */}
        {lookupState !== "found" && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
            <h2 className="text-2xl font-black uppercase text-[#06054e] mb-2">
              Find Your Profile
            </h2>
            <p className="text-slate-500 font-bold text-sm mb-8">
              Enter your details exactly as registered with your club.
            </p>

            <form onSubmit={handleLookup} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Sarah"
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Johnson"
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none text-slate-900 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={lookupState === "loading"}
                className="w-full py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#0a0870] transition-colors flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {lookupState === "loading" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Find My Profile
                  </>
                )}
              </button>
            </form>

            {/* Not found state */}
            {lookupState === "not_found" && (
              <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className="text-amber-600 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="font-black text-amber-800 text-sm">
                    No player found
                  </p>
                  <p className="text-amber-700 text-xs font-bold mt-1">
                    Check that your name and date of birth match exactly how
                    they were registered. Contact your club if you need help.
                  </p>
                </div>
              </div>
            )}

            {lookupState === "error" && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className="text-red-600 flex-shrink-0 mt-0.5"
                />
                <p className="font-black text-red-800 text-sm">
                  Something went wrong. Please try again.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Player found + eligible tournaments ── */}
        {lookupState === "found" && player && (
          <>
            {/* Player card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
              {/* Coloured banner */}
              <div className="bg-[#06054e] px-8 py-6 flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User size={28} className="text-[#06054e]" />
                </div>
                <div>
                  <p className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-0.5">
                    Profile Found
                  </p>
                  <h2 className="text-2xl font-black text-white">
                    {player.firstName}{" "}
                    {player.preferredName &&
                    player.preferredName !== player.firstName
                      ? `"${player.preferredName}" `
                      : ""}
                    {player.lastName}
                  </h2>
                </div>
              </div>

              <div className="px-8 py-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 mb-1">
                    Date of Birth
                  </p>
                  <p className="font-black text-slate-900">
                    {formatDate(player.dateOfBirth)}
                  </p>
                </div>
                {genderLabel(player.gender) && (
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 mb-1">
                      Gender
                    </p>
                    <p className="font-black text-slate-900">
                      {genderLabel(player.gender)}
                    </p>
                  </div>
                )}
                {player.clubName && (
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 mb-1">
                      Club
                    </p>
                    <p className="font-black text-blue-700">{player.clubName}</p>
                  </div>
                )}
              </div>

              <div className="px-8 pb-4">
                <button
                  onClick={handleReset}
                  className="text-xs font-black uppercase text-slate-400 hover:text-[#06054e] transition-colors"
                >
                  ← Not you? Search again
                </button>
              </div>
            </div>

            {/* Eligible tournaments */}
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Trophy size={22} className="text-[#06054e]" />
                <h2 className="text-2xl font-black uppercase text-[#06054e]">
                  Open Nominations
                </h2>
                {opportunities.length > 0 && (
                  <span className="ml-auto px-3 py-1 bg-[#06054e] text-white rounded-full text-xs font-black">
                    {opportunities.length} eligible
                  </span>
                )}
              </div>

              {opportunities.length === 0 ? (
                <div className="py-12 text-center">
                  <Trophy size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="font-black text-slate-400 uppercase text-sm">
                    No open nominations
                  </p>
                  <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs mx-auto">
                    There are currently no tournaments open for nomination that
                    match your age group and gender. Check back later.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.map((opp) => {
                    const nominated = alreadyNominated(opp.ageGroup);
                    return (
                      <div
                        key={opp.ageGroup}
                        className={`rounded-2xl border-2 p-5 transition-all ${
                          nominated
                            ? "border-green-200 bg-green-50"
                            : "border-slate-200 hover:border-[#06054e]/30 hover:shadow-md"
                        }`}
                      >
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="px-2.5 py-0.5 bg-[#06054e] text-white rounded-lg text-xs font-black uppercase">
                                {opp.ageGroup}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase ${
                                  opp.tournamentGender === "female"
                                    ? "bg-pink-100 text-pink-700"
                                    : opp.tournamentGender === "male"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {opp.tournamentGender === "mixed"
                                  ? "Mixed"
                                  : opp.tournamentGender === "female"
                                    ? "Female"
                                    : "Male"}
                              </span>
                            </div>
                            <h3 className="font-black text-[#06054e] text-lg leading-tight">
                              {opp.tournamentTitle}
                            </h3>
                          </div>

                          {nominated ? (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-black flex-shrink-0">
                              <CheckCircle size={14} />
                              Nominated
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveOpportunity(opp)}
                              className="px-5 py-2.5 bg-[#06054e] text-white rounded-xl font-black uppercase text-xs hover:bg-[#0a0870] transition-colors flex-shrink-0 shadow-lg hover:shadow-xl"
                            >
                              Nominate →
                            </button>
                          )}
                        </div>

                        {/* Details row */}
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-bold text-slate-500">
                          {opp.tournamentLocation && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-slate-400" />
                              {opp.tournamentLocation}
                            </span>
                          )}
                          {opp.tournamentStartDate && (
                            <span className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-400" />
                              {formatDate(opp.tournamentStartDate)}
                              {opp.tournamentEndDate &&
                              opp.tournamentEndDate !== opp.tournamentStartDate
                                ? ` – ${formatDate(opp.tournamentEndDate)}`
                                : ""}
                            </span>
                          )}
                          <span
                            className={`flex items-center gap-1.5 ${
                              opp.daysRemaining <= 7
                                ? "text-red-600"
                                : opp.daysRemaining <= 14
                                  ? "text-amber-600"
                                  : "text-slate-500"
                            }`}
                          >
                            <Clock size={12} />
                            {opp.daysRemaining === 0
                              ? "Closes today"
                              : opp.daysRemaining === 1
                                ? "1 day left"
                                : `${opp.daysRemaining} days left`}
                          </span>
                          {opp.nominationFee > 0 && (
                            <span className="flex items-center gap-1.5 text-slate-700">
                              Fee: ${opp.nominationFee.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Eligibility note */}
                        {!nominated && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 font-bold">
                            Eligible: {opp.eligibilityRange.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Nomination workflow modal */}
      {activeOpportunity && player && (
        <NominationWorkflowModal
          player={player}
          opportunity={activeOpportunity}
          onClose={() => setActiveOpportunity(null)}
          onSuccess={() => handleNominationSuccess(activeOpportunity.ageGroup)}
        />
      )}
    </div>
  );
}
