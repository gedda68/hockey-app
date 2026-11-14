// Self-service "My Details" edits beyond the basic contact/address/emergency fields:
// personal preferences, several emergency contacts, healthcare, medical and blue card.
// Pure functions so the rules are unit-tested; the route applies the result.
//
// Identity (legal name, date of birth) and membership/club fields stay admin-only.
// Blue card: members enter their own card details, but verification fields are protected
// (see applyBlueCardUpdate) so a self-edit can never mark a card as verified.

import { CARD_TYPES, CARD_CATEGORIES, CARD_STATUSES, ISSUING_STATES } from "@/lib/members/blueCard";

type Doc = Record<string, any>;

const MAX_CONTACTS = 5;
const s = (v: unknown, max = 200): string => String(v ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SelfDetailsResult {
  /** Top-level fields to $set (dot paths), ready for Mongo. */
  $set: Record<string, unknown>;
  /** Group keys touched, for the lock check (e.g. "healthcare", "blueCard", "medical.allergies"). */
  touched: string[];
  errors: string[];
}

const oneOf = <T extends readonly string[]>(list: T, v: unknown): string => {
  const x = s(v, 60);
  return (list as readonly string[]).includes(x) ? x : "";
};

export function sanitizeSelfDetails(body: Doc, existing: Doc): SelfDetailsResult {
  const $set: Record<string, unknown> = {};
  const touched: string[] = [];
  const errors: string[] = [];

  const pi = body.personalInfo;
  if (pi && typeof pi === "object") {
    for (const f of ["salutation", "displayName", "gender"] as const) {
      if (pi[f] !== undefined) {
        $set[`personalInfo.${f}`] = s(pi[f], 80);
        touched.push(`personalInfo.${f}`);
      }
    }
  }

  if (body.contact?.primaryEmail !== undefined) {
    const email = s(body.contact.primaryEmail);
    if (email && !EMAIL.test(email)) errors.push("Email address is not valid");
    else {
      $set["contact.primaryEmail"] = email;
      touched.push("contact.primaryEmail");
    }
  }

  if (Array.isArray(body.emergencyContacts)) {
    const prev: Doc[] = Array.isArray(existing.emergencyContacts) ? existing.emergencyContacts : [];
    const list: Doc[] = [];
    body.emergencyContacts.slice(0, MAX_CONTACTS).forEach((c: Doc, i: number) => {
      const name = s(c?.name);
      if (!name) return; // blank rows are dropped
      const email = s(c?.email);
      if (email && !EMAIL.test(email)) errors.push(`Contact ${i + 1}: email is not valid`);
      const contactId = s(c?.contactId, 60) || prev[i]?.contactId || `EC-${Date.now().toString(36)}-${i + 1}`;
      list.push({
        contactId,
        priority: list.length + 1,
        name,
        relationship: s(c?.relationship, 80),
        phone: s(c?.phone, 40),
        mobile: s(c?.mobile, 40),
        email,
      });
    });
    $set.emergencyContacts = list;
    touched.push("emergencyContacts");
  }

  const hc = body.healthcare;
  if (hc && typeof hc === "object") {
    if (hc.medicare !== undefined) {
      const m = hc.medicare;
      $set["healthcare.medicare"] =
        m && s(m.number)
          ? { number: s(m.number, 20), position: s(m.position, 4), expiryMonth: s(m.expiryMonth, 2), expiryYear: s(m.expiryYear, 4) }
          : null;
      touched.push("healthcare");
    }
    if (hc.privateHealth !== undefined) {
      const p = hc.privateHealth;
      $set["healthcare.privateHealth"] =
        p && (s(p.provider) || s(p.membershipNumber))
          ? { provider: s(p.provider, 100), membershipNumber: s(p.membershipNumber, 40), expiryDate: s(p.expiryDate, 10) }
          : null;
      touched.push("healthcare");
    }
  }

  const med = body.medical;
  if (med && typeof med === "object") {
    for (const f of ["conditions", "medications", "allergies"] as const) {
      if (med[f] !== undefined) {
        $set[`medical.${f}`] = s(med[f], 1000);
        touched.push(`medical.${f}`);
      }
    }
  }

  if (body.blueCard && typeof body.blueCard === "object") {
    const b = body.blueCard;
    const card: Doc = {
      cardType: oneOf(CARD_TYPES, b.cardType),
      category: oneOf(CARD_CATEGORIES, b.category),
      status: oneOf(CARD_STATUSES, b.status),
      cardNumber: s(b.cardNumber, 30),
      nameOnCard: s(b.nameOnCard, 120),
      issuingState: oneOf(ISSUING_STATES, b.issuingState),
      issueDate: s(b.issueDate, 10),
      expiryDate: s(b.expiryDate, 10),
      verifierMemberId: s(b.verifierMemberId, 60),
    };
    // Merge over what is stored so protected/verification fields survive until the workflow handles them.
    $set.__blueCardIncoming = { ...(existing.blueCard ?? {}), ...card };
    touched.push("blueCard");
  }

  return { $set, touched, errors };
}

/** True when a lock such as "healthcare" or "medical" covers a touched path. */
export function blockedByLocks(touched: string[], locked: string[]): string[] {
  return touched.filter((t) => locked.some((l) => t === l || t.startsWith(`${l}.`) || l.startsWith(`${t}.`)));
}
