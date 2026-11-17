import { afterEach, describe, expect, it, vi } from "vitest";
import { expiredSessionCookieHeaders } from "@/lib/auth/session";

describe("expiredSessionCookieHeaders", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("expires the host-only cookie and the shared-domain cookie", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_COOKIE_DOMAIN", ".example.com");
    const h = expiredSessionCookieHeaders();
    expect(h.some((x) => x.startsWith("session=;") && !/Domain=/.test(x))).toBe(true);
    expect(h.some((x) => /Domain=\.example\.com/.test(x))).toBe(true);
    expect(h.every((x) => /Max-Age=0/.test(x) && /HttpOnly/.test(x))).toBe(true);
  });

  it("uses the __Host- name with no domain in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_COOKIE_DOMAIN", "");
    const h = expiredSessionCookieHeaders();
    expect(h).toHaveLength(1);
    expect(h[0]).toMatch(/^__Host-session=;.*Secure/);
  });
});
