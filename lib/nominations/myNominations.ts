// lib/nominations/myNominations.ts
// Splits a person's rep nominations into "about me" (I am the nominee) and "made by me" (I nominated someone else),
// and gives each status a plain label. Pure, so the API and tests share it.

export interface RawNomination {
  nominationId?: string;
  season?: string;
  ageGroup?: string;
  clubName?: string;
  status?: string;
  nominationType?: string;
  role?: string | null;
  position?: string | null;
  nominatedAt?: string;
  updatedAt?: string;
  nomineeId?: string;
  nomineeName?: string;
  memberId?: string;
  playerId?: string;
  memberName?: string;
  nominatedBy?: string;
  nominatedByName?: string;
  notes?: string;
}

export interface MyNomination {
  nominationId: string;
  season: string;
  ageGroup: string;
  clubName: string;
  status: string;
  statusLabel: string;
  /** What it is for: a position or "Player". */
  position: string;
  nomineeName: string;
  /** "self" for a self-nomination, otherwise who put the name forward. */
  nominatedBy: "self" | { name: string };
  nominatedAt: string | null;
  tournamentTitle: string | null;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Under review",
  submitted: "Under review",
  accepted: "Selected",
  selected: "Selected",
  rejected: "Unsuccessful",
  declined: "Unsuccessful",
  withdrawn: "Withdrawn",
};
export const statusLabel = (s: unknown) => STATUS_LABEL[String(s ?? "pending")] ?? String(s ?? "Under review");

const POSITION_LABEL: Record<string, string> = {
  "head-coach": "Head coach", "assistant-coach": "Assistant coach", manager: "Manager", selector: "Selector",
  umpire: "Umpire", official: "Official", player: "Player",
};
function positionOf(n: RawNomination): string {
  const key = String(n.position ?? n.role ?? (n.nominationType === "official" ? "official" : "player")).toLowerCase();
  return POSITION_LABEL[key] ?? key.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** `ids` is every identifier the person goes by (member number, member _id, login id). */
export function splitNominations(rows: RawNomination[], ids: string[], tournaments: Map<string, string> = new Map()): { aboutMe: MyNomination[]; madeByMe: MyNomination[] } {
  const me = new Set(ids.filter(Boolean).map(String));
  const isMe = (v?: string) => !!v && me.has(String(v));
  const aboutMe: MyNomination[] = [];
  const madeByMe: MyNomination[] = [];
  for (const n of rows) {
    const nominee = [n.nomineeId, n.memberId, n.playerId].some(isMe);
    const byMe = isMe(n.nominatedBy);
    const item: MyNomination = {
      nominationId: String(n.nominationId ?? ""),
      season: String(n.season ?? ""),
      ageGroup: String(n.ageGroup ?? ""),
      clubName: String(n.clubName ?? ""),
      status: String(n.status ?? "pending"),
      statusLabel: statusLabel(n.status),
      position: positionOf(n),
      nomineeName: String(n.nomineeName ?? n.memberName ?? ""),
      nominatedBy: !n.nominatedBy || nominee && isMe(n.nominatedBy) ? "self" : { name: String(n.nominatedByName ?? "Someone at your club") },
      nominatedAt: n.nominatedAt ?? null,
      tournamentTitle: tournaments.get(`${n.season}||${n.ageGroup}`) ?? null,
    };
    if (nominee) aboutMe.push(item);
    else if (byMe) madeByMe.push(item);
  }
  const newest = (a: MyNomination, b: MyNomination) => String(b.nominatedAt ?? "").localeCompare(String(a.nominatedAt ?? ""));
  return { aboutMe: aboutMe.sort(newest), madeByMe: madeByMe.sort(newest) };
}
