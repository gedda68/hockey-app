import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionCookieParts } from "@/lib/auth/session";

const data = { userId: "u", email: "a@b.c", name: "A B", role: "umpire", portalSubdomain: "chc" } as any;

describe("session cookie scope", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is host-only in development even for a tenant session, matching login", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_COOKIE_DOMAIN", "");
    const { options } = await createSessionCookieParts(data);
    expect(options.domain).toBeUndefined();
  });

  it("uses the configured domain when one is set", async () => {
    vi.stubEnv("SESSION_COOKIE_DOMAIN", ".example.com");
    const { options } = await createSessionCookieParts(data);
    expect(options.domain).toBe(".example.com");
  });
});
