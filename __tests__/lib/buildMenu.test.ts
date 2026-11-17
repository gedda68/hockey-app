import { describe, expect, it } from "vitest";
import { buildMenuForUser } from "@/lib/admin/buildMenu";

const user = (over: Record<string, unknown> = {}) => ({
  userId: "u", username: "u", email: "u@x.com", firstName: "U", lastName: "Ser", role: "member",
  scopedRoles: [], clubId: "c1", clubSlug: "chc", associationId: null, ...over,
}) as any;
const hrefs = (u: any) => buildMenuForUser(u).map((i) => i.href);

describe("buildMenuForUser (shared by the sidebar and dashboard tiles)", () => {
  it("hides the family pages from someone with no children, and shows them to a parent", () => {
    expect(hrefs(user({ family: { hasChildren: false } }))).not.toContain("/admin/my-children");
    expect(hrefs(user({ family: { hasChildren: false } }))).not.toContain("/admin/guardian-approvals");
    expect(hrefs(user({ family: { hasChildren: true } }))).toContain("/admin/my-children");
  });

  it("leaves the family pages visible when it isn't known yet", () => {
    expect(hrefs(user())).toContain("/admin/my-children");
  });

  it("does not offer a plain member the administrator pages", () => {
    const h = hrefs(user({ family: { hasChildren: false } }));
    expect(h).not.toContain("/admin/club-health");
    expect(h).not.toContain("/admin/announcements");
    expect(h).toContain("/admin/nominate");
  });
});
