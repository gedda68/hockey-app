import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: { memberId: "mum", name: "Mum" } as { memberId?: string; name: string } | null,
  req: null as Record<string, any> | null,
  update: vi.fn(async () => ({})),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({ db: () => ({ collection: () => ({ findOne: async () => h.req, updateOne: h.update }) }) }),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/role-requests/[requestId]/guardian/route";

const call = (action: string) =>
  POST(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ action }), headers: { "content-type": "application/json" } }), {
    params: Promise.resolve({ requestId: "r1" }),
  });
const pending = (o: Record<string, unknown> = {}) => ({ requestId: "r1", status: "awaiting_approval", guardianApproval: { status: "pending", guardianIds: ["mum"] }, ...o });

describe("guardian decision on a role request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.session = { memberId: "mum", name: "Mum" };
    h.req = pending();
  });

  it("needs sign-in", async () => {
    h.session = null;
    expect((await call("approve")).status).toBe(401);
  });

  it("only the child's guardians may decide", async () => {
    h.session = { memberId: "stranger", name: "S" };
    expect((await call("approve")).status).toBe(403);
    expect(h.update).not.toHaveBeenCalled();
  });

  it("approving records the decision and leaves the request open for the administrator", async () => {
    const res = await call("approve");
    expect(res.status).toBe(200);
    const set = (h.update.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }])[1].$set;
    expect(set["guardianApproval.status"]).toBe("approved");
    expect(set.status).toBeUndefined();
  });

  it("refusing closes the request", async () => {
    await call("refuse");
    const set = (h.update.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }])[1].$set;
    expect(set["guardianApproval.status"]).toBe("refused");
    expect(set.status).toBe("rejected");
  });

  it("cannot decide twice or on a closed request", async () => {
    h.req = pending({ guardianApproval: { status: "approved", guardianIds: ["mum"] } });
    expect((await call("approve")).status).toBe(409);
    h.req = pending({ status: "approved" });
    expect((await call("approve")).status).toBe(409);
  });

  it("rejects an unknown action", async () => {
    expect((await call("maybe")).status).toBe(400);
  });
});
