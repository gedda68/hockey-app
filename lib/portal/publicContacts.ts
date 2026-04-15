export type PublicContactRow = {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
};

export function sanitizeCommitteeForPublic(
  committee: unknown,
): PublicContactRow[] {
  if (!Array.isArray(committee)) return [];
  const out: PublicContactRow[] = [];
  for (const raw of committee) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const name = typeof r.name === "string" ? r.name : "";
    if (!id || !name) continue;

    const row: PublicContactRow = {
      id,
      name,
      position: typeof r.position === "string" ? r.position : undefined,
    };

    const showEmail = r.showEmailOnPublicSite === true;
    const showPhone = r.showPhoneOnPublicSite === true;

    if (showEmail && typeof r.email === "string" && r.email.trim()) {
      row.email = r.email.trim();
    }
    if (showPhone && typeof r.phone === "string" && r.phone.trim()) {
      row.phone = r.phone.trim();
    }

    out.push(row);
  }
  return out;
}

