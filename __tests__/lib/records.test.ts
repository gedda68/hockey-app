import { describe, expect, it } from "vitest";
import { atLeast, legacyLevel, levelFromCode, recordLevel } from "@/lib/records/access";
import { cleanAttendance, cleanIncident, cleanIncidentUpdate, cleanInjury, cleanInjuryUpdate, cleanTraining } from "@/lib/records/validate";

describe("record levels", () => {
  it("maps matrix codes to levels", () => {
    expect(["-", "V", "O", "R", "E", "A"].map((c) => levelFromCode(c as never))).toEqual(["none", "none", "own", "read", "edit", "admin"]);
  });
  it("orders levels", () => {
    expect(atLeast("edit", "read")).toBe(true);
    expect(atLeast("own", "read")).toBe(false);
    expect(atLeast("admin", "admin")).toBe(true);
  });
  it("is narrow for legacy logins", () => {
    expect(legacyLevel("injuries", "coach")).toBe("edit");
    expect(legacyLevel("injuries", "club-committee")).toBe("own");
    expect(legacyLevel("incidents", "club-committee")).toBe("edit");
    expect(legacyLevel("incidents", "player")).toBe("own");
    expect(legacyLevel("training", "club-admin")).toBe("admin");
    expect(recordLevel(null, "member", "injuries")).toEqual({ level: "own", enforced: false });
  });
});

describe("training validation", () => {
  it("needs a title and start", () => {
    expect(cleanTraining({ startAt: "2026-05-01T10:00" }).ok).toBe(false);
    expect(cleanTraining({ title: "Skills" }).ok).toBe(false);
    expect(cleanTraining({ title: "Skills", startAt: "2026-05-01T10:00" }).ok).toBe(true);
  });
  it("rejects an end before the start", () => {
    expect(cleanTraining({ title: "x", startAt: "2026-05-01T10:00:00Z", endAt: "2026-05-01T09:00:00Z" }).ok).toBe(false);
  });
  it("allows partial updates", () => {
    const r = cleanTraining({ status: "completed" }, true);
    expect(r).toEqual({ ok: true, value: { status: "completed" } });
  });
  it("keeps one known attendance row per team member", () => {
    const rows = cleanAttendance(
      [{ memberId: "a", status: "present" }, { memberId: "a", status: "absent" }, { memberId: "b", status: "bogus" }, { memberId: "z", status: "late" }, { memberId: "c", status: "excused", note: " flu " }],
      new Set(["a", "b", "c"]),
    );
    expect(rows).toEqual([{ memberId: "a", status: "present" }, { memberId: "c", status: "excused", note: "flu" }]);
  });
});

describe("injury validation", () => {
  const ok = { memberId: "MBR-1", occurredAt: "2026-01-01T10:00:00Z", bodyPart: "Knee" };
  it("requires person, date and body part", () => {
    expect(cleanInjury(ok).ok).toBe(true);
    expect(cleanInjury({ ...ok, memberId: "" }).ok).toBe(false);
    expect(cleanInjury({ ...ok, bodyPart: " " }).ok).toBe(false);
  });
  it("rejects future dates and bad return dates", () => {
    expect(cleanInjury({ ...ok, occurredAt: new Date(Date.now() + 5 * 86400000).toISOString() }).ok).toBe(false);
    expect(cleanInjury({ ...ok, expectedReturn: "soon" }).ok).toBe(false);
  });
  it("defaults severity", () => {
    const r = cleanInjury({ ...ok, severity: "weird" });
    expect(r.ok && r.value.severity).toBe("minor");
  });
  it("updates need something to change", () => {
    expect(cleanInjuryUpdate({}).ok).toBe(false);
    expect(cleanInjuryUpdate({ status: "cleared" }).ok).toBe(true);
    expect(cleanInjuryUpdate({ status: "nope" }).ok).toBe(false);
  });
});

describe("incident validation", () => {
  const ok = { occurredAt: "2026-01-01T10:00:00Z", category: "injury", description: "Fell" };
  it("requires date, category and description", () => {
    expect(cleanIncident(ok).ok).toBe(true);
    expect(cleanIncident({ ...ok, category: "x" }).ok).toBe(false);
    expect(cleanIncident({ ...ok, description: "" }).ok).toBe(false);
  });
  it("forces conduct and child-safety reports to be confidential", () => {
    const a = cleanIncident({ ...ok, category: "child-safety", confidential: false });
    const b = cleanIncident({ ...ok, category: "injury" });
    const c = cleanIncident({ ...ok, category: "injury", confidential: true });
    expect(a.ok && a.value.confidential).toBe(true);
    expect(b.ok && b.value.confidential).toBe(false);
    expect(c.ok && c.value.confidential).toBe(true);
  });
  it("cleans people involved", () => {
    const r = cleanIncident({ ...ok, peopleInvolved: [{ name: " Sam ", role: "coach" }, { name: "" }] });
    expect(r.ok && r.value.peopleInvolved).toEqual([{ name: "Sam", role: "coach" }]);
  });
  it("updates need a status or note", () => {
    expect(cleanIncidentUpdate({}).ok).toBe(false);
    expect(cleanIncidentUpdate({ note: "called parents" }).ok).toBe(true);
  });
});
