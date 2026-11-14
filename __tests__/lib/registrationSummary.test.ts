import { describe, it, expect } from "vitest";
import { summariseFees, limitForAdmin, type RegistrationSummary } from "@/lib/members/registrationSummary";

const name = (k: string, id: string) => (k === "club" ? "Commercial" : ({ bha: "Brisbane", hq: "Queensland" } as any)[id] ?? id);
const regs: any[] = [
  { registrationId: "r1", season: 2026, levelKind: "club", levelId: "chc", level: "Commercial", category: "junior", status: "active", roles: [], fee: 60,
    fees: [{ name: "a", amount: 20, clubId: "chc" }, { name: "b", amount: 20, associationId: "bha" }, { name: "c", amount: 20, associationId: "hq" }] },
  { registrationId: "r2", season: 2026, levelKind: "association", levelId: "bha", level: "Brisbane", category: "junior", status: "active", roles: [], fee: 20, fees: [{ name: "b", amount: 20, associationId: "bha" }] },
];

describe("summariseFees", () => {
  it("counts the club stack once and subtracts paid per level", () => {
    const f = summariseFees(regs, [{ status: "paid", seasonYear: 2026, lineItems: [{ associationId: "bha", amount: 20 }] }, { status: "pending", seasonYear: 2026, lineItems: [{ clubId: "chc", amount: 20 }] }], name);
    expect(f.total).toEqual({ sent: 60, paid: 20, outstanding: 40 });
    expect(f.bySeason["2026"].byLevel.Brisbane).toMatchObject({ sent: 20, paid: 20, outstanding: 0 });
    expect(f.bySeason["2026"].byLevel.Commercial.outstanding).toBe(20);
  });
});

describe("limitForAdmin", () => {
  const base = { member: {}, levels: [{ kind: "association", id: "bha", name: "Brisbane" }], registrations: regs, fees: summariseFees(regs, [], name), teams: [], nominations: [], stats: null, history: [] } as unknown as RegistrationSummary;
  it("association admins only see their own level's fees", () => {
    const r = limitForAdmin(base, { role: "association-admin", associationId: "bha" });
    expect(r.registrations.map((x) => x.levelId)).toEqual(["bha"]);
    expect(r.fees.total.sent).toBe(20);
  });
  it("club admins see the whole stack", () => {
    expect(limitForAdmin(base, { role: "club-admin", associationId: "bha" }).fees.total.sent).toBe(60);
  });
  it("summary shape carries no contact / medical / address / login fields", () => {
    const keys = JSON.stringify(Object.keys(base)).toLowerCase();
    for (const bad of ["contact", "address", "medical", "emergency", "bluecard", "auth", "email", "phone"]) expect(keys).not.toContain(bad);
  });
});
