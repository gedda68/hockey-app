import { describe, expect, it } from "vitest";
import { runDedupe, type CollectionLike, type DbLike } from "@/lib/members/dedupeRunner";
import { runNormalize } from "@/lib/members/normalizeRunner";
import { modernizeMember, rewriteLegacyIdStrings } from "@/lib/members/modernize";
import type { Doc } from "@/lib/members/dedupe";

function fakeDb(seed: Record<string, Doc[]>) {
  const data: Record<string, Doc[]> = JSON.parse(JSON.stringify(seed));
  const writes: string[] = [];
  const col = (name: string): CollectionLike => {
    const rows = () => (data[name] ??= []);
    const match = (d: Doc, f: Doc) => Object.entries(f).every(([k, v]) => d[k] === v);
    return {
      find: (f: Doc) => {
        const out = rows().filter((d) => match(d, f)).map((d) => JSON.parse(JSON.stringify(d)));
        return Object.assign({ toArray: async () => out }, { [Symbol.asyncIterator]: async function* () { for (const d of out) yield d; } }) as never;
      },
      findOne: async (f) => { const d = rows().find((x) => match(x, f)); return d ? JSON.parse(JSON.stringify(d)) : null; },
      replaceOne: async (f, doc) => { writes.push(`replace:${name}`); const i = rows().findIndex((x) => match(x, f)); if (i >= 0) rows()[i] = JSON.parse(JSON.stringify(doc)); },
      insertOne: async (doc) => { writes.push(`insert:${name}`); rows().push(JSON.parse(JSON.stringify(doc))); },
      deleteOne: async (f) => { writes.push(`delete:${name}`); const i = rows().findIndex((x) => match(x, f)); if (i >= 0) rows().splice(i, 1); },
    };
  };
  const db: DbLike = { listCollections: () => ({ toArray: async () => Object.keys(data).map((name) => ({ name })) }), collection: col };
  return { db, data, writes };
}

// Shaped like the real import: no birthdays, an `altius` field, generated shadow ids.
const mitchellPlayer = (): Doc => ({
  _id: "o1", memberId: "MBR-ALT-11226", clubId: "club-c",
  altius: { playerId: "11226", playerIds: ["11226", "13642", "18733"], name: "AITCHISON Mitchell", appearances: 21, sourceUrls: ["https://x.altius.live/players/11226"] },
  createdBy: "altius-seed-2026", updatedBy: "altius-seed-2026",
  notes: "Imported from Altius (hockeybrisbane.altius.live). Contact details not available — complete before use.",
  personalInfo: { firstName: "Mitchell", lastName: "Aitchison", dateOfBirth: "" },
  playerInfo: { jerseyNumber: "23" },
  roles: ["role-junior-player"], membership: { status: "Active" },
  associationRegistrations: [{ registrationId: "AREG-ALT-bha-MBR-ALT-11226-2026", associationId: "bha" }],
  clubRegistrations: [{ registrationId: "CREG-ALT-club-c-MBR-ALT-11226-2026", clubId: "club-c" }],
});
const mitchellOfficial = (): Doc => ({
  _id: "o2", memberId: "MBR-ALT-OFF-AITCHISON-MITCHELL", clubId: null,
  altius: { officialName: "AITCHISON Mitchell", officialRoles: ["Umpire", "Reserve Umpire"], matchOfficialIds: ["699"] },
  createdBy: "altius-seed-2026",
  personalInfo: { firstName: "Mitchell", lastName: "Aitchison", dateOfBirth: "" },
  roles: ["role-umpire"], membership: { status: "Active" },
});
const gedStaff = (): Doc => ({
  _id: "o3", memberId: "MBR-ALT-STAFF-CHC-AITCHISON-GED", clubId: null,
  altius: { staffName: "Ged Aitchison", teams: ["Commercial BHL 2"] },
  personalInfo: { firstName: "Ged", lastName: "Aitchison", dateOfBirth: "" }, roles: ["role-coach"],
});

const seed = (): Record<string, Doc[]> => ({
  members: [mitchellPlayer(), mitchellOfficial(), gedStaff()],
  league_fixtures: [{ _id: "f1", umpires: [{ umpireType: "umpire", umpireId: "MBR-ALT-OFF-AITCHISON-MITCHELL" }] }],
  fixture_lineups: [{ _id: "l1", players: [{ memberId: "MBR-ALT-11226", shirtNumber: 23 }] }],
  platform_audit_log: [{ _id: "a1", resourceId: "MBR-ALT-11226" }],
});

describe("Mitchell Aitchison: merge, then normalise", () => {
  it("ends with one member MBR_11226 holding both roles, no altius anywhere on it", async () => {
    const { db, data } = fakeDb(seed());
    const merge = await runDedupe(db, { apply: true, mergeGeneratedShadows: true });
    expect(merge.merged).toBe(1);
    expect(data.members.map((m) => m.memberId).sort()).toEqual(["MBR-ALT-11226", "MBR-ALT-STAFF-CHC-AITCHISON-GED"]);

    await runNormalize(db, { apply: true });
    const ids = data.members.map((m) => m.memberId).sort();
    expect(ids).toEqual(["MBR_11226", "MBR_STAFF-CHC-AITCHISON-GED"]);

    const m = data.members.find((x) => x.memberId === "MBR_11226")!;
    expect(m.roles).toEqual(expect.arrayContaining(["role-junior-player", "role-umpire"]));
    expect(m).not.toHaveProperty("altius");
    expect(JSON.stringify(m)).not.toMatch(/altius|MBR-ALT|AREG-ALT|CREG-ALT/i);
    expect((m.playerInfo as Doc).appearances).toBe(21);
    expect((m.officiating as Doc).roles).toEqual(["Umpire", "Reserve Umpire"]);
    expect((m.officiating as Doc).matchOfficialIds).toEqual(["699"]);
    expect(m.previousMemberIds).toEqual(["MBR_13642", "MBR_18733"]);
    expect(m.mergedFromMemberIds).toEqual(["MBR_OFF-AITCHISON-MITCHELL"]);
    expect(m.createdBy).toBe("import-2026");
    expect(m.notes).toBe("Imported from the previous system. Contact details not available — complete before use.");
    expect((m.associationRegistrations as Doc[])[0].registrationId).toBe("AREG-bha-MBR_11226-2026");
  });

  it("re-points references (umpire on a fixture, lineup) and leaves audit history as recorded", async () => {
    const { db, data } = fakeDb(seed());
    await runDedupe(db, { apply: true, mergeGeneratedShadows: true });
    await runNormalize(db, { apply: true });
    expect(data.league_fixtures[0].umpires).toEqual([{ umpireType: "umpire", umpireId: "MBR_11226" }]);
    expect((data.fixture_lineups[0].players as Doc[])[0].memberId).toBe("MBR_11226");
    expect(data.platform_audit_log[0].resourceId).toBe("MBR-ALT-11226");
  });

  it("keeps Ged (a different person) separate and moves his team list off altius", async () => {
    const { db, data } = fakeDb(seed());
    await runNormalize(db, { apply: true });
    const ged = data.members.find((x) => x.memberId === "MBR_STAFF-CHC-AITCHISON-GED")!;
    expect(ged).not.toHaveProperty("altius");
    expect((ged.staffInfo as Doc).teams).toEqual(["Commercial BHL 2"]);
  });
});

describe("runNormalize safety", () => {
  it("dry run writes nothing but reports the renames", async () => {
    const { db, writes } = fakeDb(seed());
    const r = await runNormalize(db, { apply: false });
    expect(writes).toEqual([]);
    expect(r.renames.map((x) => x.to)).toContain("MBR_11226");
  });

  it("writes the backup before the first write", async () => {
    const { db, writes } = fakeDb(seed());
    let at = -1;
    await runNormalize(db, { apply: true, writeBackup: () => { at = writes.length; } });
    expect(at).toBe(0);
  });

  it("skips a rename when the new id already belongs to a member, and keeps references to it", async () => {
    const { db, data } = fakeDb({
      members: [
        { _id: "a", memberId: "MBR-ALT-5", roles: [], personalInfo: { firstName: "A", lastName: "A" } },
        { _id: "b", memberId: "MBR_5", roles: [], personalInfo: { firstName: "B", lastName: "B" } },
      ],
      teamRosters: [{ _id: "r", memberIds: ["MBR-ALT-5"] }],
    });
    const r = await runNormalize(db, { apply: true });
    expect(r.collisions).toEqual([{ from: "MBR-ALT-5", to: "MBR_5" }]);
    expect(data.members.map((m) => m.memberId).sort()).toEqual(["MBR-ALT-5", "MBR_5"]);
    expect(data.teamRosters[0].memberIds).toEqual(["MBR-ALT-5"]);
  });

  it("is idempotent: a second run changes nothing", async () => {
    const { db } = fakeDb(seed());
    await runNormalize(db, { apply: true });
    const again = await runNormalize(db, { apply: true });
    expect(again.changed).toBe(0);
  });
});

describe("modernize helpers", () => {
  it("does not corrupt class instances such as ObjectId", () => {
    class FakeObjectId { constructor(public hex: string) {} }
    const oid = new FakeObjectId("abc");
    const { value } = rewriteLegacyIdStrings({ ref: oid, id: "MBR-ALT-1" }) as { value: { ref: unknown; id: string } };
    expect(value.ref).toBe(oid);
    expect(value.id).toBe("MBR_1");
  });
  it("modernizeMember is a no-op on an already-modern member", () => {
    const doc: Doc = { memberId: "MBR_1", roles: ["role-player"], personalInfo: { firstName: "A" } };
    expect(modernizeMember(doc)).toEqual(doc);
  });
});
