// Contact privacy. A member can make ALL their contact details private (phone(s), email, address).
// While private they must not be shared with anyone else — other members, clubs, associations,
// public pages or exports — so every place that returns another person's member record runs it
// through redactPrivateContact(). The member themselves always sees their own details.
//
// Emergency contacts are other people's details the member chose to give the club; they stay.

type Doc = Record<string, any>;

export const isContactPrivate = (m: Doc | null | undefined): boolean => m?.privacy?.contactPrivate === true;

const BLANK_ADDRESS = { street: "", suburb: "", state: "", postcode: "", country: "" };

/** Copy of the member with phone(s), email and address removed when they've made them private. */
export function redactPrivateContact<T extends Doc>(member: T, viewer?: string | null | (string | null | undefined)[]): T {
  if (!member || !isContactPrivate(member)) return member;
  const ids = (Array.isArray(viewer) ? viewer : [viewer]).filter(Boolean).map(String);
  // The owner may be identified by the memberId string or the Mongo _id carried in their session.
  if (ids.includes(String(member.memberId)) || (member._id && ids.includes(String(member._id)))) return member;
  const contact = { ...(member.contact ?? {}) };
  for (const k of ["email", "primaryEmail", "phone", "mobile", "homePhone", "workPhone", "alternateEmail"]) {
    if (k in contact) contact[k] = "";
  }
  return {
    ...member,
    contact,
    ...(member.address ? { address: { ...BLANK_ADDRESS } } : {}),
    // top-level legacy copies some imports keep
    ...("email" in member ? { email: "" } : {}),
    ...("phone" in member ? { phone: "" } : {}),
    ...("mobile" in member ? { mobile: "" } : {}),
    contactPrivate: true,
  };
}

/**
 * Contact details a member may offer as a prefill (e.g. when someone links them as an emergency
 * contact). Nothing at all when they are private.
 */
export function shareableContact(member: Doc): { phone: string; mobile: string; email: string } | null {
  if (isContactPrivate(member)) return null;
  const c = member.contact ?? {};
  return {
    phone: String(c.phone ?? ""),
    mobile: String(c.mobile ?? ""),
    email: String(c.primaryEmail ?? c.email ?? ""),
  };
}

/** Contact/address fields a non-owner must not change while the member's details are private. */
export const PRIVATE_LOCKED_PREFIXES = ["contact.", "address."];

/**
 * Admin saves send back whatever the (redacted) edit form held. While a member's details are private,
 * anyone but the owner keeps the stored contact/address/privacy values so a save can neither wipe nor change them.
 */
export function preservePrivateFields<T extends Doc>(existing: Doc, update: T, isOwner: boolean): T {
  if (isOwner || !isContactPrivate(existing)) return update;
  const out: Doc = { ...update };
  for (const k of ["contact", "address", "privacy"]) {
    if (k in out) out[k] = existing[k];
  }
  for (const k of Object.keys(out)) {
    if (PRIVATE_LOCKED_PREFIXES.some((pre) => k.startsWith(pre)) || k === "privacy.contactPrivate") out[k] = undefined;
  }
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out as T;
}
