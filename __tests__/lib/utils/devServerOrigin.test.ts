// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  alignLocalHostPort,
  alignLocalOriginPort,
  localDevHost,
  localDevOrigin,
} from "@/lib/utils/devServerOrigin";
import { getPortalRootDomain } from "@/lib/tenant/portalHost";
import { buildTenantOrigin, clubPortalPageUrl } from "@/lib/tenant/subdomainUrls";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("devServerOrigin (server side)", () => {
  it("uses the port next dev bound (process.env.PORT)", () => {
    vi.stubEnv("PORT", "3001");
    expect(localDevHost()).toBe("localhost:3001");
    expect(localDevOrigin()).toBe("http://localhost:3001");
  });

  it("falls back to 3000 when PORT is unset", () => {
    vi.stubEnv("PORT", "");
    expect(localDevHost()).toBe("localhost:3000");
  });

  it("aligns configured localhost values to the running port in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "3001");
    expect(alignLocalHostPort("localhost:3000")).toBe("localhost:3001");
    expect(alignLocalHostPort("bha.localhost:3000")).toBe("bha.localhost:3001");
    expect(alignLocalOriginPort("http://localhost:3000")).toBe("http://localhost:3001");
    expect(alignLocalOriginPort("http://localhost:3000/")).toBe("http://localhost:3001/");
    expect(alignLocalOriginPort("https://sportsolutions.com.au")).toBe("https://sportsolutions.com.au");
  });

  it("leaves values alone outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PORT", "3001");
    expect(alignLocalHostPort("localhost:3000")).toBe("localhost:3000");
  });

  it("club portal links follow the dev port", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "3001");
    vi.stubEnv("NEXT_PUBLIC_PORTAL_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_PORTAL_PROTOCOL", "");
    expect(getPortalRootDomain()).toBe("localhost:3001");
    expect(buildTenantOrigin("chc")).toBe("http://chc.localhost:3001");
    expect(clubPortalPageUrl({ slug: "commercial-hockey", portalSlug: "chc" } as never)).toBe(
      "http://chc.localhost:3001/clubs/commercial-hockey",
    );
  });

  it("a localhost root domain in .env is aligned too", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "3001");
    vi.stubEnv("NEXT_PUBLIC_PORTAL_ROOT_DOMAIN", "localhost:3000");
    expect(getPortalRootDomain()).toBe("localhost:3001");
  });
});
