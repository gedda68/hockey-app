"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type AwardRow = {
  awardRecordId: string;
  awardType: string;
  fixtureId: string | null;
  memberDisplayName: string | null;
  memberId: string;
  teamName: string | null;
  awardLabelSnapshot: string;
  notes: string | null;
  createdAt: string;
};

type AwardsLabels = Record<string, string>;

export function PublicAwardsClient() {
  const sp = useSearchParams();
  const seasonCompetitionId = sp.get("seasonCompetitionId")?.trim() || "";
  const tournamentId = sp.get("tournamentId")?.trim() || "";

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [labels, setLabels] = useState<AwardsLabels | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!seasonCompetitionId && !tournamentId) {
      setTitle("");
      setAwards([]);
      setLabels(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const qs = seasonCompetitionId
        ? `seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`
        : `tournamentId=${encodeURIComponent(tournamentId)}`;
      const res = await fetch(`/api/public/awards?${qs}`);
      const data = (await res.json().catch(() => ({}))) as {
        awards?: AwardRow[];
        awardsLabels?: AwardsLabels;
        competitionName?: string;
        season?: string;
        title?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not load awards");
      }
      setAwards(data.awards ?? []);
      setLabels(data.awardsLabels ?? null);
      if (seasonCompetitionId) {
        setTitle(`${data.competitionName ?? "League"} · ${data.season ?? ""}`.trim());
      } else {
        setTitle(data.title ?? "Tournament");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAwards([]);
      setLabels(null);
      setTitle("");
    } finally {
      setLoading(false);
    }
  }, [seasonCompetitionId, tournamentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!seasonCompetitionId && !tournamentId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        <p className="font-bold text-white">How to view awards</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            From a{" "}
            <Link href="/competitions/leagues" className="text-yellow-200 underline">
              league hub
            </Link>
            , open <strong>Awards</strong>.
          </li>
          <li>
            Append{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">
              ?seasonCompetitionId=…
            </code>{" "}
            or{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">
              ?tournamentId=…
            </code>{" "}
            to this page URL.
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {title && !error ? (
        <h2 className="text-lg font-black uppercase tracking-wide text-yellow-100">{title}</h2>
      ) : null}
      {labels && !error ? (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Using custom award names where configured
        </p>
      ) : null}
      <ul className="space-y-3">
        {awards.map((a) => (
          <li
            key={a.awardRecordId}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/90"
          >
            <p className="text-sm font-black text-yellow-100">{a.awardLabelSnapshot}</p>
            <p className="mt-1 text-sm">
              {a.memberDisplayName ?? a.memberId}
              {a.teamName ? ` · ${a.teamName}` : ""}
            </p>
            {a.fixtureId ? (
              <p className="mt-1 text-[10px] font-mono text-white/40">Match {a.fixtureId}</p>
            ) : null}
            {a.notes ? <p className="mt-1 text-xs italic text-white/60">{a.notes}</p> : null}
            <p className="mt-2 text-[10px] text-white/40">
              {new Date(a.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      {!loading && !error && awards.length === 0 ? (
        <p className="text-sm text-white/60">No awards published for this competition yet.</p>
      ) : null}
    </div>
  );
}
