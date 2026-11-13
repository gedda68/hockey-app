// Finds members who are probably the same person but are NOT exact same-name matches
// (those are handled by the dedupe tool). Read-only: it only reports.

type Doc = Record<string, any>;

export type Confidence = "high" | "medium" | "low";
export interface PossibleDuplicate {
  confidence: Confidence;
  reason: string;
  memberIds: string[];
}

const letters = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Same first name allowing typos and short forms (Matt / Matthew). */
export function similarFirst(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length >= 3 && l.startsWith(s)) return true;
  return editDistance(a, b) <= 1;
}
const similarLast = (a: string, b: string) => !!a && !!b && (a === b || a.includes(b) || b.includes(a) || editDistance(a, b) <= 2);

interface P { id: string; first: string; last: string; dob: string; email: string; phone: string; club: string; name: string }

function person(m: Doc): P | null {
  const pi = m.personalInfo ?? {};
  const first = letters(pi.firstName), last = letters(pi.lastName);
  const id = String(m.memberId ?? "");
  if (!id || (!first && !last)) return null;
  const dob = String(pi.dateOfBirth ?? "").slice(0, 10);
  return {
    id, first, last, dob,
    email: String(m.contact?.primaryEmail ?? m.contact?.email ?? "").trim().toLowerCase(),
    phone: String(m.contact?.mobile ?? m.contact?.phone ?? "").replace(/\D/g, "").slice(-9),
    club: String(m.membership?.clubId ?? m.clubId ?? ""),
    name: `${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim(),
  };
}

export function findPossibleDuplicates(members: Doc[]): PossibleDuplicate[] {
  const people = members.map(person).filter((p): p is P => !!p);
  const found = new Map<string, PossibleDuplicate>();
  const add = (confidence: Confidence, reason: string, a: P, b: P) => {
    if (a.id === b.id) return;
    // exact same name is the dedupe tool's job
    if (a.first === b.first && a.last === b.last && reason !== "same email and same name") return;
    const ids = [a.id, b.id].sort();
    const key = ids.join("|");
    const rank = { high: 3, medium: 2, low: 1 };
    const cur = found.get(key);
    if (!cur || rank[confidence] > rank[cur.confidence]) found.set(key, { confidence, reason, memberIds: ids });
  };
  const bucket = (keyOf: (p: P) => string | undefined) => {
    const m = new Map<string, P[]>();
    for (const p of people) { const k = keyOf(p); if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(p); }
    return [...m.values()].filter((g) => g.length > 1 && g.length <= 30);
  };
  const pairs = (g: P[], fn: (a: P, b: P) => void) => { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) fn(g[i], g[j]); };

  // Same birthday: similar names
  for (const g of bucket((p) => p.dob)) pairs(g, (a, b) => {
    if (a.last === b.last && similarFirst(a.first, b.first)) add("high", "same birthday, same surname, similar first name", a, b);
    else if (a.first === b.first && similarLast(a.last, b.last)) add("high", "same birthday, same first name, similar surname", a, b);
    else if (a.first === b.last && a.last === b.first) add("high", "same birthday, first and last names swapped", a, b);
  });
  // Same surname: similar first name in the same club
  for (const g of bucket((p) => p.last)) pairs(g, (a, b) => {
    if (a.first !== b.first && similarFirst(a.first, b.first) && a.club && a.club === b.club && (!a.dob || !b.dob || a.dob === b.dob))
      add("medium", "same surname and club, similar first name", a, b);
  });
  // Swapped names
  for (const g of bucket((p) => (p.first && p.last ? [p.first, p.last].sort().join("|") : undefined))) pairs(g, (a, b) => {
    if (a.first === b.last && a.last === b.first && a.first !== a.last) add("medium", "first and last names swapped", a, b);
  });
  // Same email
  for (const g of bucket((p) => p.email)) pairs(g, (a, b) => {
    if (a.last === b.last && similarFirst(a.first, b.first)) add("high", "same email and same name", a, b);
    else if (a.last !== b.last || !similarFirst(a.first, b.first)) add("low", "same email, different people? (may be family)", a, b);
  });
  // Same phone + surname
  for (const g of bucket((p) => (p.phone.length >= 8 ? p.phone : undefined))) pairs(g, (a, b) => {
    if (a.last === b.last && similarFirst(a.first, b.first)) add("medium", "same phone and surname, similar first name", a, b);
  });

  return [...found.values()].sort((x, y) => ({ high: 0, medium: 1, low: 2 })[x.confidence] - ({ high: 0, medium: 1, low: 2 })[y.confidence]);
}
