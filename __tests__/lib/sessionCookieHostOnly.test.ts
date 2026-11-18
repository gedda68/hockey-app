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

  it("stays host-only even when SESSION_COOKIE_DOMAIN is configured (it would sit beside the login cookie)", async () => {
    vi.stubEnv("SESSION_COOKIE_DOMAIN", ".localhost");
    const { options } = await createSessionCookieParts(data);
    expect(options.domain).toBeUndefined();
  });
});

import { NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/auth/session";

describe("attachSessionCookie", () => {
  it("sends exactly one session Set-Cookie (an extra same-name expiry would replace it and sign the person out)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_COOKIE_DOMAIN", "");
    const res = NextResponse.json({ ok: true });
    await attachSessionCookie(res, data);
    const set = res.headers.getSetCookie().filter((c) => c.startsWith("session="));
    expect(set).toHaveLength(1);
    expect(set[0]).not.toMatch(/Max-Age=0/);
    vi.unstubAllEnvs();
  });
});
