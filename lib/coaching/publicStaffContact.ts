// G3 — Strip or allow email/phone on public staff views (teamRosters + legacy rosters).

export type MemberContactForPublic = {
  email?: string | null;
  phone?: string | null;
};

export type PublicStaffRow = {
  id: string;
  role: string;
  staffRoleCode?: string;
  memberId: string;
  memberName?: string;
  qualifications?: string[];
  email?: string;
  phone?: string;
};

/**
 * Build a public-safe staff row. Contact comes from the linked member when flags allow.
 * Never exposes `wwccCardNumber`.
 */
export function buildPublicStaffRow(
  staff: Record<string, unknown>,
  memberContact: MemberContactForPublic | null,
): PublicStaffRow | null {
  const id = typeof staff.id === "string" ? staff.id : "";
  const memberId = typeof staff.memberId === "string" ? staff.memberId : "";
  if (!id || !memberId) return null;

  const showEmail = staff.showEmailOnPublicSite === true;
  const showPhone = staff.showPhoneOnPublicSite === true;

  let qualifications: string[] | undefined;
  if (Array.isArray(staff.qualifications)) {
    qualifications = staff.qualifications.map((q) =>
      typeof q === "string" ? q : (q as { name?: string })?.name ?? "",
    ).filter(Boolean);
    if (qualifications.length === 0) qualifications = undefined;
  }

  const row: PublicStaffRow = {
    id,
    role: typeof staff.role === "string" ? staff.role : "",
    staffRoleCode:
      typeof staff.staffRoleCode === "string" ? staff.staffRoleCode : undefined,
    memberId,
    memberName:
      typeof staff.memberName === "string" ? staff.memberName : undefined,
    qualifications,
  };

  if (showEmail && memberContact?.email?.trim()) {
    row.email = memberContact.email.trim();
  }
  if (showPhone && memberContact?.phone?.trim()) {
    row.phone = memberContact.phone.trim();
  }

  return row;
}

/** Sanitize `teams[].staff[]` on teamRosters documents for public API responses. */
export function mapTeamsStaffForPublic(
  teams: unknown,
  memberById: Map<string, MemberContactForPublic>,
): Array<{ name?: string; staff: PublicStaffRow[] }> {
  if (!Array.isArray(teams)) return [];
  return teams.map((t) => {
    const team = t as Record<string, unknown>;
    const name = typeof team.name === "string" ? team.name : undefined;
    const rawStaff = team.staff;
    const staffOut: PublicStaffRow[] = [];
    if (Array.isArray(rawStaff)) {
      for (const s of rawStaff) {
        if (!s || typeof s !== "object") continue;
        const rec = s as Record<string, unknown>;
        const mid = typeof rec.memberId === "string" ? rec.memberId : "";
        const pub = buildPublicStaffRow(rec, mid ? memberById.get(mid) ?? null : null);
        if (pub) staffOut.push(pub);
      }
    }
    return { name, staff: staffOut };
  });
}

/**
 * Legacy `rosters` collection: `teams[].staff` is often `Record<string, Person>`.
 * Remove email/phone-like fields unless explicit opt-in flags exist.
 */
export function sanitizeLegacyStaffPerson(
  person: Record<string, unknown>,
): Record<string, unknown> {
  const showEmail = person.showEmailOnPublicSite === true;
  const showPhone = person.showPhoneOnPublicSite === true;
  const next = { ...person };
  delete next.wwccCardNumber;
  if (!showEmail) {
    delete next.email;
    delete next.primaryEmail;
  }
  if (!showPhone) {
    delete next.phone;
    delete next.mobile;
  }
  return next;
}

export function sanitizeLegacyRosterTeamsStaff(teams: unknown): void {
  if (!Array.isArray(teams)) return;
  for (const t of teams) {
    if (!t || typeof t !== "object") continue;
    const staff = (t as Record<string, unknown>).staff;
    if (!staff || typeof staff !== "object" || Array.isArray(staff)) continue;
    for (const key of Object.keys(staff)) {
      const p = (staff as Record<string, unknown>)[key];
      if (p && typeof p === "object" && !Array.isArray(p)) {
        (staff as Record<string, unknown>)[key] = sanitizeLegacyStaffPerson(
          p as Record<string, unknown>,
        );
      }
    }
  }
}
