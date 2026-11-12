import { beforeEach, describe, expect, it } from "vitest";
import { runDedupe, type CollectionLike, type DbLike } from "@/lib/members/dedupeRunner";
import type { Doc } from "@/lib/members/dedupe";

/** Minimal in-memory stand-in for the parts of a MongoDB Db the runner uses. */
function fakeDb(seed: Record<string, Doc[]>) {
  const data: Record<string, Doc[]> = JSON.parse(JSON.stringify(seed));
  const writes: string[] = [];
  const col = (name: string): CollectionLike => {
    const rows = () => (data[name] ??= []);
    const match = (d: Doc, f: Doc) => Object.entries(f).every(([k, v]) => d[k] === v);
    return {
      find: (f: Doc) => {
        const out = rows().filter((d) => match(d, f)).map((d) => JSON.parse(JSON.stringify(d)));
        return Object.assign(
          { toArray: async () => out },
          { [Symbol.asyncIterator]: async function* () { for (const d of out) yield d; } },
        ) as never;
      },
      findOne: async (f) => {
        const d = rows().find((x) => match(x, f));
        return d ? JSON.parse(JSON.stringify(d)) : null;
      },
      replaceOne: async (f, doc) => {
        writes.push(`replace:${name}`);
        const i = rows().findIndex((x) => match(x, f));
        if (i >= 0) rows()[i] = JSON.parse(JSON.stringify(doc));
      },
      insertOne: async (doc) => { writes.push(`insert:${name}`); rows().push(JSON.parse(JSON.stringify(doc))); },
      deleteOne: async (f) => {
        writes.push(`delete:${name}`);
        const i = rows().findIndex((x) => match(x, f));
        if (i >= 0) rows().splice(i, 1);
      },
    };
  };
  const db: DbLike = {
    listCollections: () => ({ toArray: async () => Object.keys(data).map((name) => ({ name })) }),
    collection: col,
  };
  return { db, data, writes };
}

const person = (memberId: string, o: Doc = {}, p: Doc = {}): Doc => ({
  _id: `oid-${memberId}`,
  memberId,
  clubId: "",
  roles: [],
  personalInfo: { firstName: "Mitchell", lastName: "Aitchison", dateOfBirth: "2001-05-04", ...p },
  ...o,
});

const seed = (): Record<string, Doc[]> => ({
  members: [
    person("MBR-ALT-11226", { clubId: "commercial", roles: ["role-player"], membership: { status: "Active" } }),
    person("MBR-ALT-OFF-AITCHISON-MITCHELL"),
    // Blair Brown: a player record and a coach-only record
    person("MBR-ALT-19761", { roles: ["role-player"] }, { firstName: "Blair", lastName: "Brown", dateOfBirth: "1998-03-03" }),
    person("MBR-ALT-STAFF-RDC-BROWN-BLAIR", { roles: ["role-coach"] }, { firstName: "Blair", lastName: "Brown", dateOfBirth: "1998-03-03" }),
    // unrelated
    person("MBR-9", {}, { firstName: "Zed", lastName: "Zebra", dateOfBirth: "1990-01-01" }),
  ],
  teamRosters: [
    { _id: "r1", teamId: "t1", memberIds: ["MBR-ALT-OFF-AITCHISON-MITCHELL", "MBR-9"] },
    { _id: "r2", teamId: "t2", memberIds: ["MBR-ALT-11226", "MBR-ALT-OFF-AITCHISON-MITCHELL"] },
  ],
  league_fixtures: [
    { _id: "f1", goals: [{ playerId: "MBR-ALT-OFF-AITCHISON-MITCHELL", minute: 4 }] },
    { _id: "f2", coachMemberId: "MBR-ALT-STAFF-RDC-BROWN-BLAIR" },
  ],
  users: [{ _id: "u1", memberId: "MBR-ALT-STAFF-RDC-BROWN-BLAIR", email: "blair@x.com" }],
  member_audit_log: [{ _id: "a1", memberId: "MBR-ALT-OFF-AITCHISON-MITCHELL", action: "created" }],
});

let env: ReturnType<typeof fakeDb>;
beforeEach(() => { env = fakeDb(seed()); });

describe("runDedupe — dry run", () => {
  it("reports the plan and changes nothing", async () => {
    const r = await runDedupe(env.db, { apply: false });
    expect(env.writes).toEqual([]);
    expect(r.plans).toHaveLength(2);
    expect(r.merged).toBe(0);
    const mitchell = r.plans.find((p) => p.group.nameKey === "mitchell|aitchison")!;
    expect(mitchell.survivorId).toBe("MBR-ALT-11226");
    expect(mitchell.loserIds).toEqual(["MBR-ALT-OFF-AITCHISON-MITCHELL"]);
    expect(r.historyOnly).toEqual({ member_audit_log: 1 });
  });
});

describe("runDedupe — apply", () => {
  it("keeps the player record, merges roles, and removes the extras", async () => {
    const r = await runDedupe(env.db, { apply: true, now: "2026-11-12T00:00:00.000Z" });
    expect(r.merged).toBe(2);

    const ids = env.data.members.map((m) => m.memberId).sort();
    expect(ids).toEqual(["MBR-9", "MBR-ALT-11226", "MBR-ALT-19761"]);

    const blair = env.data.members.find((m) => m.memberId === "MBR-ALT-19761")!;
    expect(blair.roles).toEqual(["role-player", "role-coach"]);
    expect(blair.mergedFromMemberIds).toEqual(["MBR-ALT-STAFF-RDC-BROWN-BLAIR"]);

    const mitchell = env.data.members.find((m) => m.memberId === "MBR-ALT-11226")!;
    expect(mitchell.clubId).toBe("commercial");
  });

  it("re-points every reference, including the login and fixtures", async () => {
    await runDedupe(env.db, { apply: true });
    expect(env.data.teamRosters.find((r) => r._id === "r1")!.memberIds).toEqual(["MBR-ALT-11226", "MBR-9"]);
    // roster that had BOTH duplicates now lists the player once
    expect(env.data.teamRosters.find((r) => r._id === "r2")!.memberIds).toEqual(["MBR-ALT-11226"]);
    expect(env.data.league_fixtures.find((f) => f._id === "f1")!.goals).toEqual([
      { playerId: "MBR-ALT-11226", minute: 4 },
    ]);
    expect(env.data.league_fixtures.find((f) => f._id === "f2")!.coachMemberId).toBe("MBR-ALT-19761");
    expect(env.data.users[0].memberId).toBe("MBR-ALT-19761");
  });

  it("leaves no reference to a removed id outside history", async () => {
    await runDedupe(env.db, { apply: true });
    // the survivor's own `mergedFromMemberIds` is the intentional trail of what it absorbed
    const blob = JSON.stringify(
      { ...env.data, member_audit_log: [], members_merged_backup: [], member_merge_log: [] },
      (k, v) => (k === "mergedFromMemberIds" ? undefined : v),
    );
    expect(blob).not.toContain("MBR-ALT-OFF-AITCHISON-MITCHELL");
    expect(blob).not.toContain("MBR-ALT-STAFF-RDC-BROWN-BLAIR");
  });

  it("keeps audit history as recorded and archives what it removed", async () => {
    await runDedupe(env.db, { apply: true });
    expect(env.data.member_audit_log[0].memberId).toBe("MBR-ALT-OFF-AITCHISON-MITCHELL");
    expect(env.data.members_merged_backup.map((m) => m.memberId).sort()).toEqual([
      "MBR-ALT-OFF-AITCHISON-MITCHELL",
      "MBR-ALT-STAFF-RDC-BROWN-BLAIR",
    ]);
    expect(env.data.member_merge_log).toHaveLength(2);
  });

  it("writes the backup before the first write, and writes nothing if it fails", async () => {
    let writesAtBackup = -1;
    await runDedupe(env.db, { apply: true, writeBackup: () => { writesAtBackup = env.writes.length; } });
    expect(writesAtBackup).toBe(0);

    const fresh = fakeDb(seed());
    await expect(
      runDedupe(fresh.db, { apply: true, writeBackup: () => { throw new Error("disk full"); } }),
    ).rejects.toThrow("disk full");
    expect(fresh.writes).toEqual([]);
    expect(fresh.data.members).toHaveLength(5);
  });

  it("backs up the originals of everything it changes", async () => {
    let backup: Record<string, Doc[]> = {};
    await runDedupe(env.db, { apply: true, writeBackup: (b) => { backup = b; } });
    expect(backup.members).toHaveLength(4);
    expect(backup.teamRosters).toHaveLength(2);
    expect(JSON.stringify(backup.teamRosters)).toContain("MBR-ALT-OFF-AITCHISON-MITCHELL");
  });

  it("is safe to run twice", async () => {
    await runDedupe(env.db, { apply: true });
    const after = JSON.stringify(env.data);
    const again = await runDedupe(env.db, { apply: true });
    expect(again.merged).toBe(0);
    expect(JSON.stringify(env.data)).toBe(after);
  });

  it("skips a group where both records have their own login", async () => {
    const s = seed();
    s.users.push({ _id: "u2", memberId: "MBR-ALT-19761", email: "blair2@x.com" });
    const e = fakeDb(s);
    const r = await runDedupe(e.db, { apply: true });
    expect(r.plans.find((p) => p.group.nameKey === "blair|brown")!.blocked).toMatch(/own login/);
    expect(e.data.members.map((m) => m.memberId)).toContain("MBR-ALT-STAFF-RDC-BROWN-BLAIR");
    expect(r.merged).toBe(1); // Mitchell still merged
  });

  it("does not merge people who merely share a name", async () => {
    const s = seed();
    s.members.push(person("MBR-OLD", {}, { dateOfBirth: "1970-01-01" }));
    const e = fakeDb(s);
    await runDedupe(e.db, { apply: true });
    expect(e.data.members.map((m) => m.memberId)).toContain("MBR-OLD");
  });
});

describe("runDedupe — import data with no birthdays (--merge-generated-staff)", () => {
  const noDob = (memberId: string, o: Doc = {}, first = "Blair", last = "Brown"): Doc => ({
    _id: `oid-${memberId}`,
    memberId,
    clubId: "",
    roles: [],
    personalInfo: { firstName: first, lastName: last },
    ...o,
  });
  const data = (): Record<string, Doc[]> => ({
    members: [
      noDob("MBR-ALT-19761", { roles: ["role-player"], clubId: "rdc" }),
      noDob("MBR-ALT-STAFF-RDC-BROWN-BLAIR", { roles: ["role-coach"] }),
      // ambiguous: two player records with the same name
      noDob("MBR-ALT-10515", { roles: ["role-player"] }, "Steven", "Green"),
      noDob("MBR-ALT-16141", { roles: ["role-player"] }, "Steven", "Green"),
    ],
    teams: [{ _id: "t1", coachMemberId: "MBR-ALT-STAFF-RDC-BROWN-BLAIR", playerIds: ["MBR-ALT-19761"] }],
  });

  it("does nothing by default", async () => {
    const e = fakeDb(data());
    const r = await runDedupe(e.db, { apply: true });
    expect(r.merged).toBe(0);
    expect(e.data.members).toHaveLength(4);
  });

  it("merges the coach record into the player, re-points the team, and leaves ambiguous names alone", async () => {
    const e = fakeDb(data());
    const r = await runDedupe(e.db, { apply: true, mergeGeneratedShadows: true });
    expect(r.merged).toBe(1);
    expect(e.data.members.map((m) => m.memberId).sort()).toEqual([
      "MBR-ALT-10515",
      "MBR-ALT-16141",
      "MBR-ALT-19761",
    ]);
    const blair = e.data.members.find((m) => m.memberId === "MBR-ALT-19761")!;
    expect(blair.roles).toEqual(["role-player", "role-coach"]);
    expect(e.data.teams[0].coachMemberId).toBe("MBR-ALT-19761");
    expect(r.review.map((g) => g.nameKey)).toContain("steven|green");
  });

  it("shows club and roles for each record in the plan", async () => {
    const e = fakeDb(data());
    const r = await runDedupe(e.db, { apply: false, mergeGeneratedShadows: true });
    expect(r.plans[0].details["MBR-ALT-19761"]).toEqual({ clubId: "rdc", roles: ["role-player"] });
  });
});
