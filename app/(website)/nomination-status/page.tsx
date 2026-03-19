// app/(website)/nomination-status/page.tsx
// Public player-facing nomination status page.
// Players look themselves up by name+DOB to see the status of all their rep nominations.

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  ClipboardList,
  Star,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Info,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlayerInfo {
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth: string;
  gender?: string | null;
  clubName?: string | null;
}

interface NominationRecord {
  nominationId: string;
  season: string;
  ageGroup: string;
  clubName: string;
  nominatedAt: string;
  updatedAt: string;
  status: string;
  nominationType: string;
  role?: string | null;
  notes?: string;
  tournamentTitle?: string | null;
  tournamentLocation?: string | null;
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  snapshotEmail?: string | null;
  snapshotPhone?: string | null;
  snapshotDate?: string | null;
}

type LookupState = "idle" | "loading" | "found" | "not_found" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso + (iso.includes("T") ? "" : "T00:00:00")).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function genderLabel(g?: string | null) {
  if (!g) return null;
  const l = g.toLowerCase();
  if (l.includes("female") || l === "f") return "Female";
  if (l.includes("male")   || l === "m") return "Male";
  return g;
}

// ── Status config ─────────────────────────────────────────────────────────────

type StatusKey = "pending" | "accepted" | "selected" | "rejected" | "declined" | "withdrawn" | string;

interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  dotClass: string;
  cardBorder: string;
  cardBg: string;
  message: string;
}

function getStatusConfig(status: StatusKey): StatusConfig {
  switch (status) {
    case "accepted":
    case "selected":
      return {
        label: "Selected",
        icon: <CheckCircle2 size={16} />,
        badgeClass: "bg-green-100 text-green-700 border-green-200",
        dotClass: "bg-green-500",
        cardBorder: "border-green-300",
        cardBg: "bg-green-50/40",
        message:
          "Congratulations! You have been selected for this squad. Further information will be sent to you directly by the selection committee.",
      };
    case "rejected":
    case "declined":
      return {
        label: "Unsuccessful",
        icon: <XCircle size={16} />,
        badgeClass: "bg-red-100 text-red-700 border-red-200",
        dotClass: "bg-red-500",
        cardBorder: "border-red-200",
        cardBg: "bg-red-50/20",
        message:
          "Thank you for your interest. Unfortunately your nomination was not successful for this tournament. We encourage you to nominate again next season.",
      };
    case "withdrawn":
      return {
        label: "Withdrawn",
        icon: <MinusCircle size={16} />,
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
        dotClass: "bg-slate-400",
        cardBorder: "border-slate-200",
        cardBg: "bg-slate-50/40",
        message: "This nomination has been withdrawn.",
      };
    case "pending":
    default:
      return {
        label: "Under Review",
        icon: <Clock size={16} />,
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500 animate-pulse",
        cardBorder: "border-amber-200",
        cardBg: "bg-amber-50/30",
        message:
          "Your nomination has been received and is currently under review by the selection committee. You will be notified of the outcome.",
      };
  }
}

// ── Nomination card ───────────────────────────────────────────────────────────

function NominationCard({ nom }: { nom: NominationRecord }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getStatusConfig(nom.status);
  const isOfficial = nom.nominationType === "official";

  const dateRange =
    nom.tournamentStartDate
      ? nom.tournamentEndDate && nom.tournamentEndDate !== nom.tournamentStartDate
        ? `${formatDate(nom.tournamentStartDate)} – ${formatDate(nom.tournamentEndDate)}`
        : formatDate(nom.tournamentStartDate)
      : null;

  return (
    <div className={`rounded-2xl border-2 ${cfg.cardBorder} ${cfg.cardBg} overflow-hidden transition-all`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Season + age group badge */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#06054e] flex flex-col items-center justify-center text-white">
            <span className="text-xs font-black leading-none">{nom.season}</span>
            <span className="text-[8px] font-bold text-white/50 mt-0.5 uppercase">Season</span>
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="font-black text-[#06054e] text-base leading-tight">
              {nom.tournamentTitle ?? `${nom.ageGroup} Representative`}
            </h3>

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-[#06054e] text-white rounded-lg text-[11px] font-black uppercase">
                {nom.ageGroup}
              </span>
              {isOfficial ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-[11px] font-black uppercase border border-purple-200">
                  <ShieldCheck size={10} />
                  {nom.role ?? "Official"}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[11px] font-black uppercase border border-blue-200">
                  <Star size={10} />
                  Player
                </span>
              )}
            </div>

            {/* Tournament meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs font-bold text-slate-500">
              {nom.tournamentLocation && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-slate-400" />
                  {nom.tournamentLocation}
                </span>
              )}
              {dateRange && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} className="text-slate-400" />
                  {dateRange}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${cfg.badgeClass}`}>
            {cfg.icon}
            {cfg.label}
          </div>
        </div>

        {/* Status message */}
        <div className="mt-4 flex items-start gap-2.5">
          <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${cfg.dotClass}`} />
          <p className="text-sm text-slate-600 font-semibold leading-relaxed">{cfg.message}</p>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-200/80 text-xs font-black uppercase text-slate-400 hover:text-[#06054e] transition-colors"
      >
        <span>Submission Details</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-200/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Submitted</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">
                {formatDateTime(nom.nominatedAt) ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Last Updated</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">
                {formatDateTime(nom.updatedAt) ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Reference</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5 break-all">
                {nom.nominationId}
              </p>
            </div>
            {nom.clubName && (
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Club</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">{nom.clubName}</p>
              </div>
            )}
            {nom.snapshotEmail && (
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Contact Email</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">{nom.snapshotEmail}</p>
              </div>
            )}
            {nom.snapshotPhone && (
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Contact Phone</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">{nom.snapshotPhone}</p>
              </div>
            )}
          </div>

          {nom.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-600 font-semibold">{nom.notes}</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-semibold flex items-start gap-1.5">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              If you have questions about this nomination, please contact your club administrator.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Progress timeline ─────────────────────────────────────────────────────────

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "submitted", label: "Submitted" },
    { key: "review",    label: "Under Review" },
    { key: "decided",   label: "Decision" },
  ];

  // Map nomination status to timeline step
  const activeStep =
    status === "pending"
      ? 1
      : ["accepted", "selected", "rejected", "declined", "withdrawn"].includes(status)
      ? 2
      : 1;

  const isPositive = ["accepted", "selected"].includes(status);
  const isNegative = ["rejected", "declined"].includes(status);

  return (
    <div className="flex items-center gap-0 mt-4">
      {steps.map((step, idx) => {
        const done = idx < activeStep;
        const current = idx === activeStep;
        const isFinal = idx === 2;

        let circleClass = "bg-slate-200 text-slate-400";
        if (done || current) {
          if (isFinal) {
            circleClass = isPositive
              ? "bg-green-500 text-white"
              : isNegative
              ? "bg-red-500 text-white"
              : "bg-slate-300 text-slate-500";
          } else {
            circleClass = "bg-[#06054e] text-white";
          }
        }

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${circleClass}`}>
                {idx + 1}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 mt-1 text-center leading-tight w-16">
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 transition-all ${idx < activeStep ? "bg-[#06054e]" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NominationStatusPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [dob,       setDob]       = useState("");

  const [lookupState,  setLookupState]  = useState<LookupState>("idle");
  const [player,       setPlayer]       = useState<PlayerInfo | null>(null);
  const [nominations,  setNominations]  = useState<NominationRecord[]>([]);

  // ── Lookup ──────────────────────────────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !dob) return;

    setLookupState("loading");
    setPlayer(null);
    setNominations([]);

    try {
      const res = await fetch(
        `/api/players/nominations?firstName=${encodeURIComponent(firstName.trim())}&lastName=${encodeURIComponent(lastName.trim())}&dob=${dob}`,
      );
      const data = await res.json();

      if (!res.ok || !data.found) {
        setLookupState("not_found");
        return;
      }

      setPlayer(data.player);
      setNominations(data.nominations ?? []);
      setLookupState("found");
    } catch {
      setLookupState("error");
    }
  };

  const handleReset = () => {
    setLookupState("idle");
    setPlayer(null);
    setNominations([]);
    setFirstName("");
    setLastName("");
    setDob("");
  };

  // ── Group by season ─────────────────────────────────────────────────────────
  const seasons = nominations.reduce<Record<string, NominationRecord[]>>((acc, nom) => {
    (acc[nom.season] ??= []).push(nom);
    return acc;
  }, {});
  const sortedSeasons = Object.keys(seasons).sort((a, b) => b.localeCompare(a));

  // ── Counts ──────────────────────────────────────────────────────────────────
  const pendingCount  = nominations.filter((n) => n.status === "pending").length;
  const selectedCount = nominations.filter((n) => ["accepted", "selected"].includes(n.status)).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800">

      {/* ── Header ── */}
      <div className="bg-[#06054e] text-white pt-10 pb-24 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            href="/representative"
            className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-yellow-400 flex items-center justify-center gap-2 mb-8 group transition-colors"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Representative
          </Link>

          <div className="inline-flex items-center gap-2 bg-yellow-400/20 px-4 py-2 rounded-2xl border border-yellow-400/30 mb-6">
            <ClipboardList size={16} className="text-yellow-400" />
            <span className="text-yellow-400 font-black text-xs uppercase tracking-widest">
              Nomination Status
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
            Check Your<br />
            <span className="text-yellow-400">Nominations</span>
          </h1>
          <p className="text-white/60 font-bold text-sm max-w-md mx-auto">
            Enter your details to see the current status of all your representative nominations.
          </p>

          {/* Nav link to nominate page */}
          <div className="mt-6">
            <Link
              href="/nominate"
              className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40 hover:text-yellow-400 transition-colors"
            >
              <Trophy size={12} />
              Want to nominate? Head to the nominations portal
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 -mt-12 pb-20">

        {/* ── Lookup form ── */}
        {lookupState !== "found" && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
            <h2 className="text-2xl font-black uppercase text-[#06054e] mb-2">Find Your Profile</h2>
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
                  <><Loader2 size={18} className="animate-spin" /> Searching...</>
                ) : (
                  <><Search size={18} /> Check My Nominations</>
                )}
              </button>
            </form>

            {/* Not found */}
            {lookupState === "not_found" && (
              <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-amber-800 text-sm">No player found</p>
                  <p className="text-amber-700 text-xs font-bold mt-1">
                    Check that your name and date of birth match exactly how they were registered. Contact your club if you need help.
                  </p>
                </div>
              </div>
            )}

            {lookupState === "error" && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="font-black text-red-800 text-sm">Something went wrong. Please try again.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {lookupState === "found" && player && (
          <>
            {/* Player card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
              <div className="bg-[#06054e] px-8 py-6 flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User size={28} className="text-[#06054e]" />
                </div>
                <div>
                  <p className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-0.5">
                    Profile Found
                  </p>
                  <h2 className="text-2xl font-black text-white">
                    {player.firstName}
                    {player.preferredName && player.preferredName !== player.firstName
                      ? ` "${player.preferredName}" ` : " "}
                    {player.lastName}
                  </h2>
                </div>
                {/* Summary pills */}
                {nominations.length > 0 && (
                  <div className="ml-auto flex gap-2">
                    {pendingCount > 0 && (
                      <span className="px-3 py-1.5 bg-amber-400/20 border border-amber-400/30 text-amber-200 rounded-xl text-xs font-black">
                        {pendingCount} Under Review
                      </span>
                    )}
                    {selectedCount > 0 && (
                      <span className="px-3 py-1.5 bg-green-400/20 border border-green-400/30 text-green-300 rounded-xl text-xs font-black">
                        {selectedCount} Selected
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="px-8 py-5 flex items-center gap-6 text-sm flex-wrap">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Date of Birth</p>
                  <p className="font-black text-slate-900">{formatDate(player.dateOfBirth)}</p>
                </div>
                {genderLabel(player.gender) && (
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Gender</p>
                    <p className="font-black text-slate-900">{genderLabel(player.gender)}</p>
                  </div>
                )}
                {player.clubName && (
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Club</p>
                    <p className="font-black text-blue-700">{player.clubName}</p>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="ml-auto text-xs font-black uppercase text-slate-400 hover:text-[#06054e] transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Not you?
                </button>
              </div>
            </div>

            {/* ── No nominations yet ── */}
            {nominations.length === 0 && (
              <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
                <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black text-slate-400 uppercase text-sm">No nominations yet</p>
                <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs mx-auto">
                  You haven&apos;t submitted any representative nominations. Head to the nominations portal to nominate for an open tournament.
                </p>
                <Link
                  href="/nominate"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#06054e] text-white rounded-2xl font-black uppercase text-xs hover:bg-[#0a0870] transition-colors"
                >
                  <Trophy size={14} />
                  Go to Nominations Portal
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* ── Nominations by season ── */}
            {nominations.length > 0 && (
              <div className="space-y-8">
                {sortedSeasons.map((season) => (
                  <div key={season}>
                    {/* Season heading */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-white font-black text-sm uppercase tracking-widest px-4 py-1.5 bg-white/10 rounded-full">
                        {season} Season
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="space-y-4">
                      {seasons[season].map((nom) => (
                        <NominationCard key={nom.nominationId} nom={nom} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* CTA */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
                  <p className="text-white/60 font-bold text-sm mb-4">
                    Want to nominate for another tournament?
                  </p>
                  <Link
                    href="/nominate"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-[#06054e] rounded-2xl font-black uppercase text-sm hover:bg-yellow-300 transition-colors shadow-lg"
                  >
                    <Trophy size={16} />
                    Nominations Portal
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
