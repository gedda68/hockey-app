import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import PlayerProfileRedirect from "@/app/(admin)/admin/players/[playerId]/page";

describe("/admin/players/[playerId]", () => {
  it("redirects to the member profile", async () => {
    await expect(
      PlayerProfileRedirect({ params: Promise.resolve({ playerId: "MBR-ALT-11226" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/members/MBR-ALT-11226");
  });

  it("encodes ids that contain special characters", async () => {
    await expect(
      PlayerProfileRedirect({ params: Promise.resolve({ playerId: "MBR/ALT 1" }) }),
    ).rejects.toThrow("/admin/members/MBR%2FALT%201");
  });
});
