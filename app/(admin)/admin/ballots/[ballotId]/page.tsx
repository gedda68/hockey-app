"use client";

/**
 * /admin/ballots/[ballotId]
 *
 * Ballot voting page.
 * - Eligible voters see the candidates and can cast one vote.
 * - Once voted, the page shows a confirmation.
 * - Once the ballot closes, results are shown.
 * - Admins see live vote counts and a "Close Ballot" button.
 */

import { useState, useEffect, use } from "react";
import {
  Vote,
  CheckCircle,
  Lock,
  Trophy,
  Users,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  XCircle,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import type { Ballot, Nomination } from "@/types/nominations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BallotPageData {
  ballot: Ballot;
  candidates: Nomination[];
  myVote: { nominationId: string; votedAt: string } | null;
  voteCounts: Record<string, number> | null;
  isEligible: boolean;
  isAdmin: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtPercent(votes: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((votes / total) * 100)}%`;
}

// ── Candidate card ─────────────────────────────────────────────────────────────

interface CandidateCardProps {
  nom: Nomination;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  votedFor: boolean;
  voteCount?: number;
  totalVotes: number;
  showResults: boolean;
  isWinner: boolean;
}

function CandidateCard({
  nom, selected, onSelect, disabled, votedFor, voteCount, totalVotes, showResults, isWinner,
}: CandidateCardProps) {
  const name = nom.nomineeName || nom.memberName || "Unknown";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const pct = showResults && voteCount !== undefined ? fmtPercent(voteCount, totalVotes) : null;
  const barWidth = showResults && voteCount !== undefined && totalVotes > 0
    ? `${Math.round((voteCount / totalVotes) * 100)}%`
    : "0%";

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all cursor-pointer ${
        disabled
          ? "cursor-default"
          : "hover:border-[#06054e]/40 hover:shadow-md"
      } ${
        votedFor
          ? "border-[#06054e] bg-[#06054e]/5"
          : selected
            ? "border-[#06054e] bg-[#06054e]/5 shadow-md"
            : "border-slate-200 bg-white"
      } ${isWinner ? "ring-2 ring-yellow-400 border-yellow-400" : ""}`}
      onClick={disabled ? undefined : onSelect}
    >
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-yellow-400 text-[#06054e] px-3 py-0.5 rounded-full text-[10px] font-black uppercase">
          <Trophy size={10} />
          Elected
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
            isWinner ? "bg-yellow-400 text-[#06054e]"
            : votedFor || selected ? "bg-[#06054e] text-white"
            : "bg-slate-100 text-slate-600"
          }`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-[#06054e] text-base">{name}</h3>
              {votedFor && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#06054e] text-white rounded-full text-[10px] font-black uppercase">
                  <CheckCircle size={9} />
                  Your vote
                </span>
              )}
            </div>
            {nom.clubName && (
              <p className="text-xs text-slate-500 mt-0.5">{nom.clubName}</p>
            )}
          </div>

          {/* Selection indicator */}
          {!disabled && !showResults && (
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${
              selected ? "border-[#06054e] bg-[#06054e]" : "border-slate-300"
            }`}>
              {selected && <div className="w-full h-full rounded-full bg-white scale-[0.4]" />}
            </div>
          )}
        </div>

        {/* Statement */}
        {nom.statement && (
          <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">
            {nom.statement}
          </p>
        )}

        {/* Vote bar (results view) */}
        {showResults && pct !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span className="font-bold">{voteCount ?? 0} vote{(voteCount ?? 0) !== 1 ? "s" : ""}</span>
              <span className="font-black text-[#06054e]">{pct}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isWinner ? "bg-yellow-400" : "bg-[#06054e]/50"}`}
                style={{ width: barWidth }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({ ballot, myVote, isAdmin, onClose, closing }: {
  ballot: Ballot;
  myVote: { nominationId: string; votedAt: string } | null;
  isAdmin: boolean;
  onClose: () => void;
  closing: boolean;
}) {
  if (ballot.status === "completed" || ballot.status === "closed") {
    const isDeadlock = ballot.outcome === "deadlock";
    return (
      <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border mb-6 ${
        isDeadlock
          ? "bg-orange-50 border-orange-200 text-orange-800"
          : "bg-green-50 border-green-200 text-green-800"
      }`}>
        {isDeadlock ? <AlertCircle size={20} className="flex-shrink-0 mt-0.5" /> : <Trophy size={20} className="flex-shrink-0 mt-0.5" />}
        <div>
          <p className="font-black text-sm uppercase">
            {isDeadlock ? "Ballot Deadlocked" : "Ballot Complete"}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {isDeadlock
              ? ballot.ballotNumber === 1
                ? "A second ballot has been created for the tied candidates."
                : "Second ballot also deadlocked — requires super-admin resolution."
              : `Winner elected — results are final. ${ballot.totalVotesCast} of ${ballot.totalEligibleVoters} votes cast.`}
          </p>
        </div>
      </div>
    );
  }

  if (myVote) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-[#06054e]/5 border border-[#06054e]/20 rounded-2xl mb-6">
        <ShieldCheck size={20} className="text-[#06054e] flex-shrink-0" />
        <div className="flex-1">
          <p className="font-black text-sm text-[#06054e] uppercase">Vote Recorded</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Your vote was cast on {fmtDate(myVote.votedAt)}. Results will be published when the ballot closes.
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin && ballot.status === "open") {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-amber-700 flex-shrink-0" />
          <div>
            <p className="font-black text-sm text-amber-800 uppercase">Admin View</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {ballot.totalVotesCast} of {ballot.totalEligibleVoters} votes cast · Closes {fmtDate(ballot.closeAt)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={closing}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white rounded-xl text-xs font-black uppercase hover:bg-amber-800 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {closing ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
          Close Ballot
        </button>
      </div>
    );
  }

  return null;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BallotPage({ params }: { params: Promise<{ ballotId: string }> }) {
  const { ballotId } = use(params);

  const [data, setData]           = useState<BallotPageData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState<string | null>(null);
  const [voting, setVoting]       = useState(false);
  const [voteError, setVoteError] = useState("");
  const [closing, setClosing]     = useState(false);
  const [closeResult, setCloseResult] = useState<{ outcome: string; message: string; secondBallot?: any } | null>(null);

  async function fetchBallot() {
    try {
      const res = await fetch(`/api/admin/ballots/${ballotId}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to load ballot");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBallot(); }, [ballotId]);

  async function handleVote() {
    if (!selected || !data) return;
    setVoteError("");
    setVoting(true);
    try {
      const res = await fetch(`/api/admin/ballots/${ballotId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominationId: selected }),
      });
      if (!res.ok) {
        const err = await res.json();
        setVoteError(err.error ?? "Failed to cast vote");
        return;
      }
      await fetchBallot();
    } finally {
      setVoting(false);
    }
  }

  async function handleClose() {
    if (!confirm("Close this ballot now and tally votes?")) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/admin/ballots/${ballotId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await res.json();
      setCloseResult(result);
      await fetchBallot();
    } finally {
      setClosing(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#06054e] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="font-black text-[#06054e] uppercase text-lg mb-1">Access Denied</p>
          <p className="text-slate-500 text-sm">{error || "Ballot not found"}</p>
        </div>
      </div>
    );
  }

  const { ballot, candidates, myVote, voteCounts, isAdmin } = data;
  const isOpen       = ballot.status === "open";
  const isClosed     = ballot.status === "completed" || ballot.status === "closed";
  const showResults  = isClosed || (isAdmin && voteCounts !== null);
  const totalVotes   = ballot.totalVotesCast;
  const hasVoted     = myVote !== null;
  const canVote      = isOpen && data.isEligible && !hasVoted;

  // Sort candidates by votes desc when showing results
  const sortedCandidates = showResults && voteCounts
    ? [...candidates].sort((a, b) => (voteCounts[b.nominationId] ?? 0) - (voteCounts[a.nominationId] ?? 0))
    : candidates;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-[#06054e] text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase mb-3">
            <Vote size={13} />
            <span>Ballot · Round {ballot.ballotNumber}</span>
            {ballot.ballotNumber === 2 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full">Second Ballot</span>
            )}
          </div>

          <h1 className="text-2xl font-black uppercase leading-tight mb-2">
            {isOpen ? "Cast Your Vote" : isClosed ? "Ballot Results" : "Ballot"}
          </h1>

          <div className="flex items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Users size={13} />
              {ballot.totalEligibleVoters} eligible voters
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={13} />
              {ballot.totalVotesCast} votes cast
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} />
              {isClosed ? `Closed ${fmtDate(ballot.completedAt ?? ballot.closeAt)}` : `Closes ${fmtDate(ballot.closeAt)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Status banner */}
        <StatusBanner
          ballot={ballot}
          myVote={myVote}
          isAdmin={isAdmin}
          onClose={handleClose}
          closing={closing}
        />

        {/* Second ballot link */}
        {closeResult?.secondBallot && (
          <div className="flex items-center gap-3 px-5 py-4 bg-orange-50 border border-orange-200 rounded-2xl mb-6">
            <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-black text-sm text-orange-800">Second Ballot Created</p>
              <p className="text-xs text-orange-700 mt-0.5">{closeResult.message}</p>
            </div>
            <a
              href={`/admin/ballots/${closeResult.secondBallot.ballotId}`}
              className="flex items-center gap-1 text-xs font-black text-orange-700 hover:underline"
            >
              Go to Ballot 2 <ChevronRight size={12} />
            </a>
          </div>
        )}

        {/* Not eligible message */}
        {!data.isEligible && !isAdmin && (
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6">
            <Lock size={18} className="text-slate-400 flex-shrink-0" />
            <p className="text-sm text-slate-600 font-semibold">
              You are not on the eligible voter list for this ballot.
            </p>
          </div>
        )}

        {/* Candidates */}
        <div className="space-y-4">
          {sortedCandidates.map((nom) => (
            <CandidateCard
              key={nom.nominationId}
              nom={nom}
              selected={selected === nom.nominationId}
              onSelect={() => { if (canVote) setSelected(nom.nominationId); }}
              disabled={!canVote}
              votedFor={myVote?.nominationId === nom.nominationId}
              voteCount={voteCounts?.[nom.nominationId]}
              totalVotes={totalVotes}
              showResults={showResults}
              isWinner={ballot.winnerId === nom.nominationId}
            />
          ))}
        </div>

        {/* Vote button */}
        {canVote && (
          <div className="mt-8">
            {voteError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm mb-4">
                <AlertCircle size={15} />
                {voteError}
              </div>
            )}
            <button
              onClick={handleVote}
              disabled={!selected || voting}
              className="w-full py-4 bg-[#06054e] text-white font-black uppercase text-sm rounded-2xl hover:bg-[#0a0870] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {voting ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
              {selected ? "Confirm Vote" : "Select a Candidate"}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              Your vote is private. You cannot change it after confirmation.
            </p>
          </div>
        )}

        {/* Quorum indicator (admin) */}
        {isAdmin && isOpen && (
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-3">Voting Progress</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#06054e] rounded-full transition-all"
                  style={{
                    width: ballot.totalEligibleVoters > 0
                      ? `${Math.round((ballot.totalVotesCast / ballot.totalEligibleVoters) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="text-xs font-black text-[#06054e] w-10 text-right">
                {ballot.totalEligibleVoters > 0
                  ? `${Math.round((ballot.totalVotesCast / ballot.totalEligibleVoters) * 100)}%`
                  : "0%"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {ballot.totalVotesCast} of {ballot.totalEligibleVoters} eligible voters have voted
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
