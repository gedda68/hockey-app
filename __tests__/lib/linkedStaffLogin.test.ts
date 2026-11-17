import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  users: { findOne: vi.fn(), updateOne: vi.fn(async () => ({})) },
  members: { findOne: vi.fn(), updateOne: vi.fn(async () => ({})) },
}));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<object>()), getSession: vi.fn(async () => h.session), deleteSession: vi.fn(async () => {}) }));
vi.mock("@/lib/mongodb", () => ({ getDatabase: async () => ({ collection: (n: string) => (n === "users" ? h.users : h.members) }) }));
vi.mock("@/lib/auth/username", () => ({ verifyPassword: vi.fn(async () => true), hashPassword: vi.fn(async () => "member-hash") }));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn(async () => true), hash: vi.fn(async () => "user-hash") } }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/change-password/route";
import { refreshStaleSession } from "@/lib/auth/sessionFreshness";

const body = { currentPassword: "old-password", newPassword: "new-password-1", confirmPassword: "new-password-1" };
const call = () => POST(new NextRequest("http://x/api/auth/change-password", { method: "POST", body: JSON.stringify(body) }));
const OID = "64b0c0ffee64b0c0ffee64b0";

beforeEach(() => {
  vi.clearAllMocks();
  h.users.findOne.mockResolvedValue({ _id: "u1", passwordHash: "user-old" });
  h.members.findOne.mockResolvedValue({ auth: { passwordHash: "member-old" } });
});

describe("change password for a staff login linked to a member", () => {
  it("changes the staff account's password, never the member's", async () => {
    h.session = { userId: "U1", memberId: OID, staffUser: true, role: "club-admin" };
    const res = await call();
    expect(res.status).toBe(200);
    expect(h.users.updateOne).toHaveBeenCalled();
    expect(h.members.updateOne).not.toHaveBeenCalled();
  });
  it("still changes the member's password for a member login", async () => {
    h.session = { userId: OID, memberId: OID, role: "player" };
    const res = await call();
    expect(res.status).toBe(200);
    expect(h.members.updateOne).toHaveBeenCalled();
    expect(h.users.updateOne).not.toHaveBeenCalled();
  });
});

describe("session freshness", () => {
  it("leaves a linked staff login's roles alone", async () => {
    const db = { collection: () => ({ findOne: vi.fn(async () => { throw new Error("should not look the member up"); }) }) } as never;
    const session = { userId: "U1", memberId: OID, staffUser: true, role: "club-admin", roleVersion: 0 } as never;
    expect(await refreshStaleSession(db, session)).toEqual({ session, changed: false });
  });
});
