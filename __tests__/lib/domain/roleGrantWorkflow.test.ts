import { describe, it, expect } from "vitest";
import { canApproveRoleRequestPrivilege } from "@/lib/domain/roleGrantWorkflow";

describe("canApproveRoleRequestPrivilege", () => {
  it("allows super-admin for any requested role", () => {
    expect(canApproveRoleRequestPrivilege(["super-admin"], "coach")).toBe(true);
  });

  it("allows association-admin bypass", () => {
    expect(canApproveRoleRequestPrivilege(["association-admin"], "coach")).toBe(true);
  });

  it("allows club-admin bypass", () => {
    expect(canApproveRoleRequestPrivilege(["club-admin"], "player")).toBe(true);
  });

  it("allows registrar to approve player (more senior)", () => {
    expect(canApproveRoleRequestPrivilege(["registrar"], "player")).toBe(true);
  });

  it("denies registrar approving coach (less senior)", () => {
    expect(canApproveRoleRequestPrivilege(["registrar"], "coach")).toBe(false);
  });

  it("allows coach to approve manager", () => {
    expect(canApproveRoleRequestPrivilege(["coach"], "manager")).toBe(true);
  });
});
