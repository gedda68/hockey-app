import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ allowed: true, queries: [] as unknown[] }));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({ user: {} })),
  requireResourceAccess: vi.fn(async () =>
    h.allowed ? { user: {} } : { user: {}, response: new Response("{}", { status: 403 }) },
  ),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        find: (q: unknown) => {
          h.queries.push({ name, q });
          return { project: () => ({ toArray: async () => [] }) };
        },
      }),
    }),
  }),
}));

import { GET } from "@/app/api/admin/associations/[associationId]/competition-panel/route";

const call = async (id: string) =>
  (await GET(new Request("http://x/api") as never, { params: Promise.resolve({ associationId: id }) }))!;

describe("competition-panel scope", () => {
  beforeEach(() => { h.allowed = true; h.queries = []; });

  it("refuses an association the user cannot access without touching the db", async () => {
    h.allowed = false;
    expect((await call("bha")).status).toBe(403);
    expect(h.queries).toHaveLength(0);
  });

  it("only queries competitions owned by the requested association", async () => {
    await call("bha");
    expect(h.queries[0]).toMatchObject({
      name: "season_competitions",
      q: { owningAssociationId: "bha" },
    });
  });
});
