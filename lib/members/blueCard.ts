// Blue Card (Queensland Working with Children check) rules and status for a member.
//
// Club rule (as set by the admin): a member OVER 15 who holds ANY role other than player needs a valid
// blue card. The age limit is a constant so it can be changed in one place. Note the Queensland
// legislation itself is narrower (adults doing child-related regulated work; under-18 volunteers are
// generally exempt), which is why an admin can record an exemption and a reason.

type Doc = Record<string, any>;

export const BLUE_CARD_MIN_AGE_EXCLUSIVE = 15; // "over 15"
export const EXPIRING_SOON_DAYS = 60;

export const CARD_TYPES = ["Blue card", "Exemption card"] as const;
export const CARD_CATEGORIES = ["Volunteer", "Paid employee", "Self-employed / business", "Student placement"] as const;
export const CARD_STATUSES = ["Valid", "Applied (pending)", "Expired", "Suspended", "Cancelled", "Not held"] as const;
export const ISSUING_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;

export function ageOn(dob: unknown, now: Date): number | null {
  const d = new Date(String(dob ?? ""));
  if (!dob || Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** A role counts as "player" when it is the player role or a variant (role-player, role-junior-player…). */
export const isPlayerRole = (r: unknown) => /player/i.test(String(r ?? "").replace(/^role-/, ""));

export function nonPlayerRoles(roles: unknown[] | undefined): string[] {
  return (roles ?? []).map(String).filter((r) => r && !isPlayerRole(r));
}

/** True when the club rule says this member must hold a blue card. Unknown age counts as "possibly" (true). */
export function requiresBlueCard(member: Doc, now = new Date()): boolean {
  if (nonPlayerRoles(member.roles).length === 0) return false;
  const age = ageOn(member.personalInfo?.dateOfBirth, now);
  return age === null ? true : age > BLUE_CARD_MIN_AGE_EXCLUSIVE;
}

export const hasBlueCardData = (bc: Doc | undefined | null) =>
  !!bc && Object.values(bc).some((v) => v !== null && v !== undefined && v !== "" && v !== false);

export type BlueCardState = "valid" | "expiring" | "expired" | "pending" | "exempt" | "blocked" | "missing";

export interface BlueCardStatus {
  state: BlueCardState;
  label: string;
  daysLeft: number | null;
  ok: boolean; // meets the requirement today
}

export function blueCardStatus(bc: Doc | undefined | null, now = new Date()): BlueCardStatus {
  const card = bc ?? {};
  if (card.exempt) return { state: "exempt", label: "Exempt", daysLeft: null, ok: true };
  const status = String(card.status ?? "");
  if (status === "Suspended" || status === "Cancelled") return { state: "blocked", label: status, daysLeft: null, ok: false };
  if (status === "Applied (pending)") return { state: "pending", label: "Application pending", daysLeft: null, ok: false };
  const expiry = card.expiryDate ? new Date(String(card.expiryDate)) : null;
  const hasNumber = !!String(card.cardNumber ?? "").trim();
  if (!hasNumber || !expiry || Number.isNaN(expiry.getTime()) || status === "Not held" || status === "") {
    return { state: "missing", label: "No valid card recorded", daysLeft: null, ok: false };
  }
  const days = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  if (status === "Expired" || days < 0) return { state: "expired", label: "Expired", daysLeft: days, ok: false };
  if (days <= EXPIRING_SOON_DAYS) return { state: "expiring", label: `Expires in ${days} day${days === 1 ? "" : "s"}`, daysLeft: days, ok: true };
  return { state: "valid", label: "Valid", daysLeft: days, ok: true };
}
