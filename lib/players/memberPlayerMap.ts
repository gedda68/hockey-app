// A player is a member. These helpers map the single member document to the flat shape the player
// form uses, and map player edits back onto the member's own fields — so member and player data are
// always the same data (address, gender, contact, medical, positions, …).

type Doc = Record<string, any>;
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** Member document -> the extra, flat fields the player form reads. */
export function playerViewFields(m: Doc): Doc {
  const pi = m.personalInfo ?? {};
  const ct = m.contact ?? {};
  const ad = m.address ?? {};
  const plr = m.playerInfo ?? {};
  const med = m.medical ?? {};
  const hc = m.healthcare ?? {};
  const medicare = med.medicare ?? hc.medicare ?? {};
  const priv = med.privateHealth ?? hc.privateHealth ?? {};
  return {
    salutation: s(pi.salutation),
    // Address (member keeps it as an object; the player form uses flat fields)
    street: s(ad.street),
    suburb: s(ad.suburb),
    city: s(ad.city ?? ad.suburb),
    state: s(ad.state),
    postcode: s(ad.postcode),
    country: s(ad.country) || "Australia",
    primaryPosition: s(plr.primaryPosition ?? plr.position),
    secondaryPosition: s(plr.secondaryPosition),
    jerseyNumber: plr.jerseyNumber ?? null,
    guardians: Array.isArray(m.guardians) ? m.guardians : [],
    medical: {
      conditions: s(med.conditions),
      allergies: s(med.allergies),
      medications: s(med.medications),
      bloodType: s(med.bloodType),
      doctorName: s(med.doctorName),
      doctorPhone: s(med.doctorPhone),
      doctorPractice: s(med.doctorPractice),
      healthFundName: s(priv.provider),
      healthFundNumber: s(priv.membershipNumber),
      medicareNumber: s(medicare.number),
      injuryHistory: Array.isArray(med.injuryHistory) ? med.injuryHistory : [],
    },
  };
}

/**
 * Player-form edits (flat) -> `$set` paths on the member. Only fields present in `body` are written,
 * using dotted paths so nothing else on the member is overwritten.
 */
export function playerEditToMemberSet(body: Doc): Doc {
  const set: Doc = {};
  const put = (path: string, v: unknown) => { if (v !== undefined) set[path] = v; };

  // Personal
  put("personalInfo.firstName", body.firstName);
  put("personalInfo.lastName", body.lastName);
  put("personalInfo.dateOfBirth", body.dateOfBirth);
  put("personalInfo.gender", body.gender);
  put("personalInfo.salutation", body.salutation);
  put("personalInfo.displayName", body.preferredName);
  put("personalInfo.photoUrl", body.photo);
  // Contact
  put("contact.primaryEmail", body.email);
  put("contact.mobile", body.phone);
  // Address
  for (const k of ["street", "suburb", "city", "state", "postcode", "country"]) put(`address.${k}`, body[k]);
  // Player specifics
  put("playerInfo.primaryPosition", body.primaryPosition);
  put("playerInfo.secondaryPosition", body.secondaryPosition);
  put("playerInfo.jerseyNumber", body.jerseyNumber);
  // Medical
  const med = body.medical;
  if (med && typeof med === "object") {
    for (const k of ["conditions", "allergies", "medications", "bloodType", "doctorName", "doctorPhone", "doctorPractice", "injuryHistory"]) {
      put(`medical.${k}`, med[k]);
    }
    put("medical.privateHealth.provider", med.healthFundName);
    put("medical.privateHealth.membershipNumber", med.healthFundNumber);
    put("medical.medicare.number", med.medicareNumber);
  }
  put("guardians", Array.isArray(body.guardians) ? body.guardians : undefined);
  return set;
}
