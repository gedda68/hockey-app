import { describe, expect, it } from "vitest";
import { logoutDestination, type LogoutDestinationInput } from "@/lib/auth/logoutDestination";

const tenantOrigin = (slug: string) => `http://${slug}.localhost:3001`;
const base = (o: Partial<LogoutDestinationInput>): LogoutDestinationInput => ({
  target: "home",
  hostHeader: "localhost:3001",
  tenantOrigin,
  ...o,
});

describe("logoutDestination", () => {
  it("stays on a club/association host", () => {
    expect(logoutDestination(base({ hostHeader: "chc.localhost:3001" }))).toBe("/");
    expect(logoutDestination(base({ hostHeader: "chc.localhost:3001", target: "login" }))).toBe("/login");
    expect(logoutDestination(base({ hostHeader: "chc.localhost:3001", target: "login", reason: "idle" }))).toBe("/login?reason=idle");
  });

  it("goes back to the club host the session belongs to when on the base host", () => {
    expect(logoutDestination(base({ session: { portalSubdomain: "chc" } }))).toBe("http://chc.localhost:3001/");
    expect(logoutDestination(base({ session: { portalSubdomain: "chc" }, target: "login" }))).toBe("http://chc.localhost:3001/login");
  });

  it("keeps a dev ?portal= token", () => {
    expect(logoutDestination(base({ search: "?portal=chc" }))).toBe("/?portal=chc");
    expect(logoutDestination(base({ search: "?portal=chc", target: "login" }))).toBe("/login?portal=chc");
  });

  it("returns to the public club or association page the person was on", () => {
    expect(logoutDestination(base({ pathname: "/clubs/chc/members" }))).toBe("/clubs/chc");
    expect(logoutDestination(base({ pathname: "/associations/bha/venues" }))).toBe("/associations/bha");
  });

  it("falls back to the person's club or association, then the base site", () => {
    expect(logoutDestination(base({ session: { clubSlug: "chc" } }))).toBe("/clubs/chc");
    expect(logoutDestination(base({ session: { associationId: "bha" } }))).toBe("/associations/bha");
    expect(logoutDestination(base({}))).toBe("/");
    expect(logoutDestination(base({ target: "login" }))).toBe("/login");
  });

  it("never builds an unsafe destination", () => {
    expect(logoutDestination(base({ session: { clubSlug: "../evil" } }))).toBe("/");
    expect(logoutDestination(base({ session: { portalSubdomain: "evil.com/x" } }))).toBe("/");
    expect(logoutDestination(base({ pathname: "/clubs/%2e%2e/x" }))).toBe("/");
    expect(logoutDestination(base({ target: "login", reason: "x&y=z" }))).toBe("/login");
  });
});
