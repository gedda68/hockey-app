import { describe, it, expect } from "vitest";
import { loadCommitteeReport } from "@/lib/reports/service";
import { writableDb, type Doc } from "../helpers/writableDb";

const t: Record<string, Doc[]> = {
  clubs: [{ clubId: "chc", id: "chc", name: "Chermside", parentAssociationId: "bha" }, { clubId: "oth", id: "oth", name: "Other", parentAssociationId: "zzz" }],
  associations: [{ associationId: "bha" }, { associationId: "zzz" }],
  members: [
    { memberId: "m1", personalInfo: { firstName: "A", lastName: "One", gender: "female", dateOfBirth: "2012-01-01", school: { attends: true, name: "KGSC", district: "North" } } },
    { memberId: "m2", personalInfo: { firstName: "B", lastName: "Two", gender: "male", dateOfBirth: "1990-01-01" } },
    { memberId: "m3", personalInfo: { firstName: "C", lastName: "Three" } },
  ],
  "club-registrations": [
    { memberId: "m1", seasonYear: "2025", clubId: "chc", status: "active", roleIds: ["role-player"], registeredDate: "2025-02-01" },
    { memberId: "m1", seasonYear: "2026", clubId: "chc", status: "active", roleIds: ["role-player"], registeredDate: "2026-02-01" },
    { memberId: "m2", seasonYear: "2026", clubId: "chc", status: "cancelled", roleIds: ["coach"] },
    { memberId: "m2", seasonYear: "2026", clubId: "chc", status: "active", roleIds: ["coach"] },
    { memberId: "m3", seasonYear: "2026", clubId: "oth", status: "active", roleIds: ["role-player"] },
  ],
  "association-registrations": [{ memberId: "m2", seasonYear: "2026", associationId: "bha", status: "active", roleIds: ["umpire"] }],
};

describe("committee report service", () => {
  it("limits a club to its own registrations and skips cancelled ones", async () => {
    const r = await loadCommitteeReport(writableDb(t) as never, { scope: "club", scopeId: "chc" }, "2026");
    expect(r.totals).toMatchObject({ members: 2, players: 1, coaches: 1 });
    expect(r.retention[0]).toMatchObject({ previous: 1, retained: 1, rate: 100 });
    expect(r.school.schools[0]).toMatchObject({ label: "KGSC", count: 1 });
  });
  it("an association covers its clubs and its own registrations", async () => {
    const r = await loadCommitteeReport(writableDb(t) as never, { scope: "association", scopeId: "bha" }, "2026");
    expect(r.totals).toMatchObject({ members: 2, umpires: 1 });
    expect(r.clubs.map((c) => c.clubId)).toEqual(["chc"]);
  });
  it("everything covers everyone", async () => {
    const r = await loadCommitteeReport(writableDb(t) as never, { scope: "global" }, "2026");
    expect(r.totals.members).toBe(3);
  });
});
