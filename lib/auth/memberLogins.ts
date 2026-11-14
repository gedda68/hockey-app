// Username planning for member logins: last name + first initial, adding more letters of the first
// name when that clashes, and a number only when two people share the same full name.

export interface LoginCandidate {
  memberId: string;
  firstName: string;
  lastName: string;
}

const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();

/**
 * @param taken usernames already in use (existing logins); compared lowercase.
 * Returns memberId -> username. Deterministic: people are handled in memberId order.
 */
export function planUsernames(people: LoginCandidate[], taken: Iterable<string> = []): Map<string, string> {
  const used = new Set([...taken].map((t) => t.toLowerCase()));
  const sorted = [...people].sort((a, b) => a.memberId.localeCompare(b.memberId));
  const out = new Map<string, string>();

  // Everyone who shares last name + first initial competes for the short form.
  const groups = new Map<string, LoginCandidate[]>();
  for (const p of sorted) {
    const key = clean(p.lastName) + clean(p.firstName).charAt(0);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  for (const [short, group] of groups) {
    if (group.length === 1 && !used.has(short)) {
      used.add(short);
      out.set(group[0].memberId, short);
      continue;
    }
    // Add letters of the first name until each name is distinct; same full name -> numbered.
    const last = clean(group[0].lastName);
    const maxLen = Math.max(...group.map((p) => clean(p.firstName).length), 1);
    let len = 1;
    const pick = (p: LoginCandidate, n: number) => last + clean(p.firstName).slice(0, n);
    while (len < maxLen) {
      const names = group.map((p) => pick(p, len));
      if (new Set(names).size === names.length && names.every((n) => !used.has(n))) break;
      len++;
    }
    const seen = new Map<string, number>();
    for (const p of group) {
      const base = pick(p, Math.max(len, 1));
      let candidate = base;
      let n = seen.get(base) ?? 0;
      while (used.has(candidate)) { n++; candidate = `${base}${n + 1}`; }
      seen.set(base, n);
      used.add(candidate);
      out.set(p.memberId, candidate);
    }
  }
  return out;
}
