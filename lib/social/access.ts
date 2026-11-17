// lib/social/access.ts — which clubs/associations a person may post for. The same people who can write
// announcements (Communications edit, or a club-running login role), limited to the organisations they can act for.

import type { SessionData } from "@/lib/auth/session";
import { canWriteTo, writableAudiences } from "@/lib/announcements/access";
import type { Owner } from "@/lib/social/posts";

/** Every organisation this person may manage social posts for (their own club and association). */
export async function ownersFor(session: SessionData): Promise<Owner[] | null> {
  const audiences = await writableAudiences(session);
  if (!audiences) return null;
  const out: Owner[] = [];
  if (session.clubId && audiences.includes("club") && (await canWriteTo(session, "club", session.clubId))) out.push({ level: "club", id: session.clubId });
  if (session.associationId && audiences.includes("association") && (await canWriteTo(session, "association", session.associationId))) out.push({ level: "association", id: session.associationId });
  return out;
}

/** The organisation a request is about: the one named, if the person may act for it, otherwise their only/first one. */
export async function resolveOwner(session: SessionData, ask?: { level?: unknown; id?: unknown }): Promise<{ owner: Owner } | { error: string; status: number }> {
  const audiences = await writableAudiences(session);
  if (!audiences) return { error: "You can't manage social posts", status: 403 };
  const level = ask?.level === "association" ? "association" : ask?.level === "club" ? "club" : session.clubId ? "club" : "association";
  const id = String(ask?.id ?? "").trim() || (level === "club" ? session.clubId : session.associationId) || "";
  if (!id) return { error: "Choose a club or association", status: 400 };
  if (!audiences.includes(level) || !(await canWriteTo(session, level, id))) return { error: "You can't post for that organisation", status: 403 };
  return { owner: { level, id } };
}
