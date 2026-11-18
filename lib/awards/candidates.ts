// lib/awards/candidates.ts — votes waiting, nominations open and award wins, as notifications. Pure.

import type { Candidate } from "@/lib/notifications/candidates";

export interface OpenVoteLike { roundId: string; teamName: string; opponentName?: string; startsAt: string; closesAt: string; clubId?: string }

export function voteCandidates(rows: OpenVoteLike[], now: Date): Candidate[] {
  return rows.filter((r) => Date.parse(r.closesAt) > now.getTime()).map((r) => {
    const when = new Date(r.startsAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
    return {
      dedupeKey: `vote:${r.roundId}`, level: "club" as const, category: "awards" as const, type: "match-vote",
      title: `Who was best on ground? ${r.teamName}, ${when}`,
      message: `Vote for your top three${r.opponentName ? ` against ${r.opponentName}` : ""}. 3, 2 and 1 points.`,
      link: "/admin/my-votes", eventAt: r.startsAt, expiresAt: r.closesAt, ...(r.clubId ? { clubId: r.clubId } : {}),
    };
  });
}

export interface ProgramLike { programId: string; title: string; seasonYear: string; clubId: string; closesAt?: string | null; status: string; announcedAt?: string | null; winnerOf?: string[] }

/** Nominations open (until I've made one), and results for the two weeks after they're announced. */
export function awardProgramCandidates(rows: ProgramLike[], iNominated: Set<string>, now: Date): Candidate[] {
  const out: Candidate[] = [];
  const DAY = 86400_000;
  for (const p of rows) {
    if (p.status === "open" && !iNominated.has(p.programId) && (!p.closesAt || Date.parse(p.closesAt) > now.getTime())) {
      out.push({
        dedupeKey: `awards-open:${p.programId}`, level: "club", category: "awards", type: "award-nominations",
        title: `Nominations are open: ${p.title}`, message: "Nominate someone who deserves an award this season. It takes a minute.",
        link: "/admin/season-awards", eventAt: now.toISOString(), expiresAt: p.closesAt ?? new Date(now.getTime() + 14 * DAY).toISOString(), clubId: p.clubId,
      });
    }
    if (p.status === "announced" && p.announcedAt && now.getTime() - Date.parse(p.announcedAt) < 14 * DAY) {
      const won = (p.winnerOf ?? []).length > 0;
      out.push({
        dedupeKey: `awards-won:${p.programId}:${won ? "w" : "a"}`, level: "club", category: "awards", type: won ? "award-won" : "award-announced",
        title: won ? `Congratulations! You won: ${p.winnerOf!.join(", ")}` : `${p.title}: winners announced`,
        message: won ? `${p.title}. Well deserved.` : "See who took out this season's club awards.",
        link: "/admin/season-awards", eventAt: p.announcedAt, expiresAt: new Date(Date.parse(p.announcedAt) + 14 * DAY).toISOString(), clubId: p.clubId,
      });
    }
  }
  return out;
}
