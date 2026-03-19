// components/admin/players/sections/RepresentativeSection.tsx
// Representative nominations for an individual player.
// Two sub-tabs: Player (nominate for a rep team) | Official (coach, manager, umpire etc.)

"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  UserCog,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { calcAgeForSeason } from "@/types/nominations";
import type { OpenOpportunity } from "@/types/tournaments";
import type { BaseSectionProps, RepOfficialNomination } from "@/types/player.types";
import NominationWorkflowModal from "../NominationWorkflowModal";

// ── Constants ────────────────────────────────────────────────────────────────
const OFFICIAL_ROLES = [
  { value: "head_coach",       label: "Head Coach" },
  { value: "assistant_coach",  label: "Assistant Coach" },
  { value: "manager",          label: "Manager" },
  { value: "umpire",           label: "Umpire / Referee" },
  { value: "trainer",          label: "Trainer / Physio" },
  { value: "other",            label: "Other Official" },
] as const;

type OfficialRoleValue = typeof OFFICIAL_ROLES[number]["value"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/**
 * A player is eligible as an official for a division when:
 *  - They are 18 or older (adults can hold any official role), OR
 *  - Their age is strictly greater than the division's maxAge (they've "aged out" of that division)
 *    — for Opens (maxAge = null) only adults (18+) qualify.
 */
function isEligibleAsOfficial(playerAge: number, maxAge: number | null): boolean {
  if (playerAge >= 18) return true;
  if (maxAge === null) return false; // Opens — adults only
  return playerAge > maxAge;
}

// ── Nomination status badge ───────────────────────────────────────────────────
function DaysChip({ days }: { days: number }) {
  const colour =
    days <= 7  ? "text-red-600 bg-red-50 border-red-200"
    : days <= 14 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-slate-500 bg-slate-50 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${colour}`}>
      <Clock size={9} />
      {days === 0 ? "Closes today" : days === 1 ? "1 day left" : `${days}d left`}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RepresentativeSection({ formData }: BaseSectionProps) {
  const [sub, setSub] = useState<"player" | "official">("player");

  // Data
  const [opportunities, setOpportunities] = useState<OpenOpportunity[]>([]);
  const [existingNoms, setExistingNoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Player nomination modal
  const [activeOpp, setActiveOpp] = useState<OpenOpportunity | null>(null);
  const [sessionNominated, setSessionNominated] = useState<string[]>([]);

  // Official nomination state
  const [selectedRoles, setSelectedRoles] = useState<Record<string, OfficialRoleValue>>({});
  const [submittingOfficial, setSubmittingOfficial] = useState<string | null>(null);
  const [officialSubmitted, setOfficialSubmitted] = useState<string[]>([]);
  const [officialError, setOfficialError] = useState<string>("");

  const { playerId, dateOfBirth, gender, clubId, linkedMemberId, firstName, lastName } = formData;
  const season = new Date().getFullYear().toString();
  const seasonYear = parseInt(season, 10);
  const playerAge = dateOfBirth ? calcAgeForSeason(dateOfBirth, seasonYear) : null;

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setLoadError("");

    Promise.all([
      fetch(`/api/admin/nominations/available?season=${season}`).then((r) => r.json()),
      fetch(`/api/admin/nominations?season=${season}&playerId=${playerId}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([oppsData, nomsData]) => {
        setOpportunities(oppsData.opportunities ?? []);
        setExistingNoms(Array.isArray(nomsData) ? nomsData : []);
      })
      .catch(() => setLoadError("Failed to load nomination opportunities."))
      .finally(() => setLoading(false));
  }, [playerId, season]);

  // ── Derived: eligible as player ────────────────────────────────────────────
  const playerEligible = opportunities.filter((opp) => {
    if (!dateOfBirth) return false;
    const age = calcAgeForSeason(dateOfBirth, parseInt(opp.season, 10));
    const range = opp.eligibilityRange;
    const ageOk = age >= range.minAge && (range.maxAge === null || age <= range.maxAge);
    if (!ageOk) return false;
    if (opp.tournamentGender === "mixed") return true;
    const pg = (gender ?? "").toLowerCase();
    return pg.includes(opp.tournamentGender) || pg === opp.tournamentGender[0];
  });

  // ── Derived: eligible as official ─────────────────────────────────────────
  const officialEligible = playerAge !== null
    ? opportunities.filter((opp) =>
        isEligibleAsOfficial(playerAge, opp.eligibilityRange.maxAge ?? null)
      )
    : [];

  const isAlreadyNominated = (ageGroup: string) =>
    sessionNominated.includes(ageGroup) ||
    existingNoms.some(
      (n) =>
        n.ageGroup === ageGroup &&
        (!n.nominationType || n.nominationType === "player")
    );

  const isAlreadyOfficial = (ageGroup: string, role: string) =>
    officialSubmitted.includes(`${ageGroup}::${role}`) ||
    existingNoms.some(
      (n) =>
        n.ageGroup === ageGroup &&
        n.nominationType === "official" &&
        n.role === role
    );

  // ── Official nomination submit ─────────────────────────────────────────────
  async function submitOfficialNomination(opp: OpenOpportunity) {
    const role = selectedRoles[opp.ageGroup];
    if (!role) return;
    const key = `${opp.ageGroup}::${role}`;
    setSubmittingOfficial(key);
    setOfficialError("");

    try {
      const body: Record<string, any> = {
        season: opp.season,
        ageGroup: opp.ageGroup,
        clubId: clubId ?? "",
        playerId,
        nominationType: "official",
        role,
      };
      if (linkedMemberId) body.memberId = linkedMemberId;

      const res = await fetch("/api/admin/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to submit nomination");
      }
      const nomData = await res.json();

      // Append to player official history (fire and forget)
      const officialEntry: RepOfficialNomination = {
        id: `off-${Date.now()}`,
        season: opp.season,
        ageGroup: opp.ageGroup,
        tournamentId: opp.tournamentId,
        tournamentTitle: opp.tournamentTitle,
        role,
        nominatedDate: new Date().toISOString().split("T")[0],
        status: "pending",
      };
      fetch(`/api/admin/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialHistory: [officialEntry],
          _appendOfficialHistory: true,
        }),
      }).catch(console.warn);

      setOfficialSubmitted((prev) => [...prev, key]);
    } catch (err: any) {
      setOfficialError(err.message);
    } finally {
      setSubmittingOfficial(null);
    }
  }

  // ── No player ID yet ────────────────────────────────────────────────────────
  if (!playerId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Trophy size={48} className="text-slate-200 mb-4" />
        <p className="font-black text-slate-400 uppercase text-sm">
          Save the player first
        </p>
        <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs">
          Representative nominations are available after the player record has been saved.
        </p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#06054e]/5 border border-[#06054e]/10 rounded-2xl px-4 py-3">
        <Info size={15} className="text-[#06054e] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#06054e]/80 font-semibold">
          <p>
            <strong>{firstName} {lastName}</strong> — Season {season}
            {playerAge !== null && (
              <span className="ml-2 px-2 py-0.5 bg-[#06054e]/10 text-[#06054e] rounded-full text-[10px] font-black uppercase">
                Age {playerAge} (hockey)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setSub("player")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase transition-all ${
            sub === "player"
              ? "bg-[#06054e] text-white shadow"
              : "text-slate-500 hover:text-[#06054e]"
          }`}
        >
          <Trophy size={16} />
          Player Nominations
          {playerEligible.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              sub === "player" ? "bg-white/20 text-white" : "bg-[#06054e]/10 text-[#06054e]"
            }`}>
              {playerEligible.filter((o) => !isAlreadyNominated(o.ageGroup)).length} open
            </span>
          )}
        </button>
        <button
          onClick={() => setSub("official")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase transition-all ${
            sub === "official"
              ? "bg-[#06054e] text-white shadow"
              : "text-slate-500 hover:text-[#06054e]"
          }`}
        >
          <UserCog size={16} />
          Official Roles
          {officialEligible.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              sub === "official" ? "bg-white/20 text-white" : "bg-[#06054e]/10 text-[#06054e]"
            }`}>
              {officialEligible.length} eligible
            </span>
          )}
        </button>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center gap-3 justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-bold text-sm">Loading open nominations…</span>
        </div>
      )}
      {loadError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-semibold">
          <AlertCircle size={15} />
          {loadError}
        </div>
      )}

      {/* ── PLAYER NOMINATIONS tab ────────────────────────────────────────── */}
      {!loading && sub === "player" && (
        <>
          {!dateOfBirth ? (
            <div className="py-12 text-center bg-amber-50 border-2 border-amber-200 rounded-2xl">
              <AlertCircle size={36} className="mx-auto text-amber-400 mb-3" />
              <p className="font-black text-amber-700 uppercase text-sm">Date of birth required</p>
              <p className="text-amber-600 text-xs font-bold mt-1">
                Set the player's date of birth in the Personal section to see eligible tournaments.
              </p>
            </div>
          ) : playerEligible.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Trophy size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="font-black text-slate-400 uppercase text-sm">No open nominations</p>
              <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs mx-auto">
                No tournaments are currently open for nomination that match this player's age and gender.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {playerEligible.map((opp) => {
                const nominated = isAlreadyNominated(opp.ageGroup);
                return (
                  <div
                    key={opp.ageGroup}
                    className={`rounded-2xl border-2 p-5 transition-all ${
                      nominated
                        ? "border-green-200 bg-green-50"
                        : "border-slate-200 hover:border-[#06054e]/30 hover:shadow-md bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2.5 py-0.5 bg-[#06054e] text-white rounded-lg text-xs font-black uppercase">
                            {opp.ageGroup}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase ${
                            opp.tournamentGender === "female" ? "bg-pink-100 text-pink-700"
                            : opp.tournamentGender === "male" ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                          }`}>
                            {opp.tournamentGender}
                          </span>
                          <DaysChip days={opp.daysRemaining} />
                        </div>
                        <p className="font-black text-[#06054e] text-base leading-tight">
                          {opp.tournamentTitle}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-bold text-slate-500">
                          {opp.tournamentLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-slate-400" />
                              {opp.tournamentLocation}
                            </span>
                          )}
                          {opp.tournamentStartDate && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              {formatDate(opp.tournamentStartDate)}
                            </span>
                          )}
                          {opp.nominationFee > 0 && (
                            <span className="font-bold text-slate-700">
                              Fee: ${opp.nominationFee.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {nominated ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-black flex-shrink-0">
                          <CheckCircle size={14} />
                          Nominated
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveOpp(opp)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white rounded-xl font-black uppercase text-xs transition-colors flex-shrink-0 shadow-md"
                        >
                          Nominate
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>

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
        </>
      )}

      {/* ── OFFICIAL ROLES tab ───────────────────────────────────────────── */}
      {!loading && sub === "official" && (
        <>
          {playerAge === null ? (
            <div className="py-12 text-center bg-amber-50 border-2 border-amber-200 rounded-2xl">
              <AlertCircle size={36} className="mx-auto text-amber-400 mb-3" />
              <p className="font-black text-amber-700 uppercase text-sm">Date of birth required</p>
              <p className="text-amber-600 text-xs font-bold mt-1 max-w-xs mx-auto">
                Set the player's date of birth in the Personal section first.
              </p>
            </div>
          ) : (
            <>
              {/* Eligibility note */}
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <UserCog size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-slate-600">
                  {playerAge >= 18
                    ? `As an adult (age ${playerAge}), this player can nominate as an official for any age division.`
                    : `At age ${playerAge}, this player can nominate as an official for divisions with a maximum age below ${playerAge}.`}
                </p>
              </div>

              {officialError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  <AlertCircle size={15} />
                  {officialError}
                </div>
              )}

              {officialEligible.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <UserCog size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="font-black text-slate-400 uppercase text-sm">No eligible divisions</p>
                  <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs mx-auto">
                    No open divisions are currently available for official role nominations.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {officialEligible.map((opp) => (
                    <div
                      key={opp.ageGroup}
                      className="rounded-2xl border-2 border-slate-200 bg-white hover:border-[#06054e]/30 p-5 transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-9 h-9 bg-[#06054e]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <UserCog size={16} className="text-[#06054e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2.5 py-0.5 bg-[#06054e] text-white rounded-lg text-xs font-black uppercase">
                              {opp.ageGroup}
                            </span>
                            <DaysChip days={opp.daysRemaining} />
                          </div>
                          <p className="font-black text-[#06054e] text-base leading-tight">
                            {opp.tournamentTitle}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs font-bold text-slate-500">
                            {opp.tournamentLocation && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} className="text-slate-400" />
                                {opp.tournamentLocation}
                              </span>
                            )}
                            {opp.tournamentStartDate && (
                              <span className="flex items-center gap-1">
                                <Calendar size={11} className="text-slate-400" />
                                {formatDate(opp.tournamentStartDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Role grid — show each role as a nominate button */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {OFFICIAL_ROLES.map(({ value, label }) => {
                          const submitted = isAlreadyOfficial(opp.ageGroup, value);
                          const key = `${opp.ageGroup}::${value}`;
                          const isSubmitting = submittingOfficial === key;
                          return (
                            <button
                              key={value}
                              onClick={() => {
                                if (!submitted) {
                                  setSelectedRoles((prev) => ({ ...prev, [opp.ageGroup]: value }));
                                  submitOfficialNomination({ ...opp });
                                }
                              }}
                              disabled={submitted || submittingOfficial !== null}
                              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                                submitted
                                  ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-[#06054e] hover:text-white hover:border-[#06054e] disabled:opacity-40"
                              }`}
                            >
                              {isSubmitting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : submitted ? (
                                <CheckCircle size={12} />
                              ) : null}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Player nomination workflow modal */}
      {activeOpp && (
        <NominationWorkflowModal
          player={{
            playerId: playerId!,
            firstName: firstName ?? "",
            lastName: lastName ?? "",
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            email: formData.email,
            phone: formData.phone,
            clubId: formData.clubId,
            linkedMemberId: formData.linkedMemberId ?? undefined,
            emergencyContacts: formData.emergencyContacts,
            medical: formData.medical
              ? {
                  conditions: formData.medical.conditions ?? "",
                  allergies: formData.medical.allergies ?? "",
                  medications: formData.medical.medications ?? "",
                  bloodType: formData.medical.bloodType ?? "",
                  doctorName: formData.medical.doctorName ?? "",
                  doctorPhone: formData.medical.doctorPhone ?? "",
                }
              : undefined,
          }}
          opportunity={activeOpp}
          onClose={() => setActiveOpp(null)}
          onSuccess={() => {
            setSessionNominated((prev) => [...prev, activeOpp.ageGroup]);
            setActiveOpp(null);
          }}
        />
      )}
    </div>
  );
}
