import { describe, it, expect, beforeEach } from "vitest";
import { join, keepShift, release } from "@/lib/volunteers/service";

// A tiny in-memory stand-in for the collections the service uses (equality and $in matching only).
type Doc = Record<string, any>;
function matches(d: Doc, q: Doc) {
  return Object.entries(q).every(([k, v]) => (v && typeof v === "object" && "$in" in v ? (v.$in as unknown[]).includes(d[k]) : d[k] === v));
}
function makeDb(tables: Record<string, Doc[]>) {
  const col = (name: string) => {
    const rows = (tables[name] ??= []);
    const cursor = (list: Doc[]) => ({ sort: () => cursor(list), limit: () => cursor(list), toArray: async () => list, next: async () => list[0] ?? null });
    return {
      find: (q: Doc = {}) => cursor(rows.filter((d) => matches(d, q))),
      findOne: async (q: Doc) => rows.find((d) => matches(d, q)) ?? null,
      insertOne: async (d: Doc) => { rows.push({ ...d }); },
      deleteOne: async (q: Doc) => { const i = rows.findIndex((d) => matches(d, q)); if (i >= 0) rows.splice(i, 1); },
      updateOne: async (q: Doc, u: Doc) => { const d = rows.find((x) => matches(x, q)); if (d) { Object.assign(d, u.$set ?? {}); for (const k of Object.keys(u.$unset ?? {})) delete d[k]; } return { matchedCount: d ? 1 : 0 }; },
      findOneAndUpdate: async (q: Doc, u: Doc) => { const d = rows.find((x) => matches(x, q)); if (!d) return null; const before = { ...d }; Object.assign(d, u.$set ?? {}); return before; },
    };
  };
  return { collection: col } as never;
}

const NOW = new Date("2026-12-01T00:00:00Z"); // Tue 10:00 Brisbane
const shift = (o: Doc = {}) => ({ shiftId: "S1", clubId: "chc", label: "Canteen", date: "2026-12-12", startTime: "08:00", endTime: "11:00", slots: 2, status: "open", ...o });

describe("volunteer sign-up, leaving and swapping", () => {
  let t: Record<string, Doc[]>;
  beforeEach(() => { t = { volunteer_shifts: [shift()], volunteer_signups: [], members: [{ memberId: "a", personalInfo: { firstName: "Ann", lastName: "A" } }, { memberId: "b", personalInfo: { firstName: "Bo", lastName: "B" } }, { memberId: "c", personalInfo: { firstName: "Cy", lastName: "C" } }] }; });

  it("signs up until the shift is full, then says so", async () => {
    const db = makeDb(t);
    expect((await join(db, "S1", "a", "signup", NOW)).ok).toBe(true);
    expect((await join(db, "S1", "b", "signup", NOW)).ok).toBe(true);
    expect(await join(db, "S1", "c", "signup", NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/full/) });
    expect(t.volunteer_signups.map((s) => s.name)).toEqual(["Ann A", "Bo B"]);
  });
  it("won't sign someone up twice", async () => {
    const db = makeDb(t);
    await join(db, "S1", "a", "signup", NOW);
    expect((await join(db, "S1", "a", "signup", NOW)).ok).toBe(false);
  });
  it("leaving more than two days out frees the place", async () => {
    const db = makeDb(t);
    await join(db, "S1", "a", "signup", NOW);
    expect((await release(db, "S1", "a", NOW)).ok).toBe(true);
    expect(t.volunteer_signups[0].status).toBe("cancelled");
    expect((await join(db, "S1", "c", "signup", NOW)).ok).toBe(true);
  });
  it("leaving within two days asks for cover and keeps them on until someone takes over", async () => {
    t.volunteer_shifts = [shift({ date: "2026-12-02" })]; // Wed 08:00 local, 22h away
    const db = makeDb(t);
    await join(db, "S1", "a", "signup", NOW);
    await join(db, "S1", "b", "signup", NOW);
    expect(await release(db, "S1", "a", NOW)).toMatchObject({ ok: true, message: expect.stringMatching(/Cover requested/) });
    expect(t.volunteer_signups.find((s) => s.memberId === "a")?.status).toBe("swap_requested");
    // still full for sign-ups, but cover is available
    expect((await join(db, "S1", "c", "signup", NOW)).ok).toBe(false);
    expect((await join(db, "S1", "c", "takeover", NOW)).ok).toBe(true);
    expect(t.volunteer_signups.find((s) => s.memberId === "a")?.status).toBe("swapped");
    expect(t.volunteer_signups.find((s) => s.memberId === "c")).toMatchObject({ status: "confirmed", tookOverFrom: "a" });
    // nobody left needing cover
    expect((await join(db, "S1", "a", "takeover", NOW)).ok).toBe(false);
  });
  it("can ask for cover early on purpose, and change their mind", async () => {
    const db = makeDb(t);
    await join(db, "S1", "a", "signup", NOW);
    await release(db, "S1", "a", NOW, true);
    expect(t.volunteer_signups[0].status).toBe("swap_requested");
    expect((await keepShift(db, "S1", "a")).ok).toBe(true);
    expect(t.volunteer_signups[0].status).toBe("confirmed");
    expect((await keepShift(db, "S1", "a")).ok).toBe(false);
  });
  it("can't leave a shift once it has started, or take a clashing one", async () => {
    const db = makeDb(t);
    await join(db, "S1", "a", "signup", NOW);
    expect((await release(db, "S1", "a", new Date("2026-12-11T23:00:00Z"))).ok).toBe(false); // Sat 09:00 local
    t.volunteer_shifts.push(shift({ shiftId: "S2", label: "Scoring", startTime: "10:00", endTime: "13:00" }));
    expect(await join(db, "S2", "a", "signup", NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/clash/) });
  });
});
