// lib/auth/linkUsers.ts
// Linking staff logins (the `users` collection) to the member record of the same person. A linked login carries
// that member's id in its session, so the member's matrix roles, notifications, appointments and personal screens
// all work for it. Only an unambiguous email match is linked automatically; anything else is shown for a person to
// decide. Pure.

type Doc = Record<string, any>;

export type LinkStatus = "link" | "already" | "ambiguous" | "none" | "name-suggestion";
export interface LinkDecision {
  userId: string; username: string; status: LinkStatus;
  /** The member's Mongo _id (what sessions carry) and their memberId ("MBR-…"). */
  memberObjectId?: string; memberId?: string; memberName?: string; reason: string;
}

export const normEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();
const nameOf = (m: Doc) => `${m?.personalInfo?.firstName ?? ""} ${m?.personalInfo?.lastName ?? ""}`.trim();
const emailsOf = (m: Doc) => [m?.contact?.primaryEmail, m?.contact?.email, m?.auth?.email, m?.personalInfo?.email].map(normEmail).filter(Boolean);
const clubOf = (x: Doc) => String(x?.clubId ?? x?.membership?.clubId ?? "");

export function planLinks(users: Doc[], members: Doc[]): LinkDecision[] {
  const byEmail = new Map<string, Doc[]>();
  for (const m of members) for (const e of new Set(emailsOf(m))) byEmail.set(e, [...(byEmail.get(e) ?? []), m]);

  return users.map((u): LinkDecision => {
    const base = { userId: String(u.userId ?? u._id), username: String(u.username ?? "") };
    const pick = (m: Doc) => ({ memberObjectId: String(m._id), memberId: String(m.memberId ?? ""), memberName: nameOf(m) });
    if (u.memberId) return { ...base, status: "already", reason: "Already linked" };

    // A login that already names exactly one member (users.linkedMembers) is linked to that member.
    const named = (Array.isArray(u.linkedMembers) ? u.linkedMembers : []).map((x: unknown) => String(typeof x === "string" ? x : (x as Doc)?.memberId ?? "")).filter(Boolean);
    if (new Set(named).size === 1) {
      const m = members.find((x) => String(x.memberId) === named[0]);
      if (m) return { ...base, status: "link", ...pick(m), reason: "Named on the login (linkedMembers)" };
    }

    const email = normEmail(u.email);
    const hits = email ? byEmail.get(email) ?? [] : [];
    if (hits.length === 1) return { ...base, status: "link", ...pick(hits[0]), reason: "Same email address" };
    if (hits.length > 1) return { ...base, status: "ambiguous", reason: `${hits.length} members share this email: ${hits.map((m) => m.memberId).join(", ")}` };

    // No email match: a same-name member in the same club is only a suggestion, never linked automatically.
    const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim().toLowerCase();
    if (full && u.clubId) {
      const same = members.filter((m) => nameOf(m).toLowerCase() === full && clubOf(m) === String(u.clubId));
      if (same.length === 1) return { ...base, status: "name-suggestion", ...pick(same[0]), reason: "Same name in the same club (check, then link with --map)" };
    }
    return { ...base, status: "none", reason: "No member with this email" };
  });
}

/** A `--map username=MBR-…` request resolved against the member list. */
export function resolveManual(username: string, memberId: string, users: Doc[], members: Doc[]): LinkDecision {
  const u = users.find((x) => String(x.username ?? "").toLowerCase() === username.toLowerCase());
  const base = { userId: String(u?.userId ?? u?._id ?? ""), username };
  if (!u) return { ...base, status: "none", reason: `No login called "${username}"` };
  if (u.memberId) return { ...base, status: "already", reason: "Already linked" };
  const m = members.find((x) => String(x.memberId) === memberId);
  if (!m) return { ...base, status: "none", reason: `No member ${memberId}` };
  return { ...base, status: "link", memberObjectId: String(m._id), memberId: String(m.memberId), memberName: nameOf(m), reason: "Linked by hand" };
}
