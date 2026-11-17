import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("@/lib/mongodb", () => ({ getDatabase: vi.fn(), default: Promise.resolve({}) }));
vi.mock("@/lib/auth/session", () => ({ createSession: vi.fn(), getSession: vi.fn() }));
const persona = vi.hoisted(() => ({
  options: [] as { key: string; scopeType: string }[],
  switched: null as string | null,
}));
vi.mock("@/lib/auth/sessionPersona", () => ({
  PERSONAL_PERSONA_KEY: "member::global::",
  buildPersonaOptions: vi.fn(async () => persona.options),
  sessionWithPersona: vi.fn(async (_db: unknown, s: Record<string, unknown>, key: string) => {
    persona.switched = key;
    return { ...s, role: key.split("::")[0], clubId: key.split("::")[2] || null };
  }),
}));

import { isPersonaStillHeld, refreshStaleSession } from "@/lib/auth/sessionFreshness";
import type { SessionData } from "@/lib/auth/session";

const mid = new ObjectId().toString();
const baseSession = (o: Partial<SessionData> = {}): SessionData =>
  ({ userId: mid, memberId: mid, email: "a@b.c", name: "A B", role: "registrar", clubId: "club-1", associationId: null, roleVersion: 0, ...o }) as SessionData;

const dbWith = (member: Record<string, unknown> | null) =>
  ({ collection: () => ({ findOne: async () => member }) }) as never;

describe("isPersonaStillHeld", () => {
  it("is true while the role in the same organisation is held", () => {
    expect(isPersonaStillHeld({ role: "registrar", clubId: "c1", associationId: null }, [{ role: "registrar", scopeType: "club", scopeId: "c1" }])).toBe(true);
  });
  it("is false once it is gone, or only held at another club", () => {
    expect(isPersonaStillHeld({ role: "registrar", clubId: "c1", associationId: null }, [])).toBe(false);
    expect(isPersonaStillHeld({ role: "registrar", clubId: "c1", associationId: null }, [{ role: "registrar", scopeType: "club", scopeId: "c2" }])).toBe(false);
  });
  it("never downgrades super-admin, the personal view, or the person's default role", () => {
    expect(isPersonaStillHeld({ role: "super-admin", clubId: null, associationId: null }, [])).toBe(true);
    expect(isPersonaStillHeld({ role: "member", clubId: null, associationId: null }, [])).toBe(true);
    expect(isPersonaStillHeld({ role: "club-admin", clubId: "c1", associationId: null }, [], ["club-admin"])).toBe(true);
  });
  it("checks association scope for association roles", () => {
    expect(isPersonaStillHeld({ role: "assoc-registrar", clubId: null, associationId: "a1" }, [{ role: "assoc-registrar", scopeType: "association", scopeId: "a1" }])).toBe(true);
    expect(isPersonaStillHeld({ role: "assoc-registrar", clubId: null, associationId: "a1" }, [{ role: "assoc-registrar", scopeType: "association", scopeId: "a2" }])).toBe(false);
  });
});

describe("refreshStaleSession", () => {
  beforeEach(() => {
    persona.options = [];
    persona.switched = null;
  });

  it("does nothing when the versions match", async () => {
    const r = await refreshStaleSession(dbWith({ roleVersion: 0, roles: [] }), baseSession(), 1_000_000);
    expect(r.changed).toBe(false);
  });

  it("keeps the session (and records the new version) when the role is still held", async () => {
    const member = { roleVersion: 2, roles: [{ role: "registrar", scopeType: "club", scopeId: "club-1" }], clubId: "club-1" };
    const r = await refreshStaleSession(dbWith(member), baseSession({ memberId: new ObjectId().toString() }), 2_000_000);
    expect(r.changed).toBe(true);
    expect(r.session.role).toBe("registrar");
    expect(r.session.roleVersion).toBe(2);
  });

  it("moves to the personal view when the only role has ended", async () => {
    const m = new ObjectId().toString();
    persona.options = [{ key: "member::global::", scopeType: "global" }];
    const r = await refreshStaleSession(dbWith({ roleVersion: 3, roles: [], roleHoldings: [], clubId: "club-1" }), baseSession({ memberId: m }), 3_000_000);
    expect(r.changed).toBe(true);
    expect(persona.switched).toBe("member::global::");
    expect(r.session.role).toBe("member");
    expect(r.session.roleVersion).toBe(3);
  });

  it("moves to another organisation when one remains", async () => {
    const m = new ObjectId().toString();
    persona.options = [{ key: "coach::club::club-2", scopeType: "club" }, { key: "member::global::", scopeType: "global" }];
    const r = await refreshStaleSession(dbWith({ roleVersion: 1, roles: [{ role: "coach", scopeType: "club", scopeId: "club-2" }], clubId: "club-2" }), baseSession({ memberId: m }), 4_000_000);
    expect(persona.switched).toBe("coach::club::club-2");
    expect(r.session.role).toBe("coach");
  });

  it("leaves super-admin and sessions without a member alone", async () => {
    expect((await refreshStaleSession(dbWith({ roleVersion: 9 }), baseSession({ role: "super-admin" }), 5_000_000)).changed).toBe(false);
    expect((await refreshStaleSession(dbWith({ roleVersion: 9 }), baseSession({ memberId: null }), 5_000_000)).changed).toBe(false);
  });
});
